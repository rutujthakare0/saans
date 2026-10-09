import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import decisionRoutes from './routes/decisions.js';
import ruleRoutes from './routes/rules.js';
import replayRoutes from './routes/replay.js';
import cronRoutes from './routes/cron.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ok: ready, service: 'saans', database: ready ? 'connected' : 'unavailable', forecast: config.forecastProvider });
});
app.use('/api/auth', authRoutes);
app.use('/api/decisions', requireAuth, decisionRoutes);
app.use('/api/rules', requireAuth, ruleRoutes);
app.use('/api/replay', requireAuth, replayRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, config.clientDist);
app.use(express.static(dist));
app.get('*splat', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || 'Unexpected server error.' });
});
export default app;
