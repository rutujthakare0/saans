import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const replayDir = path.resolve(here, '../data/replay');

export function formatDataLabel(source, meta = {}, fetchedAt = new Date()) {
  if (source === 'live') {
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(fetchedAt));
    return `Live forecast · fetched ${time} IST`;
  }
  if (meta.kind === 'illustrative') return 'Illustrative scenario';
  if (meta.kind === 'real' && meta.realDate) {
    const date = new Date(`${meta.realDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    return `Saved real day · ${date}`;
  }
  return 'Replay data · provenance unavailable';
}

export function normalize(payload, date, source, schoolStart = '08:00', schoolEnd = '14:00') {
  const times = payload.hourly?.time || [];
  const allHours = times.map((timestamp, i) => ({
    time: timestamp.slice(11, 16), timestamp,
    pm25: payload.hourly.pm2_5?.[i] ?? null,
    pm10: payload.hourly.pm10?.[i] ?? null
  }));
  const hours = allHours.filter(hour => hour.time >= schoolStart && hour.time < schoolEnd
    && Number.isFinite(hour.pm25) && Number.isFinite(hour.pm10));
  if (hours.length < 4) throw new Error(`Forecast has only ${hours.length} valid school-hour readings; at least 4 are required.`);
  const meta = payload.meta || {};
  const fetchedAt = meta.fetchedAt ? new Date(meta.fetchedAt) : new Date();
  return { date, source, hours, meta, fetchedAt, dataLabel: formatDataLabel(source, meta, fetchedAt) };
}

export async function getReplayForecast(mode = 'severe', date, school = config.school) {
  const payload = JSON.parse(await readFile(path.join(replayDir, `${mode}.json`), 'utf8'));
  return normalize(payload, date || payload.meta?.realDate, 'replay', school.schoolStart, school.schoolEnd);
}

export async function getLiveForecast(school, date = new Date().toLocaleDateString('en-CA', { timeZone: school.timezone || 'Asia/Kolkata' })) {
  const endpoint = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  const params = new URLSearchParams({ latitude: String(school.lat), longitude: String(school.lng), hourly: 'pm2_5,pm10', timezone: school.timezone || 'Asia/Kolkata', start_date: date, end_date: date });
  const response = await fetch(`${endpoint}?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Open-Meteo returned HTTP ${response.status}.`);
  const json = await response.json();
  json.meta = { provider: 'open-meteo', endpoint, fetchedAt: new Date().toISOString(), latitude: school.lat, longitude: school.lng, timezone: school.timezone || 'Asia/Kolkata', realDate: date, kind: 'real' };
  return normalize(json, date, 'live', school.schoolStart, school.schoolEnd);
}

export async function getForecast(school, { mode = 'severe', date, source } = {}) {
  const selectedSource = source || config.forecastProvider;
  if (selectedSource === 'live') return getLiveForecast(school, date);
  if (selectedSource === 'replay') return getReplayForecast(mode, date, school);
  throw new Error(`Unsupported forecast provider: ${selectedSource}`);
}
