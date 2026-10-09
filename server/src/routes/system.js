import { Router } from 'express';
import Decision from '../models/Decision.js';
import Parent from '../models/Parent.js';
import SystemState from '../models/SystemState.js';
import { config } from '../config.js';

const router = Router();
router.get('/status', async (req, res) => {
  const [latest, state, parents, sentDecisions] = await Promise.all([
    Decision.findOne({ schoolId: req.school._id }).sort({ checkedAt: -1 }).select('source fetchedAt checkedAt dataLabel wordingSource modelId deliveries'),
    SystemState.findOne({ key: 'main' }),
    Parent.countDocuments({ schoolId: req.school._id, active: true }),
    Decision.find({ schoolId: req.school._id, status: 'sent' }).select('deliveries')
  ]);
  const deliveries = sentDecisions.flatMap(decision => decision.deliveries || []);
  res.json({
    data: { provider: latest?.source === 'live' || (!latest && config.forecastProvider === 'live') ? 'Open-Meteo live' : 'Open-Meteo saved replay', label: latest?.dataLabel || 'Not fetched yet', fetchedAt: latest?.fetchedAt || null, checkedAt: latest?.checkedAt || null },
    wording: { engine: latest?.wordingSource === 'bedrock' ? 'Amazon Nova 2 Lite' : 'Fixed template', modelId: latest?.modelId || null },
    policy: 'Deterministic code',
    scheduler: config.schedulerProvider,
    lastDailyRunAt: state?.lastDailyRunAt || null,
    dailySummary: state?.dailySummary || null,
    delivery: { provider: config.notifyProvider, parentsConfigured: parents, sent: deliveries.filter(item => item.status === 'sent').length, failed: deliveries.filter(item => item.status === 'failed').length, preview: deliveries.filter(item => item.status === 'preview').length },
    hosting: config.hostingProvider
  });
});
export default router;
