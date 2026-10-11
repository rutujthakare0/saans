import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { aqi, category } from './naqi.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const replayDir = path.resolve(here, '../data/replay');
const publicForecastCache = new Map();

export async function getTomorrowForecast(lat, lng, { now = new Date(), fetchImpl = fetch } = {}) {
  const key = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
  const cached = publicForecastCache.get(key);
  if (cached && Date.now() - cached.at < 30 * 60_000) return cached.value;
  const params = new URLSearchParams({ latitude: String(lat), longitude: String(lng), hourly: 'pm10,pm2_5', timezone: 'Asia/Kolkata', forecast_days: '7' });
  const endpoint = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  const response = await fetchImpl(`${endpoint}?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Open-Meteo returned HTTP ${response.status}.`);
  const payload = await response.json();
  const times = payload.hourly?.time || [];
  const hours = times.map((at, i) => {
    const pm25 = payload.hourly.pm2_5?.[i], pm10 = payload.hourly.pm10?.[i];
    if (!Number.isFinite(pm25) || !Number.isFinite(pm10)) return null;
    const index = aqi(pm25, pm10);
    return { at, pm25, pm10, aqi: index, category: category(index), dominant: aqi(0, pm10) > aqi(pm25, 0) ? 'PM10' : 'PM2.5' };
  }).filter(Boolean);
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const tomorrowDate = new Date(`${today}T12:00:00+05:30`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const dateKey = tomorrowDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const morningFor = date => hours.filter(item => item.at.startsWith(date)).sort((a,b) => Math.abs(Number(a.at.slice(11,13))-6)-Math.abs(Number(b.at.slice(11,13))-6))[0];
  const morning = morningFor(dateKey);
  const days = [...new Set(hours.map(item => item.at.slice(0, 10)))];
  const week_ahead = days.filter(date=>date>=dateKey).map(date => {
    const item = morningFor(date);
    return item && { date, morning_aqi: item.aqi, category: item.category };
  }).filter(Boolean).slice(0, 6);
  const value = { generated_at: new Date().toISOString(), source: 'open-meteo', source_label: 'Open-Meteo modelled forecast', is_modelled: true, location: { lat: Number(lat), lon: Number(lng) }, hours: hours.filter(item => item.at.slice(0, 10) === dateKey), morning_summary: morning ? { date: dateKey, at: morning.at, aqi: morning.aqi, category: morning.category, dominant: morning.dominant, note: morning.aqi > 200 ? 'Outdoor activity changes may be considered. The morning check will confirm.' : 'No notice expected. The morning check at 06:00 will confirm.' } : null, week_ahead };
  publicForecastCache.set(key, { at: Date.now(), value });
  return value;
}

export function clearTomorrowForecastCache() { publicForecastCache.clear(); }

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
