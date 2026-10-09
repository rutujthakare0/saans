export const CATEGORIES = ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'];
const PM25 = [[0,30,0,50],[31,60,51,100],[61,90,101,200],[91,120,201,300],[121,250,301,400],[251,500,401,500]];
const PM10 = [[0,50,0,50],[51,100,51,100],[101,250,101,200],[251,350,201,300],[351,430,301,400],[431,600,401,500]];

function subIndex(value, table) {
  if (!Number.isFinite(value) || value < 0) throw new Error('PM concentrations must be non-negative numbers.');
  for (const [low, high, indexLow, indexHigh] of table) {
    if (value <= high) return Math.round(indexLow + ((indexHigh-indexLow)/(high-low))*(value-low));
  }
  return 500;
}
export const aqi = (pm25, pm10) => Math.max(subIndex(pm25, PM25), subIndex(pm10, PM10));
export function category(index) {
  if (index <= 50) return 'Good'; if (index <= 100) return 'Satisfactory';
  if (index <= 200) return 'Moderate'; if (index <= 300) return 'Poor';
  if (index <= 400) return 'Very Poor'; return 'Severe';
}
