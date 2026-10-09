import { config } from '../config.js';
import School from '../models/School.js';
import Decision from '../models/Decision.js';
import StandingRule from '../models/StandingRule.js';
import { getForecast } from './forecast.js';
import { aqi, category } from './naqi.js';
import { bestOutdoorWindow } from './window.js';
import { actionForCategory, ruleMatches } from './policy.js';
import { createNotice } from './notice.js';

export async function runPipeline(school, { source, mode = 'bad', date = new Date().toLocaleDateString('en-CA', { timeZone: school.timezone || 'Asia/Kolkata' }), force = false } = {}) {
  const actualSource = source || config.forecastProvider;
  const forecast = await getForecast(school, { source: actualSource, mode, date });
  const readings = forecast.hours.filter(h => h.time >= school.schoolStart && h.time < school.schoolEnd);
  if (!readings.length) throw new Error('The forecast has no readings inside the school day.');
  const mean25 = readings.reduce((sum, hour) => sum + hour.pm25, 0) / readings.length;
  const mean10 = readings.reduce((sum, hour) => sum + hour.pm10, 0) / readings.length;
  const index = aqi(mean25, mean10), band = category(index);
  const bestWindow = bestOutdoorWindow(readings);
  const reasons = [`School-hours estimate uses ${readings.length} hourly forecast readings.`, `Mean PM2.5 ${Math.round(mean25)} µg/m³; mean PM10 ${Math.round(mean10)} µg/m³.`];
  const action = actionForCategory(band);
  const existing = await Decision.findOne({ schoolId: school._id, date, source: forecast.source });
  if (existing && !force) return existing;
  const schoolDayStart = new Date(`${date}T00:00:00+05:30`);
  const schoolDayEnd = new Date(`${date}T23:59:59.999+05:30`);
  const rule = await StandingRule.find({ schoolId: school._id, active: true, expiresAt: { $gte: schoolDayStart } }).sort({ createdAt: -1 });
  const matchingRule = rule.find(item => ruleMatches(item, band, schoolDayEnd));
  const finalAction = matchingRule?.action || action;
  const facts = { schoolName: school.name, aqi: index, category: band, action: finalAction, bestWindow };
  const notice = await createNotice(facts);
  const decision = {
    schoolId: school._id, date, source: forecast.source, replayMode: forecast.source === 'replay' ? mode : undefined,
    aqi: index, category: band, action: finalAction, bestWindow, reasons, notice,
    hourly: readings.map(({ time, pm25, pm10 }) => ({ time, pm25, pm10 })),
    status: matchingRule ? 'sent' : 'proposed', approvedBy: matchingRule ? 'standing_rule' : null,
    approvedAt: matchingRule ? new Date() : null, ruleId: matchingRule?._id || null
  };
  if (existing) { Object.assign(existing, decision); return existing.save(); }
  return Decision.create(decision);
}
export async function runDailyJob() {
  const schools = await School.find();
  const results = await Promise.allSettled(schools.map(school => runPipeline(school)));
  return { processed: schools.length, succeeded: results.filter(r => r.status === 'fulfilled').length, failures: results.filter(r => r.status === 'rejected').map(r => r.reason.message) };
}
