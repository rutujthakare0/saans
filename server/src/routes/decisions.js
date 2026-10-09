import { Router } from 'express';
import Decision from '../models/Decision.js';
import { previewDispatch } from '../services/dispatch.js';
import { runPipeline } from '../services/pipeline.js';

const router = Router();
router.get('/today', async (req, res) => {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: req.school.timezone });
  let decision = await Decision.findOne({ schoolId: req.school._id, date, source: process.env.FORECAST_PROVIDER || 'replay' });
  if (!decision) decision = await runPipeline(req.school, { date });
  res.json(decision);
});
router.get('/', async (req, res) => {
  const decisions = await Decision.find({ schoolId: req.school._id }).sort({ date: -1, createdAt: -1 }).limit(60);
  res.json(decisions);
});
router.post('/:id/approve', async (req, res) => {
  const decision = await Decision.findOne({ _id: req.params.id, schoolId: req.school._id });
  if (!decision) return res.status(404).json({ error: 'Decision not found.' });
  if (decision.status === 'sent') return res.status(409).json({ error: 'This notice has already been approved.' });
  const dispatched = previewDispatch(decision);
  decision.status = dispatched.status;
  decision.approvedAt = dispatched.approvedAt;
  decision.approvedBy = 'principal';
  await decision.save();
  res.json(decision);
});
export default router;
