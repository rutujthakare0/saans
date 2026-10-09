import { Router } from 'express';
import { publicRateLimit } from '../middleware/publicRateLimit.js';

const router = Router();
export function sanitizeGeoResults(items = []) {
  return items.filter(item => item.country_code === 'IN').slice(0, 6).map(item => ({ name: item.name, admin1: item.admin1 || '', lat: item.latitude, lng: item.longitude }));
}
router.get('/search', publicRateLimit, async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q.length < 2) return res.status(400).json({ error: 'Search for at least two characters.' });
  try {
    const params = new URLSearchParams({ name: q, countryCode: 'IN', count: '6', language: 'en', format: 'json' });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return res.status(502).json({ error: 'Location search is temporarily unavailable.' });
    const payload = await response.json();
    const results = sanitizeGeoResults(payload.results || []);
    res.json({ results });
  } catch {
    res.status(502).json({ error: 'Location search is temporarily unavailable.' });
  }
});
export default router;
