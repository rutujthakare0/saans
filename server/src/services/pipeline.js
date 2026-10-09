import { config } from '../config.js';
import School from '../models/School.js';
import Parent from '../models/Parent.js';
import Decision from '../models/Decision.js';
import StandingRule from '../models/StandingRule.js';
import SystemState from '../models/SystemState.js';
import { getForecast } from './forecast.js';
import { aqi, category } from './naqi.js';
import { bestOutdoorWindow } from './window.js';
import { actionForCategory, ruleCoversCategory, ruleMatches } from './policy.js';
import { createNotice } from './notice.js';
import { sendNotice } from './dispatch.js';

function dayBounds(date) {
  return { start: new Date(`${date}T00:00:00+05:30`), end: new Date(`${date}T23:59:59.999+05:30`) };
}

async function reserveAndDispatch(decision, school, rule) {
  const parents = await Parent.find({ schoolId: school._id, active: true });
  const initialDeliveries = parents.map(parent => ({
    parentId: parent._id,
    channel: config.notifyProvider === 'ses' ? 'email' : 'preview',
    status: 'failed', error: 'Dispatch was interrupted; retry delivery.', sentAt: null
  }));
  const sent = await Decision.findOneAndUpdate({ _id: decision._id, status: 'proposed' }, { $set: {
    status: 'sent', approvedAt: new Date(), approvedBy: rule ? 'standing_rule' : 'principal',
    ruleId: rule?._id || null, ruleWords: rule?.principalWords || null, deliveries: initialDeliveries
  } }, { new: true });
  if (!sent) return null;
  const deliveries = await sendNotice(sent, school, parents);
  return Decision.findOneAndUpdate({ _id: sent._id, status: 'sent' }, { $set: { deliveries } }, { new: true });
}

export async function runPipeline(school, { source, mode = 'severe', date = new Date().toLocaleDateString('en-CA', { timeZone: school.timezone || 'Asia/Kolkata' }), force = false } = {}) {
  const actualSource = source || config.forecastProvider;
  const forecast = await getForecast(school, { source: actualSource, mode, date });
  const readings = forecast.hours;
  const mean25 = readings.reduce((sum, hour) => sum + hour.pm25, 0) / readings.length;
  const mean10 = readings.reduce((sum, hour) => sum + hour.pm10, 0) / readings.length;
  const index = aqi(mean25, mean10), band = category(index);
  const action = actionForCategory(band);
  const bestWindow = action === 'limit_outdoor' ? bestOutdoorWindow(readings, 200) : null;
  const reasons = [`School-hours estimate uses ${readings.length} hourly forecast readings.`, `Mean PM2.5 ${Math.round(mean25)} µg/m³; mean PM10 ${Math.round(mean10)} µg/m³.`];
  const existing = await Decision.findOne({ schoolId: school._id, date, source: forecast.source });
  if (existing && !force) return existing;
  const bounds = dayBounds(date);
  const rules = await StandingRule.find({ schoolId: school._id, active: true, expiresAt: { $gte: bounds.start } }).sort({ createdAt: -1 });
  const categoryRule = rules.find(rule => ruleCoversCategory(rule, band, bounds.end));
  const matchingRule = rules.find(rule => ruleMatches(rule, band, action, bounds.end));
  if (categoryRule && !matchingRule) reasons.push(`Your standing rule covers ${categoryRule.action} only.`);

  const wording = action === 'normal' ? { notice: undefined, wordingSource: 'template', modelId: null } : await createNotice({ schoolName: school.name, aqi: index, category: band, action, bestWindow });
  const record = {
    schoolId: school._id, date, source: forecast.source, replayMode: forecast.source === 'replay' ? mode : undefined,
    aqi: index, category: band, action, bestWindow, reasons, notice: wording.notice,
    wordingSource: wording.wordingSource, modelId: wording.modelId,
    fetchedAt: forecast.fetchedAt, checkedAt: new Date(), dataLabel: forecast.dataLabel,
    hourly: readings.map(({ time, pm25, pm10 }) => ({ time, pm25, pm10 })),
    status: action === 'normal' ? 'no_action' : 'proposed', approvedBy: null, approvedAt: null, ruleId: null, ruleWords: null, deliveries: []
  };
  let decision;
  if (existing) { Object.assign(existing, record); decision = await existing.save(); }
  else decision = await Decision.create(record);
  if (matchingRule && action !== 'normal' && decision.status === 'proposed') {
    return await reserveAndDispatch(decision, school, matchingRule) || decision;
  }
  return decision;
}

export async function runDailyJob() {
  const schools = await School.find();
  const results = await Promise.allSettled(schools.map(school => runPipeline(school)));
  const succeeded = results.filter(result => result.status === 'fulfilled');
  const failures = results.filter(result => result.status === 'rejected').map(result => result.reason.message);
  const ids = succeeded.map(result => result.value._id);
  const decisions = ids.length ? await Decision.find({ _id: { $in: ids } }) : [];
  const deliveries = decisions.flatMap(decision => decision.deliveries || []);
  const summary = { processed: schools.length, succeeded: succeeded.length, failures, emailsSent: deliveries.filter(item => item.status === 'sent').length, previews: deliveries.filter(item => item.status === 'preview').length };
  await SystemState.findOneAndUpdate({ key: 'main' }, { $set: { lastDailyRunAt: new Date(), dailySummary: summary } }, { upsert: true, new: true });
  return summary;
}
