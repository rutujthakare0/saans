import { Router } from 'express';
import Decision from '../models/Decision.js';
import { config } from '../config.js';
import { getLiveForecast } from '../services/forecast.js';
import { aqi, category } from '../services/naqi.js';
import { bestOutdoorWindow } from '../services/window.js';
import { defaultNotifyBy, validateSchoolSettings } from '../services/schoolSettings.js';
import { runPipeline } from '../services/pipeline.js';

const router = Router();
const schoolDate = school => new Date().toLocaleDateString('en-CA', { timeZone: school.timezone || 'Asia/Kolkata' });
const publicFields = school => ({ name: school.name, lat: school.lat, lng: school.lng, locationLabel: school.locationLabel, schoolStart: school.schoolStart, schoolEnd: school.schoolEnd, checkTime: school.checkTime, notifyBy: school.notifyBy, slug: school.slug, configured: Boolean(school.configured), timezone: 'Asia/Kolkata' });

router.get('/', (req, res) => res.json(publicFields(req.school)));

router.post('/preview', async (req, res) => {
  const lat = Number(req.body.lat), lng = Number(req.body.lng);
  if (!Number.isFinite(lat) || lat < 6 || lat > 38 || !Number.isFinite(lng) || lng < 68 || lng > 98) return res.status(400).json({ error: 'Choose coordinates within India.' });
  try {
    const school = { ...req.school.toObject(), lat, lng, schoolStart: req.body.schoolStart || req.school.schoolStart, schoolEnd: req.body.schoolEnd || req.school.schoolEnd, timezone: 'Asia/Kolkata' };
    const date = schoolDate(school);
    const forecast = await getLiveForecast(school, date);
    const pm25 = forecast.hours.reduce((sum, item) => sum + item.pm25, 0) / forecast.hours.length;
    const pm10 = forecast.hours.reduce((sum, item) => sum + item.pm10, 0) / forecast.hours.length;
    const index = aqi(pm25, pm10), band = category(index);
    const bestWindow = band === 'Poor' ? bestOutdoorWindow(forecast.hours, 200) : null;
    res.json({ locationLabel: req.body.locationLabel || req.school.locationLabel, lat, lng, date, aqi: index, category: band, action: band === 'Poor' ? 'limit_outdoor' : ['Very Poor', 'Severe'].includes(band) ? 'cancel_outdoor' : 'normal', meanPm25: Math.round(pm25), meanPm10: Math.round(pm10), readings: forecast.hours.length, bestWindow, fetchedAt: forecast.fetchedAt, dataLabel: forecast.dataLabel });
  } catch (error) {
    res.status(503).json({ error: `Could not fetch a live reading for this location: ${error.message}` });
  }
});

router.put('/', async (req, res) => {
  const validated = validateSchoolSettings(req.body);
  if (validated.error) return res.status(400).json({ error: validated.error });
  const school = req.school;
  const next = validated.value;
  const changed = ['name', 'lat', 'lng', 'locationLabel', 'schoolStart', 'schoolEnd'].some(key => school[key] !== next[key]);
  const date = schoolDate(school);
  const existing = await Decision.findOne({ schoolId: school._id, date, source: 'live' });
  Object.assign(school, next, { notifyBy: req.body.notifyBy || defaultNotifyBy(next.schoolStart) });
  await school.save();
  if (changed && existing?.status === 'sent') return res.json({ school: publicFields(school), decision: existing, warning: "Today's notice already went out for the previous settings. Changes apply from tomorrow." });
  if (changed && existing && ['proposed', 'no_action'].includes(existing.status)) await Decision.deleteOne({ _id: existing._id, status: existing.status });
  if (changed || !existing) {
    try {
      const decision = await runPipeline(school, { date, source: 'live', force: true });
      return res.json({ school: publicFields(school), decision, warning: null });
    } catch (error) {
      return res.json({ school: publicFields(school), decision: null, forecastError: error.message, warning: 'Settings saved. A new live reading will be fetched when available.' });
    }
  }
  res.json({ school: publicFields(school), decision: existing, warning: null });
});

export { defaultNotifyBy };
export default router;
