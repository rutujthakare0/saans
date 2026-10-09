import { config } from '../config.js';

export function requireCronSecret(req, res, next) {
  if (!config.cronSecret || req.get('x-cron-secret') !== config.cronSecret) return res.status(401).json({ error: 'Invalid cron secret.' });
  next();
}
