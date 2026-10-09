import jwt from 'jsonwebtoken';
import School from '../models/School.js';
import { config } from '../config.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
    const payload = jwt.verify(token, config.jwtSecret);
    const school = await School.findById(payload.sub).select('-passwordHash');
    if (!school) return res.status(401).json({ error: 'The principal account was not found.' });
    req.school = school;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session expired. Sign in again.' });
  }
}
