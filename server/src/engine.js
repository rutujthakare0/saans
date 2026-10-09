export const CATEGORIES = ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'];
const PM25 = [[0,30,0,50],[31,60,51,100],[61,90,101,200],[91,120,201,300],[121,250,301,400],[251,500,401,500]];
const PM10 = [[0,50,0,50],[51,100,51,100],[101,250,101,200],[251,350,201,300],[351,430,301,400],[431,600,401,500]];
function subIndex(value, table) {
  if (!Number.isFinite(value) || value < 0) return 0;
  for (const [low, high, indexLow, indexHigh] of table) {
    if (value <= high) return Math.round(indexLow + ((indexHigh-indexLow)/(high-low))*(value-low));
  }
  return 500;
}
export function aqi(pm25, pm10) { return Math.max(subIndex(pm25, PM25), subIndex(pm10, PM10)); }
export function category(index) {
  if (index <= 50) return 'Good'; if (index <= 100) return 'Satisfactory';
  if (index <= 200) return 'Moderate'; if (index <= 300) return 'Poor';
  if (index <= 400) return 'Very Poor'; return 'Severe';
}
export function makeHourly(day = 'bad') {
  const values = day === 'clean'
    ? [[18,35],[17,33],[16,32],[19,38],[22,42],[24,45],[21,40],[18,36],[16,32],[17,34],[19,37],[20,39]]
    : [[142,210],[158,225],[166,241],[151,231],[132,214],[118,198],[105,183],[96,169],[87,155],[92,160],[111,181],[128,203]];
  return values.map(([pm25,pm10], i) => ({ time: `${String(i+7).padStart(2,'0')}:00`, pm25, pm10 }));
}
export function evaluate(hours, schoolStart = '08:00', schoolEnd = '14:00') {
  const within = hours.filter(h => h.time >= schoolStart && h.time < schoolEnd);
  if (!within.length) throw new Error('Forecast has no hours inside the school day.');
  const avg25 = within.reduce((s,h)=>s+h.pm25,0)/within.length;
  const avg10 = within.reduce((s,h)=>s+h.pm10,0)/within.length;
  const index = aqi(avg25, avg10), band = category(index);
  const action = index > 300 ? 'cancel_outdoor' : index > 200 ? 'limit_outdoor' : 'normal';
  let bestWindow = null;
  for (let i=0; i<within.length-1; i++) {
    const pair = within.slice(i,i+2), score = aqi(pair.reduce((s,h)=>s+h.pm25,0)/2,pair.reduce((s,h)=>s+h.pm10,0)/2);
    if (!bestWindow || score < bestWindow.aqi) bestWindow = { start:pair[0].time, end:`${String(Number(pair[1].time.slice(0,2))+1).padStart(2,'0')}:00`, aqi:score };
  }
  if (bestWindow && bestWindow.aqi > 100) bestWindow = null;
  const reasons = [`School-hours estimate uses ${within.length} hourly forecast readings.`, `Mean PM2.5 ${Math.round(avg25)} µg/m³; mean PM10 ${Math.round(avg10)} µg/m³.`];
  return { aqi:index, category:band, action, bestWindow, reasons, hourly:within };
}
export function notices(result, schoolName) {
  const actionEn = result.action === 'cancel_outdoor' ? 'Please keep students indoors and cancel outdoor assembly and PE' : result.action === 'limit_outdoor' ? 'Please limit outdoor assembly and PE and keep activities brief' : 'Outdoor activities may continue as planned';
  const actionHi = result.action === 'cancel_outdoor' ? 'कृपया बच्चों को घर के अंदर रखें और खुले में होने वाली सभा व पीटी रद्द करें' : result.action === 'limit_outdoor' ? 'कृपया खुले में होने वाली सभा व पीटी सीमित रखें और गतिविधियाँ कम समय की रखें' : 'खुले में होने वाली गतिविधियाँ योजना के अनुसार जारी रह सकती हैं';
  const windowEn = result.bestWindow ? ` The cleanest two-hour window is ${result.bestWindow.start}–${result.bestWindow.end}.` : ' No suitable outdoor window was found during school hours.';
  const windowHi = result.bestWindow ? ` सबसे बेहतर दो घंटे का समय ${result.bestWindow.start}–${result.bestWindow.end} है।` : ' स्कूल के समय में खुले में गतिविधि के लिए उपयुक्त समय नहीं मिला।';
  return {
    en: `${schoolName}: today's school-hours air-quality estimate is ${result.category} (AQI ${result.aqi}). ${actionEn}.${windowEn} This is a modelled estimate, not a playground sensor reading.`,
    hi: `${schoolName}: आज स्कूल समय के दौरान हवा की गुणवत्ता का अनुमान ${result.category} (AQI ${result.aqi}) है। ${actionHi}।${windowHi} यह मॉडल पर आधारित अनुमान है, स्कूल के मैदान का सेंसर रीडिंग नहीं।`
  };
}
