const hindi = {
  cancel: '\u0906\u091c \u092c\u093e\u0939\u0930\u0940 \u0938\u092d\u093e, \u092a\u0940\u091f\u0940 \u0914\u0930 \u0916\u0941\u0932\u0947 \u092e\u0947\u0902 \u0939\u094b\u0928\u0947 \u0935\u093e\u0932\u093e \u0905\u0935\u0915\u093e\u0936 \u0935\u093e\u092f\u0941 \u0917\u0941\u0923\u0935\u0924\u094d\u0924\u093e \u0915\u0947 \u0915\u093e\u0930\u0923 \u0930\u0926\u094d\u0926 \u0939\u0948\u0902\u0964 \u0935\u093f\u0926\u094d\u092f\u093e\u0930\u094d\u0925\u0940 \u0938\u094d\u0915\u0942\u0932 \u092e\u0947\u0902 \u0905\u0902\u0926\u0930 \u0930\u0939\u0947\u0902\u0917\u0947\u0964',
  cancelTime: '\u0906\u091c \u092c\u093e\u0939\u0930\u0940 \u0938\u092e\u092f \u0928\u0939\u0940\u0902 \u0939\u094b\u0917\u093e\u0964',
  limit: '\u0906\u091c \u092c\u093e\u0939\u0930\u0940 \u0938\u092d\u093e, \u092a\u0940\u091f\u0940 \u0914\u0930 \u0916\u0941\u0932\u0947 \u092e\u0947\u0902 \u0939\u094b\u0928\u0947 \u0935\u093e\u0932\u093e \u0905\u0935\u0915\u093e\u0936 \u0938\u0940\u092e\u093f\u0924 \u0930\u0939\u0947\u0917\u093e\u0964',
  indoor: '\u0907\u0938 \u0938\u092e\u092f \u0915\u0947 \u0905\u0932\u093e\u0935\u093e \u0935\u093f\u0926\u094d\u092f\u093e\u0930\u094d\u0925\u0940 \u0938\u094d\u0915\u0942\u0932 \u092e\u0947\u0902 \u0905\u0902\u0926\u0930 \u0930\u0939\u0947\u0902\u0917\u0947\u0964',
  noWindow: '\u0906\u091c \u0915\u094b\u0908 \u0909\u092a\u092f\u0941\u0915\u094d\u0924 \u092c\u093e\u0939\u0930\u0940 \u0938\u092e\u092f \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e; \u092f\u0947 \u0917\u0924\u093f\u0935\u093f\u0927\u093f\u092f\u093e\u0901 \u0938\u094d\u0915\u0942\u0932 \u092e\u0947\u0902 \u0905\u0902\u0926\u0930 \u0939\u094b\u0902\u0917\u0940\u0964',
  open: '\u091c\u092c \u0924\u0915 \u0938\u094d\u0915\u0942\u0932 \u0906\u092a\u0915\u094b \u0915\u094b\u0908 \u0914\u0930 \u0938\u0942\u091a\u0928\u093e \u0928 \u0926\u0947, \u0938\u094d\u0915\u0942\u0932 \u092f\u094b\u091c\u0928\u093e \u0915\u0947 \u0905\u0928\u0941\u0938\u093e\u0930 \u0916\u0941\u0932\u093e \u0930\u0939\u0947\u0917\u093e\u0964',
  disclaimer: '\u092f\u0939 \u092e\u0949\u0921\u0932 \u092a\u0930 \u0906\u0927\u093e\u0930\u093f\u0924 \u0905\u0928\u0941\u092e\u093e\u0928 \u0939\u0948, \u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u0938\u0932\u093e\u0939 \u0928\u0939\u0940\u0902\u0964',
  why: (category, aqi) => `\u0905\u0928\u0941\u092e\u093e\u0928\u093f\u0924 \u0938\u094d\u0915\u0942\u0932-\u0938\u092e\u092f \u0935\u093e\u092f\u0941 \u0917\u0941\u0923\u0935\u0924\u094d\u0924\u093e: ${category} (AQI ~${aqi})\u0964`
};

