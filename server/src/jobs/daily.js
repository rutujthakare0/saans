import cron from 'node-cron';
import { config } from '../config.js';
import { runDailyJob } from '../services/pipeline.js';

export function startDailyJob() {
  if (!cron.validate(config.dailyCron)) throw new Error(`Invalid DAILY_CRON expression: ${config.dailyCron}`);
  return cron.schedule(config.dailyCron, async () => {
    try { console.info('Daily Saans job:', await runDailyJob()); }
    catch (error) { console.error('Daily Saans job failed:', error); }
  }, { timezone: 'Asia/Kolkata' });
}
