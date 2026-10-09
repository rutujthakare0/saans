import { draftWithModel } from './llm.js';

function fixedNotice(facts) {
  const phrases = {
    cancel_outdoor: ['Please keep students indoors and cancel outdoor assembly and PE', 'कृपया बच्चों को घर के अंदर रखें और खुले में होने वाली सभा व पीटी रद्द करें'],
    limit_outdoor: ['Please limit outdoor assembly and PE and keep activities brief', 'कृपया खुले में होने वाली सभा व पीटी सीमित रखें और गतिविधियाँ कम समय की रखें'],
    normal: ['Outdoor activities may continue as planned', 'खुले में होने वाली गतिविधियाँ योजना के अनुसार जारी रह सकती हैं']
  }[facts.action];
  const enWindow = facts.bestWindow ? ` The cleanest two-hour window is ${facts.bestWindow.start}–${facts.bestWindow.end}.` : ' No suitable outdoor window was found during school hours.';
  const hiWindow = facts.bestWindow ? ` सबसे बेहतर दो घंटे का समय ${facts.bestWindow.start}–${facts.bestWindow.end} है।` : ' स्कूल के समय में खुले में गतिविधि के लिए उपयुक्त समय नहीं मिला।';
  return {
    en: `${facts.schoolName}: today's school-hours air-quality estimate is ${facts.category} (AQI ${facts.aqi}). ${phrases[0]}.${enWindow} This is a modelled estimate, not a playground sensor reading.`,
    hi: `${facts.schoolName}: आज स्कूल समय के दौरान हवा की गुणवत्ता का अनुमान ${facts.category} (AQI ${facts.aqi}) है। ${phrases[1]}।${hiWindow} यह मॉडल पर आधारित अनुमान है, स्कूल के मैदान का सेंसर रीडिंग नहीं।`
  };
}
export async function createNotice(facts) {
  const fallback = fixedNotice(facts);
  const generated = await draftWithModel(facts);
  if (!generated || typeof generated.en !== 'string' || typeof generated.hi !== 'string') return fallback;
  const actionCheck = facts.action === 'cancel_outdoor' ? /cancel|indoors|रद्द|घर के अंदर/i : facts.action === 'limit_outdoor' ? /limit|brief|सीमित|कम समय/i : /continue|planned|जारी|अनुसार/i;
  if (!generated.en.includes(String(facts.aqi)) || !generated.hi.includes(String(facts.aqi)) || !actionCheck.test(generated.en) || !actionCheck.test(generated.hi)) return fallback;
  return generated;
}
