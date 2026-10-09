import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import School from '../models/School.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const school = await School.findOne({ email });
  if (!school || !(await bcrypt.compare(String(req.body.password || ''), school.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const token = jwt.sign({ sub: school._id.toString() }, config.jwtSecret, { expiresIn: '12h' });
  res.json({ token, principal: { name: school.principalName, email: school.email, schoolName: school.name } });
});
router.get('/me', requireAuth, (req, res) => res.json({ name: req.school.principalName, email: req.school.email, schoolName: req.school.name }));
export default router;
