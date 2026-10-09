import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { aqi, category } from '../services/naqi.js';
import { actionForCategory } from '../services/policy.js';
import { bestOutdoorWindow } from '../services/window.js';

const options = new Map();
const saves = [];
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--save') saves.push(process.argv[++i]);
  else if (arg.startsWith('--')) options.set(arg.slice(2), process.argv[++i]);
  else throw new Error(`Unknown argument: ${arg}`);
}
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const from = options.get('from'), to = options.get('to');
if (!datePattern.test(from || '') || !datePattern.test(to || '') || from > to) {
  throw new Error('Usage: npm run fetch-replay -- --from YYYY-MM-DD --to YYYY-MM-DD [--lat N --lng N] [--save YYYY-MM-DD=name]');
}
const lat = Number(options.get('lat') ?? config.school.lat), lng = Number(options.get('lng') ?? config.school.lng);
const timezone = 'Asia/Kolkata';
const endpoint = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const params = new URLSearchParams({ latitude: String(lat), longitude: String(lng), hourly: 'pm2_5,pm10', timezone, start_date: from, end_date: to });
const response = await fetch(`${endpoint}?${params}`, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Open-Meteo returned HTTP ${response.status}: ${await response.text()}`);
const payload = await response.json();
const fetchedAt = new Date().toISOString();
const days = new Map();
for (let i = 0; i < (payload.hourly?.time?.length || 0); i += 1) {
  const timestamp = payload.hourly.time[i], date = timestamp.slice(0, 10);
  if (!days.has(date)) days.set(date, { time: [], pm2_5: [], pm10: [] });
  const hourly = days.get(date); hourly.time.push(timestamp); hourly.pm2_5.push(payload.hourly.pm2_5?.[i] ?? null); hourly.pm10.push(payload.hourly.pm10?.[i] ?? null);
}
const rows = [];
for (const [date, hourly] of days) {
  const schoolHours = hourly.time.map((timestamp, i) => ({ time: timestamp.slice(11, 16), pm25: hourly.pm2_5[i], pm10: hourly.pm10[i] }))
    .filter(hour => hour.time >= config.school.schoolStart && hour.time < config.school.schoolEnd && Number.isFinite(hour.pm25) && Number.isFinite(hour.pm10));
  if (schoolHours.length < 4) { rows.push({ date, validHours: schoolHours.length, category: 'INSUFFICIENT', aqi: '—', action: '—', windowAQI: '—' }); continue; }
  const mean25 = schoolHours.reduce((sum, hour) => sum + hour.pm25, 0) / schoolHours.length;
  const mean10 = schoolHours.reduce((sum, hour) => sum + hour.pm10, 0) / schoolHours.length;
  const index = aqi(mean25, mean10), band = category(index), action = actionForCategory(band);
  const window = action === 'limit_outdoor' ? bestOutdoorWindow(schoolHours, 200) : null;
  rows.push({ date, validHours: schoolHours.length, category: band, aqi: index, action, windowAQI: window?.aqi ?? '—' });
  for (const save of saves) {
    const [saveDate, name] = String(save || '').split('=');
    if (saveDate !== date) continue;
    if (!/^[a-z0-9-]+$/i.test(name || '')) throw new Error(`Invalid replay name in --save: ${save}`);
    const replayFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/replay', `${name}.json`);
    const meta = { provider: 'open-meteo', endpoint, fetchedAt, latitude: payload.latitude ?? lat, longitude: payload.longitude ?? lng, timezone, realDate: date, kind: 'real' };
    await mkdir(path.dirname(replayFile), { recursive: true });
    await writeFile(replayFile, `${JSON.stringify({ hourly, meta }, null, 2)}\n`);
    console.info(`Saved ${date} (${band}, AQI ${index}) to ${replayFile}`);
  }
}
console.table(rows);
for (const save of saves) if (!rows.some(row => row.date === String(save).split('=')[0])) console.warn(`Requested save date was not returned: ${save}`);
