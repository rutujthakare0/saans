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
  forecastProvider: process.env.FORECAST_PROVIDER || 'replay',
  llmProvider: process.env.LLM_PROVIDER || 'mock',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'us.amazon.nova-2-lite-v1:0',
  dailyCron: process.env.DAILY_CRON || '0 6 * * *',
  enableLocalCron: process.env.ENABLE_LOCAL_CRON !== 'false',
  clientDist: process.env.CLIENT_DIST || '../../client/dist',
  demoPrincipal: process.env.DEMO_PRINCIPAL || 'principal@saans.demo',
  demoPassword: process.env.DEMO_PASSWORD || 'schoolair'
};
