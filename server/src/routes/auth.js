import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import School from '../models/School.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimit, registerRateLimit } from '../middleware/publicRateLimit.js';
import { defaultNotifyBy, makeSlug, validateSchoolSettings } from '../services/schoolSettings.js';

const router = Router();
router.post('/login', authRateLimit, async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const school = await School.findOne({ email });
  if (!school || !(await bcrypt.compare(String(req.body.password || ''), school.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const token = jwt.sign({ sub: school._id.toString(), role: 'principal' }, config.jwtSecret, { expiresIn: '12h' });
  res.json({ token, principal: { name: school.principalName, email: school.email, schoolName: school.name, configured: Boolean(school.configured) } });
});
router.post('/register', registerRateLimit, async (req, res) => {
  const principalName = String(req.body.principalName || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (principalName.length < 2 || principalName.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Enter a principal name, valid email, and password of at least 8 characters.' });
  const checked = validateSchoolSettings(req.body);
  if (checked.error) return res.status(400).json({ error: checked.error });
  if (await School.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists.' });
  const passwordHash = await bcrypt.hash(password, 12);
  let slug = makeSlug(checked.value.name);
  while (await School.exists({ slug })) slug = makeSlug(checked.value.name, Math.random().toString(36).slice(2, 7));
  const school = await School.create({ ...checked.value, notifyBy: req.body.notifyBy || defaultNotifyBy(checked.value.schoolStart), slug, principalName, email, passwordHash });
  const token = jwt.sign({ sub: school._id.toString(), role: 'principal' }, config.jwtSecret, { expiresIn: '12h' });
  res.status(201).json({ token, principal: { name: school.principalName, email: school.email, schoolName: school.name, configured: true } });
});
router.get('/me', requireAuth, (req, res) => res.json({ name: req.school.principalName, email: req.school.email, schoolName: req.school.name, configured: Boolean(req.school.configured) }));
export default router;
