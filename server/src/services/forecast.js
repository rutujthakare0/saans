import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const replayDir = path.resolve(here, '../data/replay');

export async function getReplayForecast(mode = 'bad', date) {
  const payload = JSON.parse(await readFile(path.join(replayDir, `${mode}.json`), 'utf8'));
  return normalize(payload, date || payload.date, 'replay');
}
export async function getLiveForecast(school, date = new Date().toISOString().slice(0, 10)) {
  const params = new URLSearchParams({ latitude: String(school.lat), longitude: String(school.lng), hourly: 'pm2_5,pm10', timezone: school.timezone || 'Asia/Kolkata', start_date: date, end_date: date });
  const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Open-Meteo returned HTTP ${response.status}.`);
  const json = await response.json();
  return normalize(json, date, 'live');
}
export async function getForecast(school, { mode = 'bad', date, source } = {}) {
  const selectedSource = source || process.env.FORECAST_PROVIDER || 'replay';
  return selectedSource === 'live' ? getLiveForecast(school, date) : getReplayForecast(mode, date);
}
function normalize(payload, date, source) {
  const hours = payload.hourly?.time?.map((time, i) => ({ time: time.slice(11, 16), timestamp: time, pm25: payload.hourly.pm2_5[i], pm10: payload.hourly.pm10[i] }))
    || payload.hourly?.map(({ time, pm25, pm10 }) => ({ time, timestamp: `${date}T${time}`, pm25, pm10 }));
  if (!hours?.length || hours.some(h => !Number.isFinite(h.pm25) || !Number.isFinite(h.pm10))) throw new Error('Forecast is missing valid hourly PM2.5 or PM10 readings.');
  return { date, source, hours };
}
