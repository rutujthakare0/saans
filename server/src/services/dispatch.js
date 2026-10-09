import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from '../config.js';

let ses;
let sesSender;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const bullet = '\u00b7';
const timeText = date => `${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))} IST`;
const hindi = {
  cancelHeadline: '\u0906\u091c \u092c\u093e\u0939\u0930\u0940 \u0917\u0924\u093f\u0935\u093f\u0927\u093f\u092f\u093e\u0901 \u0930\u0926\u094d\u0926 \u0939\u0948\u0902',
  limitHeadline: '\u0906\u091c \u092c\u093e\u0939\u0930\u0940 \u0917\u0924\u093f\u0935\u093f\u0927\u093f\u092f\u093e\u0901 \u0938\u0940\u092e\u093f\u0924 \u0939\u0948\u0902',
  cancelWindow: '\u0906\u091c \u092c\u093e\u0939\u0930 \u0915\u093e \u0938\u092e\u092f \u0928\u0939\u0940\u0902 \u0939\u094b\u0917\u093e\u0964',
  limitWindow: (start, end) => `\u0916\u0941\u0932\u0947 \u092e\u0947\u0902 \u0917\u0924\u093f\u0935\u093f\u0927\u093f \u0915\u0947\u0935\u0932 ${start} \u0938\u0947 ${end} \u0915\u0947 \u092c\u0940\u091a \u0930\u0916\u0947\u0902\u0964`,
  noWindow: '\u0906\u091c \u0915\u094b\u0908 \u0909\u092a\u092f\u0941\u0915\u094d\u0924 \u092c\u093e\u0939\u0930\u0940 \u0938\u092e\u092f \u0928\u0939\u0940\u0902 \u0939\u0948\u0964',
  why: (category, aqi) => `\u0938\u094d\u0915\u0942\u0932 \u0938\u092e\u092f \u092e\u0947\u0902 \u0905\u0928\u0941\u092e\u093e\u0928\u093f\u0924 \u0935\u093e\u092f\u0941 \u0917\u0941\u0923\u0935\u0924\u094d\u0924\u093e: ${category} (AQI ~${aqi})\u0964 \u092f\u0939 \u092e\u0949\u0921\u0932 \u0906\u0927\u093e\u0930\u093f\u0924 \u0905\u0928\u0941\u092e\u093e\u0928 \u0939\u0948, \u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u0938\u0932\u093e\u0939 \u0928\u0939\u0940\u0902\u0964`,
  sent: '\u092d\u0947\u091c\u093e \u0917\u092f\u093e'
};

export function isThrottlingError(error) {
  return /throttl|maximum sending rate|too many requests|rate exceeded/i.test(`${error?.name || ''} ${error?.message || ''} ${error?.Code || ''}`);
}

export function createSerialSender(send, intervalMs = 1100, sleepFn = delay) {
  let queue = Promise.resolve(), nextSendAt = 0;
  return payload => {
    const task = queue.then(async () => {
      let attempts = 0;
      while (true) {
        await sleepFn(Math.max(0, nextSendAt - Date.now()));
        try {
          const result = await send(payload);
          nextSendAt = Date.now() + Math.max(0, intervalMs);
          return result;
        } catch (error) {
          nextSendAt = Date.now() + Math.max(0, intervalMs);
          if (!isThrottlingError(error) || attempts >= 1) throw error;
          attempts += 1;
        }
      }
    });
    queue = task.catch(() => {});
    return task;
  };
}

async function sendThroughSES({ to, subject, text, html }) {
  if (!config.sesSender) throw new Error('SES_SENDER is not configured.');
  ses ||= new SESv2Client({ region: config.sesRegion });
  const command = new SendEmailCommand({
    FromEmailAddress: config.sesSender,
    Destination: { ToAddresses: [to] },
    Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' }, Html: { Data: html, Charset: 'UTF-8' } } } }
  });
  sesSender ||= createSerialSender(payload => ses.send(payload), Math.max(1000, config.sesSendDelayMs));
  return sesSender(command);
}

async function deliver({ to, subject, text, html }) {
  if (config.notifyProvider !== 'ses') return { status: 'preview', error: null, sentAt: null };
  try {
    await sendThroughSES({ to, subject, text, html });
    return { status: 'sent', error: null, sentAt: new Date() };
  } catch (error) {
    return { status: 'failed', error: error.message, sentAt: null };
  }
}

