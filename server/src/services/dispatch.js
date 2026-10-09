import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from '../config.js';

let ses;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const headlineFor = (action, language) => {
  const english = action === 'cancel_outdoor' ? 'Outdoor activities cancelled today' : 'Outdoor activities limited today';
  const hindi = action === 'cancel_outdoor' ? 'आज बाहरी गतिविधियाँ रद्द हैं' : 'आज बाहरी गतिविधियाँ सीमित हैं';
  return language === 'hi' ? hindi : language === 'both' ? `${english} / ${hindi}` : english;
};
const timeText = date => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date)) + ' IST';

export function parentMessage(decision, school, language = 'en') {
  const sentAt = decision.approvedAt || new Date();
  const parentUrl = `${config.publicBaseUrl.replace(/\/$/, '')}/p/${school.slug}`;
  const headline = headlineFor(decision.action, language);
  const paragraphs = language === 'both' ? [decision.notice.en, decision.notice.hi] : [decision.notice[language] || decision.notice.en];
  const windowEn = decision.action === 'cancel_outdoor' ? 'No outdoor time today.' : decision.bestWindow ? `Outdoor time only between ${decision.bestWindow.start} and ${decision.bestWindow.end}.` : 'No safe outdoor window today.';
  const windowHi = decision.action === 'cancel_outdoor' ? 'आज बाहरी गतिविधियों का समय नहीं होगा।' : decision.bestWindow ? `खुले में गतिविधि केवल ${decision.bestWindow.start} से ${decision.bestWindow.end} के बीच रखें।` : 'आज कोई उपयुक्त बाहरी समय नहीं है।';
  const windowLine = language === 'hi' ? windowHi : language === 'both' ? `${windowEn}\n${windowHi}` : windowEn;
  const whyEn = `Estimated school-hours air quality: ${decision.category} (AQI ~${decision.aqi}). Modelled estimate, not a health advisory.`;
  const whyHi = `स्कूल समय में अनुमानित वायु गुणवत्ता: ${decision.category} (AQI ~${decision.aqi})। यह मॉडल आधारित अनुमान है, स्वास्थ्य सलाह नहीं।`;
  const why = language === 'hi' ? whyHi : language === 'both' ? `${whyEn}\n\n${whyHi}` : whyEn;
  const footer = `${school.name} · ${timeText(sentAt)} · ${parentUrl}`;
  const text = [headline, ...paragraphs, windowLine, why, footer].join('\n\n');
  const html = `<main style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#24352a"><h1>${escapeHtml(headline)}</h1>${paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}<p><strong>${escapeHtml(windowLine)}</strong></p><p>${escapeHtml(why)}</p><hr><small>${escapeHtml(footer.split(' · ').slice(0, 2).join(' · '))} · <a href="${escapeHtml(parentUrl)}">View the school update</a></small></main>`;
  return { headline, subject: `[${school.name}] ${headline}`, text, html, parentUrl, sentAt };
}

export async function sendNotice(decision, school, parents, { onlyParentIds } = {}) {
  const selected = parents.filter(parent => !onlyParentIds || onlyParentIds.some(id => String(id) === String(parent._id)));
  if (config.notifyProvider !== 'ses') return selected.map(parent => ({ parentId: parent._id, channel: 'preview', status: 'preview', error: null, sentAt: null }));
  if (!config.sesSender) return selected.map(parent => ({ parentId: parent._id, channel: 'email', status: 'failed', error: 'SES_SENDER is not configured.', sentAt: null }));
  ses ||= new SESv2Client({ region: config.sesRegion });
  return Promise.all(selected.map(async parent => {
    try {
      const message = parentMessage(decision, school, parent.language);
      await ses.send(new SendEmailCommand({
        FromEmailAddress: config.sesSender,
        Destination: { ToAddresses: [parent.email] },
        Content: { Simple: { Subject: { Data: message.subject, Charset: 'UTF-8' }, Body: { Text: { Data: message.text, Charset: 'UTF-8' }, Html: { Data: message.html, Charset: 'UTF-8' } } } }
      }));
      return { parentId: parent._id, channel: 'email', status: 'sent', error: null, sentAt: message.sentAt };
    } catch (error) {
      return { parentId: parent._id, channel: 'email', status: 'failed', error: error.message, sentAt: null };
    }
  }));
}
