import { Router } from 'express';
import Decision from '../models/Decision.js';
import Parent from '../models/Parent.js';
import { config } from '../config.js';
import { sendNotice } from '../services/dispatch.js';
import { sendParentReminder } from '../services/dispatch.js';
import { runPipeline } from '../services/pipeline.js';
import Acknowledgement from '../models/Acknowledgement.js';
import { acknowledgementSummary, reminderBlockReason, remindableParentIds } from '../services/acknowledgements.js';

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
  res.json({ ...decision.toObject(), ackSummary: decision.status === 'sent' && decision.action !== 'normal' ? await acknowledgementSummary(decision, req.school._id) : null });
});
router.get('/', async (req, res) => {
  const decisions = await Decision.find({ schoolId: req.school._id }).sort({ date: -1, createdAt: -1 }).limit(60);
  res.json(await Promise.all(decisions.map(async decision => ({ ...decision.toObject(), ackSummary: decision.status === 'sent' && decision.action !== 'normal' ? await acknowledgementSummary(decision, req.school._id) : null }))));
});
router.get('/:id/summary', async (req, res) => {
  const decision = await Decision.findOne({ _id: req.params.id, schoolId: req.school._id });
  if (!decision) return res.status(404).json({ error: 'Decision not found.' });
  res.json(await acknowledgementSummary(decision, req.school._id));
});
router.post('/:id/approve', async (req, res) => {
  const candidate = await Decision.findOne({ _id: req.params.id, schoolId: req.school._id, status: 'proposed', action: { $ne: 'normal' } });
  if (!candidate) {
    const existing = await Decision.findOne({ _id: req.params.id, schoolId: req.school._id });
    if (!existing) return res.status(404).json({ error: 'Decision not found.' });
    return res.status(409).json({ error: existing.status === 'no_action' ? 'There is no notice to approve on a no-action day.' : 'This notice has already been approved or cannot be approved.' });
  }
  const parentLine = String(req.body.parentLine || '').trim();
  if (parentLine.length > 300) return res.status(400).json({ error: 'The parent note must be 300 characters or fewer.' });
  const notice = candidate.notice?.toObject ? candidate.notice.toObject() : { ...candidate.notice };
  if (parentLine) { notice.en = `${notice.en}\n\n${parentLine}`; notice.hi = `${notice.hi}\n\n${parentLine}`; }
  const parents = await Parent.find({ schoolId: req.school._id, active: true });
  const pending = parents.map(parent => ({ parentId: parent._id, channel: config.notifyProvider === 'ses' ? 'email' : 'preview', status: 'failed', error: 'Dispatch was interrupted; retry delivery.', sentAt: null }));
  const decision = await Decision.findOneAndUpdate({ _id: req.params.id, schoolId: req.school._id, status: 'proposed' }, { $set: {
    status: 'sent', approvedBy: 'principal', approvedAt: new Date(), ruleId: null, ruleWords: null, deliveries: pending, parentLine, notice
  } }, { new: true });
  if (!decision) {
    const existing = await Decision.findOne({ _id: req.params.id, schoolId: req.school._id });
    if (!existing) return res.status(404).json({ error: 'Decision not found.' });
    return res.status(409).json({ error: existing.status === 'no_action' ? 'There is no notice to approve on a no-action day.' : 'This notice has already been approved.' });
  }
  const deliveries = await sendNotice(decision, req.school, parents);
  decision.deliveries = deliveries;
  await decision.save();
  res.json({ ...decision.toObject(), ackSummary: await acknowledgementSummary(decision, req.school._id) });
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
  res.json({ ...decision.toObject(), ackSummary: await acknowledgementSummary(decision, req.school._id) });
});

router.post('/:id/remind', async (req, res) => {
  const decision = await Decision.findOne({ _id: req.params.id, schoolId: req.school._id, status: 'sent', action: { $ne: 'normal' } });
  if (!decision) return res.status(404).json({ error: 'Sent notice not found.' });
  const recentCutoff = new Date(Date.now() - 30 * 60_000);
  const blocked = reminderBlockReason(decision.reminders || []);
  if (blocked === 'limit') return res.status(429).json({ error: 'The two reminder limit for this notice has been reached.' });
  if (blocked === 'cooldown') return res.status(429).json({ error: 'Wait 30 minutes between reminders.' });
  const acked = await Acknowledgement.find({ decisionId: decision._id }).distinct('parentId');
  const pendingIds = remindableParentIds(decision.deliveries || [], acked);
  if (!pendingIds.length) return res.status(409).json({ error: 'No delivered, unacknowledged parent notices need a reminder.' });
  const now = new Date();
  const reserved = await Decision.findOneAndUpdate({ _id: decision._id, status: 'sent', 'reminders.1': { $exists: false }, reminders: { $not: { $elemMatch: { sentAt: { $gt: recentCutoff } } } } }, { $push: { reminders: { sentAt: now, parentIds: pendingIds, results: [] } } }, { new: true });
  if (!reserved) return res.status(429).json({ error: 'A reminder was sent recently or the limit has been reached.' });
  const school = req.school;
  const parents = await Parent.find({ _id: { $in: pendingIds }, schoolId: school._id, active: true, status: 'active' });
  const results = [];
  for (const parent of parents) results.push({ parentId: parent._id, channel: 'email', ...(await sendParentReminder(decision, school, parent)) });
  reserved.reminders[reserved.reminders.length - 1].results = results;
  await reserved.save();
  res.json({ ...reserved.toObject(), ackSummary: await acknowledgementSummary(reserved, req.school._id) });
});

export default router;
