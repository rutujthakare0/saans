import { Router } from 'express';
import School from '../models/School.js';
import Decision from '../models/Decision.js';
import { publicRateLimit } from '../middleware/publicRateLimit.js';

const router = Router();
const schoolDate = timezone => new Date().toLocaleDateString('en-CA', { timeZone: timezone || 'Asia/Kolkata' });
export function publicDecision(decision, school, date) {
  return {
    state: 'sent', schoolName: school.name, date, publicForecastUrl: `/forecast?school=${encodeURIComponent(school.slug)}`,
    headline: decision.action === 'cancel_outdoor' ? 'Outdoor activities cancelled today' : 'Outdoor activities limited today',
    action: decision.action, category: decision.category, aqi: decision.aqi,
    bestWindow: decision.bestWindow, notice: decision.notice, sentAt: decision.approvedAt,
    checkedAt: decision.checkedAt, dataLabel: decision.dataLabel
  };
}
router.get('/:slug/today', publicRateLimit, async (req, res) => {
  const school = await School.findOne({ slug: req.params.slug }).select('name timezone');
  if (!school) return res.status(404).json({ error: 'School page not found.' });
  const date = schoolDate(school.timezone);
  const decision = await Decision.findOne({ schoolId: school._id, date, status: 'sent', action: { $ne: 'normal' } }).sort({ approvedAt: -1 });
  if (decision) return res.json(publicDecision(decision, school, date));
  const todayDecision = await Decision.findOne({ schoolId: school._id, date }).select('status checkedAt');
  if (todayDecision?.status === 'proposed') return res.json({ state: 'pending', schoolName: school.name, publicForecastUrl: `/forecast?school=${encodeURIComponent(school.slug)}` });
  const latest = await Decision.findOne({ schoolId: school._id }).sort({ checkedAt: -1 }).select('checkedAt date');
  const lastCheckedAt = latest?.checkedAt || null;
  const stale = !lastCheckedAt || latest.date !== date || Date.now() - new Date(lastCheckedAt).getTime() > 24 * 60 * 60 * 1000;
  res.json({ state: stale ? 'stale' : 'none', schoolName: school.name, lastCheckedAt, publicForecastUrl: `/forecast?school=${encodeURIComponent(school.slug)}` });
});
export default router;
