import cron from 'node-cron';
import { runDailyJob } from '../services/pipeline.js';

export function startDailyJob() {
  const expression = '*/15 * * * *';
  if (!cron.validate(expression)) throw new Error(`Invalid scheduler expression: ${expression}`);
  return cron.schedule(expression, async () => {
    try { console.info('Daily Saans job:', await runDailyJob()); }
    catch (error) { console.error('Daily Saans job failed:', error); }
  }, { timezone: 'Asia/Kolkata' });
}
