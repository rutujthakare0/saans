import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Parent from '../models/Parent.js';
import School from '../models/School.js';
import Decision from '../models/Decision.js';
import Acknowledgement from '../models/Acknowledgement.js';
import { config } from '../config.js';
import { authRateLimit } from '../middleware/publicRateLimit.js';
import { requireParent } from '../middleware/parentAuth.js';
import { hashInviteToken } from '../services/invites.js';

const router = Router();
const todayAt = school => new Date().toLocaleDateString('en-CA', { timeZone: school.timezone || 'Asia/Kolkata' });
export function combineCurrentAndRecentNotices(todayNotice, previousNotices) {
  return [...(todayNotice ? [todayNotice] : []), ...previousNotices.slice(0, 5)];
}
function schoolDayBounds(date) {
  const start = new Date(`${date}T00:00:00+05:30`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

router.get('/invite/:token', async (req, res) => {
  const token = String(req.params.token || '');
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ error: 'This invitation link is invalid or expired.' });
  const parent = await Parent.findOne({ inviteTokenHash: hashInviteToken(token), inviteExpiresAt: { $gt: new Date() }, status: 'invited' }).populate('schoolId', 'name');
  if (!parent) return res.status(400).json({ error: 'This invitation link is invalid or expired.' });
  res.json({ parentName: parent.name, schoolName: parent.schoolId.name, expiresAt: parent.inviteExpiresAt });
});

router.post('/activate', authRateLimit, async (req, res) => {
  const token = String(req.body.token || ''), password = String(req.body.password || '');
  if (!/^[a-f0-9]{64}$/i.test(token) || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Use a valid invitation and a password of at least 8 characters.' });
  const passwordHash = await bcrypt.hash(password, 12);
  const parent = await Parent.findOneAndUpdate({ inviteTokenHash: hashInviteToken(token), inviteExpiresAt: { $gt: new Date() }, status: 'invited', passwordHash: null }, { $set: { passwordHash, status: 'active', active: true, inviteTokenHash: null, inviteExpiresAt: null } }, { new: true });
  if (!parent) return res.status(400).json({ error: 'This invitation link is invalid or expired.' });
  const jwtToken = jwt.sign({ sub: parent._id.toString(), role: 'parent' }, config.jwtSecret, { expiresIn: '12h' });
  res.json({ token: jwtToken, parent: { name: parent.name, email: parent.email } });
});

router.post('/login', authRateLimit, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const parent = await Parent.findOne({ email, active: true, status: 'active' });
  if (!parent?.passwordHash || !(await bcrypt.compare(String(req.body.password || ''), parent.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  parent.lastLoginAt = new Date();
  await parent.save();
  const token = jwt.sign({ sub: parent._id.toString(), role: 'parent' }, config.jwtSecret, { expiresIn: '12h' });
  res.json({ token, parent: { name: parent.name, email: parent.email } });
});

router.get('/me', requireParent, async (req, res) => {
  const school = await School.findById(req.parent.schoolId).select('name timezone');
  res.json({ name: req.parent.name, email: req.parent.email, language: req.parent.language, childName: req.parent.childName, className: req.parent.className, schoolName: school?.name });
});

router.get('/notices', requireParent, async (req, res) => {
  const school = await School.findById(req.parent.schoolId).select('name timezone');
  if (!school) return res.status(404).json({ error: 'School not found.' });
  const today = todayAt(school);
  const { start: schoolDayStart, end: schoolDayEnd } = schoolDayBounds(today);
  const noticeFields = 'date action category aqi bestWindow notice approvedAt checkedAt dataLabel';
  const [todayDecision, previousDecisions] = await Promise.all([
    Decision.findOne({ schoolId: school._id, status: 'sent', action: { $ne: 'normal' }, $or: [
      { date: today }, { approvedAt: { $gte: schoolDayStart, $lt: schoolDayEnd } }
    ] }).sort({ approvedAt: -1 }).select(noticeFields),
    Decision.find({ schoolId: school._id, status: 'sent', action: { $ne: 'normal' }, approvedAt: { $lt: schoolDayStart } }).sort({ approvedAt: -1 }).limit(5).select(noticeFields)
  ]);
  const decisions = combineCurrentAndRecentNotices(todayDecision, previousDecisions);
  const todayCheck = todayDecision ? null : await Decision.findOne({ schoolId: school._id, date: today }).select('status checkedAt');
  const acknowledgements = await Acknowledgement.find({ decisionId: { $in: decisions.map(item => item._id) }, parentId: req.parent._id }).select('decisionId acknowledgedAt');
  const byDecision = new Map(acknowledgements.map(item => [String(item.decisionId), item.acknowledgedAt]));
  const todayStatus = todayDecision ? { state: 'sent', decisionId: todayDecision._id } : todayCheck?.status === 'no_action' ? { state: 'none', checkedAt: todayCheck.checkedAt } : { state: 'unannounced' };
  const notices = decisions.map(item => ({ _id: item._id, date: item.date, action: item.action, category: item.category, aqi: item.aqi, bestWindow: item.bestWindow, notice: item.notice, sentAt: item.approvedAt, dataLabel: item.dataLabel, acknowledgedAt: byDecision.get(String(item._id)) || null }));
  const todayNotice = todayDecision ? notices.find(item => String(item._id) === String(todayDecision._id)) : null;
  res.json({ today, schoolName: school.name, todayStatus, todayNotice, notices });
});

router.post('/notices/:decisionId/acknowledge', requireParent, async (req, res) => {
  const decision = await Decision.findOne({ _id: req.params.decisionId, schoolId: req.parent.schoolId, status: 'sent', action: { $ne: 'normal' } }).select('_id');
  if (!decision) return res.status(404).json({ error: 'Sent notice not found.' });
  let acknowledgement;
  try {
    acknowledgement = await Acknowledgement.findOneAndUpdate({ decisionId: decision._id, parentId: req.parent._id }, { $setOnInsert: { schoolId: req.parent.schoolId, decisionId: decision._id, parentId: req.parent._id, acknowledgedAt: new Date() } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    acknowledgement = await Acknowledgement.findOne({ decisionId: decision._id, parentId: req.parent._id });
  }
  res.json({ acknowledgedAt: acknowledgement.acknowledgedAt });
});

export default router;
