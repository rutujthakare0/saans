import { Router } from 'express';
import Decision from '../models/Decision.js';
import { runPipeline } from '../services/pipeline.js';

const router = Router();
router.post('/run', async (req, res) => {
  const modes = ['severe', 'limit', 'clean'];
  const mode = modes.includes(req.body.mode) ? req.body.mode : 'severe';
  const latest = await Decision.findOne({ schoolId: req.school._id, source: 'replay' }).sort({ date: -1 });
  const nextDate = latest ? new Date(`${latest.date}T12:00:00`) : new Date();
  if (latest) nextDate.setDate(nextDate.getDate() + 1);
  const date = nextDate.toLocaleDateString('en-CA', { timeZone: req.school.timezone });
  const decision = await runPipeline(req.school, { source: 'replay', mode, date, force: true });
  res.json(decision);
});
export default router;
