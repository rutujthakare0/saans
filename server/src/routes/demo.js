import { Router } from 'express';
import Decision from '../models/Decision.js';
import StandingRule from '../models/StandingRule.js';
import { config } from '../config.js';

const router = Router();
router.post('/reset', async (req, res) => {
  if (!config.demoMode) return res.status(403).json({ error: 'Demo reset is disabled.' });
  const [decisions, rules] = await Promise.all([
    Decision.deleteMany({ schoolId: req.school._id, source: 'replay' }),
    StandingRule.deleteMany({ schoolId: req.school._id })
  ]);
  res.json({ ok: true, replayDecisionsDeleted: decisions.deletedCount, rulesDeleted: rules.deletedCount });
});
export default router;