export function parentMessage(decision, school, language = 'en') {
  const sentAt = decision.approvedAt || new Date();
  const noticeUrl = `${config.publicBaseUrl.replace(/\/$/, '')}/parent`;
  const headlineEn = decision.action === 'cancel_outdoor' ? 'Outdoor activities cancelled today' : 'Outdoor activities limited today';
  const headlineHi = decision.action === 'cancel_outdoor' ? hindi.cancelHeadline : hindi.limitHeadline;
  const headline = language === 'hi' ? headlineHi : language === 'both' ? `${headlineEn} / ${headlineHi}` : headlineEn;
  const paragraphs = language === 'both' ? [decision.notice.en, decision.notice.hi] : [decision.notice[language] || decision.notice.en];
  const windowEn = decision.action === 'cancel_outdoor' ? 'No outdoor time today.' : decision.bestWindow ? `Outdoor activity only between ${decision.bestWindow.start} and ${decision.bestWindow.end}.` : 'No outdoor time today.';
  const windowHi = decision.action === 'cancel_outdoor' ? hindi.cancelWindow : decision.bestWindow ? hindi.limitWindow(decision.bestWindow.start, decision.bestWindow.end) : hindi.noWindow;
  const windowLine = language === 'hi' ? windowHi : language === 'both' ? `${windowEn}\n${windowHi}` : windowEn;
  const whyEn = `Estimated school-hours air quality: ${decision.category} (AQI ~${decision.aqi}). Modelled estimate, not a health advisory.`;
  const why = language === 'hi' ? hindi.why(decision.category, decision.aqi) : language === 'both' ? `${whyEn}\n\n${hindi.why(decision.category, decision.aqi)}` : whyEn;
  const actionLink = language === 'hi' ? '\u0938\u0942\u091a\u0928\u093e \u0926\u0947\u0916\u0947\u0902 \u0914\u0930 \u092a\u0922\u093c\u0928\u0947 \u0915\u0940 \u092a\u0941\u0937\u094d\u091f\u093f \u0915\u0930\u0947\u0902' : 'Open notice and acknowledge';
  const footer = `${school.name} ${bullet} ${timeText(sentAt)}`;
  const text = [headline, ...paragraphs, windowLine, why, `${actionLink}: ${noticeUrl}`, footer].join('\n\n');
  const html = `<main style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#24352a"><h1>${escapeHtml(headline)}</h1>${paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}<p><strong>${escapeHtml(windowLine)}</strong></p><p>${escapeHtml(why)}</p><p><a href="${escapeHtml(noticeUrl)}" style="display:inline-block;padding:12px 18px;background:#286243;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(actionLink)}</a></p><hr><small>${escapeHtml(footer)}</small></main>`;
  return { headline, subject: `[${school.name}] ${headlineEn}`, text, html, noticeUrl, sentAt };
}

export async function sendNotice(decision, school, parents, { onlyParentIds } = {}) {
  const selected = parents.filter(parent => !onlyParentIds || onlyParentIds.some(id => String(id) === String(parent._id)));
  const results = [];
  for (const parent of selected) {
    const message = parentMessage(decision, school, parent.language);
    const result = await deliver({ to: parent.email, subject: message.subject, text: message.text, html: message.html });
    results.push({ parentId: parent._id, channel: config.notifyProvider === 'ses' ? 'email' : 'preview', ...result });
  }
  return results;
}

export async function sendInvite(parent, school, inviteUrl) {
  const subject = `Invitation to Saans updates from ${school.name}`;
  const text = `Hello ${parent.name},\n\nActivate your parent account to view school air-quality updates and acknowledge notices: ${inviteUrl}\n\nThis one-time link expires in 7 days.`;
  const html = `<main style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h1>Join ${escapeHtml(school.name)} on Saans</h1><p>Hello ${escapeHtml(parent.name)},</p><p>Activate your parent account to view school updates and acknowledge notices.</p><p><a href="${escapeHtml(inviteUrl)}">Activate parent account</a></p><small>This one-time link expires in 7 days.</small></main>`;
  return { ...(await deliver({ to: parent.email, subject, text, html })), previewLink: config.notifyProvider === 'ses' ? null : inviteUrl };
}

export async function sendPrincipalAlert(school, decision, reminder = false) {
  const url = `${config.publicBaseUrl.replace(/\/$/, '')}/`;
  const subject = reminder ? `Approval still needed: ${school.name} air plan` : `Decision waiting for your approval: ${school.name}`;
  const text = `${subject}\n\n${decision.category} (AQI ~${decision.aqi}): ${decision.action.replaceAll('_', ' ')}.\nOpen the principal dashboard: ${url}`;
  const html = `<main style="font-family:Arial,sans-serif"><h1>${escapeHtml(subject)}</h1><p>${escapeHtml(decision.category)} (AQI ~${decision.aqi}): ${escapeHtml(decision.action.replaceAll('_', ' '))}</p><p><a href="${escapeHtml(url)}">Open principal dashboard</a></p></main>`;
  return deliver({ to: school.email, subject, text, html });
}

export async function sendParentReminder(decision, school, parent) {
  const message = parentMessage(decision, school, parent.language);
  const subject = `Reminder: please acknowledge ${school.name}'s air update`;
  const text = `Please open and acknowledge the school update:\n\n${message.text}`;
  const html = `<main style="font-family:Arial,sans-serif"><p>Please open and acknowledge the school update.</p>${message.html}</main>`;
  return deliver({ to: parent.email, subject, text, html });
}
