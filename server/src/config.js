import 'dotenv/config';

if (process.env.NODE_ENV === 'production') {
  for (const key of ['JWT_SECRET', 'CRON_SECRET']) {
    if (!process.env[key] || process.env[key].startsWith('replace-')) throw new Error(`${key} must be set to a strong value in production.`);
  }
}

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saans',
  jwtSecret: process.env.JWT_SECRET || 'local-demo-secret-change-before-deploy',
  cronSecret: process.env.CRON_SECRET || '',
  school: {
    name: process.env.SCHOOL_NAME || 'Saans Demo School',
    lat: Number(process.env.SCHOOL_LAT || 28.6139),
    lng: Number(process.env.SCHOOL_LNG || 77.209),
    schoolStart: process.env.SCHOOL_START || '08:00',
    schoolEnd: process.env.SCHOOL_END || '14:00'
  },
  forecastProvider: process.env.FORECAST_PROVIDER || 'live',
  enableLocalCron: process.env.ENABLE_LOCAL_CRON !== 'false',
  clientDist: process.env.CLIENT_DIST || '../../client/dist',
  demoPrincipal: process.env.DEMO_PRINCIPAL || 'principal@saans.demo',
  demoPassword: process.env.DEMO_PASSWORD || 'schoolair',
  notifyProvider: process.env.NOTIFY_PROVIDER || 'preview',
  sesSender: process.env.SES_SENDER || '',
  sesRegion: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
  sesSendDelayMs: Number(process.env.SES_SEND_DELAY_MS || 1100),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5173',
  demoMode: process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production',
  schedulerProvider: process.env.SCHEDULER_PROVIDER || (process.env.ENABLE_LOCAL_CRON === 'false' ? 'EventBridge' : 'Local cron'),
  hostingProvider: process.env.HOSTING_PROVIDER || (process.env.NODE_ENV === 'production' ? 'Container hosting' : 'Local development')
};

if (!['live', 'replay'].includes(config.forecastProvider)) throw new Error('FORECAST_PROVIDER must be live or replay.');
if (!['preview', 'ses'].includes(config.notifyProvider)) throw new Error('NOTIFY_PROVIDER must be preview or ses.');
