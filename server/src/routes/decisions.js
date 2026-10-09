import { Router } from 'express';
import Decision from '../models/Decision.js';
import Parent from '../models/Parent.js';
import { config } from '../config.js';
import { sendNotice } from '../services/dispatch.js';
import { runPipeline } from '../services/pipeline.js';

const router = Router();
router.get('/today', async (req, res) => {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: req.school.timezone });
  const source = config.forecastProvider;
  let decision = await Decision.findOne({ schoolId: req.school._id, date, source });
  if (!decision) {
    try { decision = await runPipeline(req.school, { date }); }
    catch (error) {
      console.error('Today forecast unavailable:', error.message);
      return res.status(503).json({ error: 'Forecast unavailable. Try again.' });
    }
  }
  res.json(decision);
});
router.get('/', async (req, res) => {
  const decisions = await Decision.find({ schoolId: req.school._id }).sort({ date: -1, createdAt: -1 }).limit(60);
  res.json(decisions);
});
router.post('/:id/approve', async (req, res) => {
  const parents = await Parent.find({ schoolId: req.school._id, active: true });
  const pending = parents.map(parent => ({ parentId: parent._id, channel: config.notifyProvider === 'ses' ? 'email' : 'preview', status: 'failed', error: 'Dispatch was interrupted; retry delivery.', sentAt: null }));
  const decision = await Decision.findOneAndUpdate({ _id: req.params.id, schoolId: req.school._id, status: 'proposed' }, { $set: {
    status: 'sent', approvedBy: 'principal', approvedAt: new Date(), ruleId: null, ruleWords: null, deliveries: pending
  } }, { new: true });
  if (!decision) {
    const existing = await Decision.findOne({ _id: req.params.id, schoolId: req.school._id });
    if (!existing) return res.status(404).json({ error: 'Decision not found.' });
    return res.status(409).json({ error: existing.status === 'no_action' ? 'There is no notice to approve on a no-action day.' : 'This notice has already been approved.' });
  }
  const deliveries = await sendNotice(decision, req.school, parents);
  decision.deliveries = deliveries;
  await decision.save();
  res.json(decision);
});
router.post('/:id/resend', async (req, res) => {
  const decision = await Decision.findOne({ _id: req.params.id, schoolId: req.school._id, status: 'sent', action: { $ne: 'normal' } });
  if (!decision) return res.status(404).json({ error: 'Sent notice not found.' });
  const failedIds = decision.deliveries.filter(item => item.status === 'failed').map(item => String(item.parentId));
  if (!failedIds.length) return res.json(decision);
  const parents = await Parent.find({ schoolId: req.school._id, active: true, _id: { $in: failedIds } });
  const retries = await sendNotice(decision, req.school, parents, { onlyParentIds: failedIds });
  const byId = new Map(retries.map(item => [String(item.parentId), item]));
  decision.deliveries = decision.deliveries.map(item => byId.get(String(item.parentId)) || item);
  await decision.save();
  res.json(decision);
});

export default router;
