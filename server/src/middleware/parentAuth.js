import jwt from 'jsonwebtoken';
import Parent from '../models/Parent.js';
import { config } from '../config.js';
import { hasRole } from './auth.js';

export async function requireParent(req, res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Parent sign in required.' });
    const payload = jwt.verify(token, config.jwtSecret);
    if (!hasRole(payload, 'parent')) return res.status(403).json({ error: 'Parent access required.' });
    const parent = await Parent.findOne({ _id: payload.sub, active: true, status: 'active' });
    if (!parent) return res.status(401).json({ error: 'Your parent account is not active.' });
    req.parent = parent;
    next();
  } catch {
    return res.status(401).json({ error: 'Your parent session expired. Sign in again.' });
  }
}
