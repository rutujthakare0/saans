import { Router } from 'express';
import { getTomorrowForecast } from '../services/forecast.js';
import { publicRateLimit } from '../middleware/publicRateLimit.js';
import School from '../models/School.js';

const router = Router();
router.get('/', publicRateLimit, async (req, res) => {
  let lat = Number(req.query.lat), lng = Number(req.query.lon ?? req.query.lng);
  if ((!Number.isFinite(lat)||!Number.isFinite(lng)) && req.query.school) {
    const school=await School.findOne({slug:String(req.query.school)}).select('lat lng');
    if(!school)return res.status(404).json({error:'School page not found.'});
    lat=school.lat;lng=school.lng;
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return res.status(400).json({ error: 'Provide valid lat and lon coordinates.' });
  try { res.set('Cache-Control', 'public, max-age=1800').json(await getTomorrowForecast(lat, lng)); }
  catch (error) { res.status(503).json({ error: 'forecast_unavailable', source_url: 'https://air-quality-api.open-meteo.com/' }); }
});
export default router;
