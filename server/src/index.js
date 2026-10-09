import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config.js';
import { startDailyJob } from './jobs/daily.js';

try {
  await mongoose.connect(config.mongoUri);
  console.info('Connected to MongoDB.');
  if (config.enableLocalCron) startDailyJob();
  app.listen(config.port, () => console.info(`Saans API listening on http://localhost:${config.port}`));
} catch (error) {
  console.error('Saans could not start:', error.message);
  process.exitCode = 1;
}
