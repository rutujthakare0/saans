import { config } from '../config.js';
import { draftWithModel } from './llm.js';

const hi = {
  indoors: '\u0915\u0943\u092a\u092f\u093e \u092c\u091a\u094d\u091a\u094b\u0902 \u0915\u094b \u0918\u0930 \u0915\u0947 \u0905\u0902\u0926\u0930 \u0930\u0916\u0947\u0902',
  cancel: '\u0914\u0930 \u0916\u0941\u0932\u0947 \u092e\u0947\u0902 \u0939\u094b\u0928\u0947 \u0935\u093e\u0932\u0940 \u0938\u092d\u093e \u0935 \u092a\u0940\u091f\u0940 \u0930\u0926\u094d\u0926 \u0915\u0930\u0947\u0902',
  limit: '\u0915\u0943\u092a\u092f\u093e \u0916\u0941\u0932\u0947 \u092e\u0947\u0902 \u0939\u094b\u0928\u0947 \u0935\u093e\u0932\u0940 \u0938\u092d\u093e \u0935 \u092a\u0940\u091f\u0940 \u0938\u0940\u092e\u093f\u0924 \u0930\u0916\u0947\u0902 \u0914\u0930 \u0917\u0924\u093f\u0935\u093f\u0927\u093f\u092f\u093e\u0901 \u0915\u092e \u0938\u092e\u092f \u0915\u0940 \u0930\u0916\u0947\u0902',
  continue: '\u0916\u0941\u0932\u0947 \u092e\u0947\u0902 \u0939\u094b\u0928\u0947 \u0935\u093e\u0932\u0940 \u0917\u0924\u093f\u0935\u093f\u0927\u093f\u092f\u093e\u0901 \u092f\u094b\u091c\u0928\u093e \u0915\u0947 \u0905\u0928\u0941\u0938\u093e\u0930 \u091c\u093e\u0930\u0940 \u0930\u0939 \u0938\u0915\u0924\u0940 \u0939\u0948\u0902',
  estimate: '\u0906\u0915\u0932\u0928 \u092e\u0949\u0921\u0932 \u092a\u0930 \u0906\u0927\u093e\u0930\u093f\u0924 \u0939\u0948, \u092f\u0939 \u0916\u0947\u0932 \u0915\u0947 \u092e\u0948\u0926\u093e\u0928 \u0915\u093e \u0938\u0947\u0902\u0938\u0930 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964',
  label: '\u0905\u0928\u0941\u092e\u093e\u0928\u093f\u0924 \u0938\u094d\u0915\u0942\u0932-\u0938\u092e\u092f \u0935\u093e\u092f\u0941 \u0917\u0941\u0923\u0935\u0924\u094d\u0924\u093e'
};

function fixedNotice(facts) {
  const actionEn = facts.action === 'cancel_outdoor' ? 'Please keep students indoors and cancel outdoor assembly and PE.' : 'Please limit outdoor assembly and PE and keep activities brief.';
  const actionHi = facts.action === 'cancel_outdoor' ? `${hi.indoors} ${hi.cancel}।` : `${hi.limit}।`;
  const windowEn = facts.bestWindow ? ` Outdoor time only between ${facts.bestWindow.start} and ${facts.bestWindow.end}.` : '';
  const windowHi = facts.bestWindow ? ` \u0916\u0941\u0932\u0947 \u092e\u0947\u0902 \u0930\u0939\u0928\u0947 \u0915\u093e \u0938\u092e\u092f ${facts.bestWindow.start} \u0938\u0947 ${facts.bestWindow.end} \u0924\u0915 \u0939\u0948\u0964` : '';
  return {
    en: `${facts.schoolName}: today's school-hours air-quality estimate is ${facts.category} (AQI ~${facts.aqi}). ${actionEn}${windowEn} Modelled estimate, not a playground sensor reading or health advisory.`,
    hi: `${facts.schoolName}: ${hi.label} ${facts.category} (AQI ~${facts.aqi} \u0939\u0948\u0964 ${actionHi}${windowHi} ${hi.estimate}`
  };
}

export function validateGeneratedNotice(generated, facts) {
  if (!generated || typeof generated.en !== 'string' || typeof generated.hi !== 'string') return false;
  if (!generated.en.includes(String(facts.aqi)) || !generated.hi.includes(String(facts.aqi))) return false;
  const negatesCancelEn = /\b(?:do not|don't|never|not\s+to)\s+(?:cancel|keep|move|hold|schedule)\b|\b(?:outdoor|outside|assembly|PE|students?)[^.!?]{0,24}\b(?:not|never)\b/i;
  const negatesCancelHi = /(?:नहीं|मत)[^।!?]{0,30}(?:रद्द|घर के अंदर|बाहर|सभाएँ|पीटी)|(?:रद्द|घर के अंदर|बाहर|सभाएँ|पीटी)[^।!?]{0,30}(?:नहीं|मत)/;
  if (facts.action === 'cancel_outdoor' && (negatesCancelEn.test(generated.en) || negatesCancelHi.test(generated.hi))) return false;
  const actionCheck = facts.action === 'cancel_outdoor' ? /cancel|indoors|\u0930\u0926\u094d\u0926|\u0918\u0930 \u0915\u0947 \u0905\u0902\u0926\u0930/i : /limit|brief|\u0938\u0940\u092e\u093f\u0924|\u0915\u092e \u0938\u092e\u092f/i;
  if (!actionCheck.test(generated.en) || !actionCheck.test(generated.hi)) return false;
  if (facts.action === 'limit_outdoor' && facts.bestWindow && ['start', 'end'].some(key => !generated.en.includes(facts.bestWindow[key]) || !generated.hi.includes(facts.bestWindow[key]))) return false;
  return true;
}

export async function createNotice(facts) {
  const fallback = fixedNotice(facts);
  const generated = await draftWithModel(facts);
  if (!validateGeneratedNotice(generated, facts)) return { notice: fallback, wordingSource: 'template', modelId: null };
  return { notice: { en: generated.en, hi: generated.hi }, wordingSource: 'bedrock', modelId: config.bedrockModelId };
}
