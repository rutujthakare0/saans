import jwt from 'jsonwebtoken';
import School from '../models/School.js';
import { config } from '../config.js';

export const hasRole = (payload, role) => payload?.role === role;
export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
    const payload = jwt.verify(token, config.jwtSecret);
    if (!hasRole(payload, 'principal')) return res.status(403).json({ error: 'Principal access required.' });
    const school = await School.findById(payload.sub).select('-passwordHash');
    if (!school) return res.status(401).json({ error: 'The principal account was not found.' });
    req.school = school;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session expired. Sign in again.' });
  }
}

export const requirePrincipal = requireAuth;