function fixedNotice(facts) {
  const cancelEn = 'Today, outdoor assembly, PE and outdoor break time are cancelled because of poor air quality. No outdoor time is planned today. Students will stay indoors at school.';
  const limitEn = 'Today, outdoor assembly, PE and outdoor break time are limited because of air quality.';
  const windowEn = facts.bestWindow ? ` Outdoor activity only between ${facts.bestWindow.start} and ${facts.bestWindow.end}.` : ' No suitable outdoor window was found today; these activities will be held indoors at school.';
  const openEn = ' School remains open as planned unless the school informs you otherwise.';
  const explainEn = ` Estimated school-hours air quality: ${facts.category} (AQI ~${facts.aqi}). Modelled estimate, not a health advisory.`;
  const cancelHi = `${hindi.cancel} ${hindi.cancelTime} ${hindi.open}`;
  const limitHi = `${hindi.limit}${facts.bestWindow ? ` \u0916\u0941\u0932\u0947 \u092e\u0947\u0902 \u0917\u0924\u093f\u0935\u093f\u0927\u093f \u0915\u0947\u0935\u0932 ${facts.bestWindow.start} \u0938\u0947 ${facts.bestWindow.end} \u0915\u0947 \u092c\u0940\u091a \u0939\u094b\u0917\u0940\u0964 ${hindi.indoor}` : ` ${hindi.noWindow}`} ${hindi.open}`;
  const hi = facts.action === 'cancel_outdoor' ? cancelHi : limitHi;
  return {
    en: `${facts.schoolName}: ${facts.action === 'cancel_outdoor' ? cancelEn : limitEn}${facts.action === 'limit_outdoor' ? windowEn : ''}${openEn}${explainEn}`,
    hi: `${facts.schoolName}: ${hi} ${hindi.why(facts.category, facts.aqi)} ${hindi.disclaimer}`
  };
}

export function validateNotice(notice, facts) {
  if (!notice || typeof notice.en !== 'string' || typeof notice.hi !== 'string') return false;
  const en = notice.en, hi = notice.hi;
  if (![en, hi].every(value => value.includes(String(facts.aqi)))) return false;
  const unsafeEn = /\b(?:keep your child at home|stay home|school is closed|school will close|close the school)\b/i;
  const unsafeHi = /(?:\u0918\u0930 \u092a\u0930 \u0930\u0939\u0947\u0902|\u0938\u094d\u0915\u0942\u0932 \u092c\u0902\u0926|\u0935\u093f\u0926\u094d\u092f\u093e\u0932\u092f \u092c\u0902\u0926)/;
  if (unsafeEn.test(en) || unsafeHi.test(hi)) return false;
  const cancelEn = /\b(cancelled|canceled)\b/i.test(en) && /\b(outdoor|assembly|PE|break)\b/i.test(en) && /\bstudents?\b.{0,45}\bindoors? at school\b/i.test(en);
  const cancelHi = /\u0930\u0926\u094d\u0926/.test(hi) && /\u092c\u093e\u0939\u0930/.test(hi) && /\u0938\u094d\u0915\u0942\u0932.{0,35}\u0905\u0902\u0926\u0930/.test(hi);
  const limitEn = /\b(limited|limit)\b/i.test(en) && /\b(outdoor|assembly|PE|break)\b/i.test(en);
  const limitHi = /\u0938\u0940\u092e\u093f\u0924/.test(hi) && /\u092c\u093e\u0939\u0930/.test(hi);
  if (facts.action === 'cancel_outdoor' && (!cancelEn || !cancelHi)) return false;
  if (facts.action === 'limit_outdoor' && (!limitEn || !limitHi)) return false;
  const openEn = /school remains open as planned/i.test(en);
  const openHi = /\u0938\u094d\u0915\u0942\u0932.{0,40}\u0916\u0941\u0932\u093e \u0930\u0939\u0947\u0917\u093e/.test(hi);
  if (!openEn || !openHi) return false;
  const negationEn = /\b(?:do not|don't|never|not)\s+(?:cancel|hold|keep|limit)\b|\b(?:outdoor|activities|school)\b[^.!?]{0,24}\b(?:not|never)\b/i;
  const negationHi = /(?:\u0928\u0939\u0940\u0902|\u092e\u0924)[^\u0964!?]{0,30}(?:\u0930\u0926\u094d\u0926|\u0938\u0940\u092e\u093f\u0924)|(?:\u0930\u0926\u094d\u0926|\u0938\u0940\u092e\u093f\u0924)[^\u0964!?]{0,30}(?:\u0928\u0939\u0940\u0902|\u092e\u0924)/;
  if (facts.action === 'cancel_outdoor' && (negationEn.test(en) || negationHi.test(hi))) return false;
  if (facts.action === 'limit_outdoor' && facts.bestWindow && ['start', 'end'].some(key => !en.includes(facts.bestWindow[key]) || !hi.includes(facts.bestWindow[key]))) return false;
  return true;
}

export function createNotice(facts) {
  const notice = fixedNotice(facts);
  if (!validateNotice(notice, facts)) throw new Error('Fixed notice template failed safety validation.');
  if (facts.parentLine?.trim()) {
    notice.en += `\n\n${facts.parentLine.trim()}`;
    notice.hi += `\n\n${facts.parentLine.trim()}`;
  }
  return { notice };
}

export { fixedNotice };
