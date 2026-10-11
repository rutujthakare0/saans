import { aqi } from './naqi.js';

const percentile95 = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(0.95 * sorted.length) - 1];
};
export function leaderboardWindowStart(now = new Date(), days = 30) {
  const current = new Date(`${now.toLocaleDateString('en-CA', { timeZone:'Asia/Kolkata' })}T00:00:00+05:30`);
  current.setDate(current.getDate() - (days - 1));
  return current.toLocaleDateString('en-CA', { timeZone:'Asia/Kolkata' });
}

export function breachAt(decision) {
  for (const hour of decision.hourly || []) {
    try {
      if (aqi(Number(hour.pm25), Number(hour.pm10)) > 300) return new Date(`${decision.date}T${hour.time}:00+05:30`);
    } catch { /* Ignore malformed historical readings. */ }
  }
  return null;
}

export function summarizeSchool(school, decisions, now = new Date(), days = 30) {
  const since = leaderboardWindowStart(now, days);
  const recent = decisions.filter(item => item.schoolId.toString() === school._id.toString() && item.date >= since);
  const incidentRows = recent.map(decision => ({ decision, breach: breachAt(decision) })).filter(row => row.breach);
  const responses = incidentRows.map(({ decision, breach }) => {
    const publishedAt = decision.deliveries?.find(item => item.status === 'sent' && item.sentAt)?.sentAt || decision.approvedAt;
    return publishedAt && decision.status === 'sent' ? Math.max(0, (new Date(publishedAt) - breach) / 60_000) : null;
  });
  const minutes = responses.filter(value => value != null);
  const last = incidentRows.at(-1);
  return {
    school_id: school._id.toString(), name: school.name, slug: school.slug,
    breaches: incidentRows.length,
    mean_minutes: minutes.length ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length * 10) / 10 : null,
    p95_minutes: percentile95(minutes) == null ? null : Math.round(percentile95(minutes) * 10) / 10, escalations: null,
    last_incident_at: last?.breach?.toISOString() || null,
    last_incident_minutes: last ? (responses[incidentRows.length - 1] == null ? null : Math.max(0, Math.round(responses[incidentRows.length - 1]))) : null,
    last_incident_notice_missing: Boolean(last && responses[incidentRows.length - 1] == null)
  };
}
