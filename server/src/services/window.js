import { aqi } from './naqi.js';

export function bestOutdoorWindow(hours, maxAqi = 200) {
  let best = null;
  for (let i = 0; i < hours.length - 1; i += 1) {
    const pair = hours.slice(i, i + 2);
    const score = aqi((pair[0].pm25 + pair[1].pm25) / 2, (pair[0].pm10 + pair[1].pm10) / 2);
    if (!best || score < best.aqi) {
      const endHour = Number(pair[1].time.slice(0, 2)) + 1;
      best = { start: pair[0].time, end: `${String(endHour).padStart(2, '0')}:00`, aqi: score };
    }
  }
  return best && best.aqi <= maxAqi ? best : null;
}
