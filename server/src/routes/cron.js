import { Router } from 'express';
import { requireCronSecret } from '../middleware/cronSecret.js';
import { runDailyJob } from '../services/pipeline.js';

const router = Router();
router.post('/daily', requireCronSecret, async (_req, res) => res.json(await runDailyJob()));
export default router;
