const PM25 = [[0,30,0,50],[31,60,51,100],[61,90,101,200],[91,120,201,300],[121,250,301,400],[251,500,401,500]];
const PM10 = [[0,50,0,50],[51,100,51,100],[101,250,101,200],[251,350,201,300],[351,430,301,400],[431,600,401,500]];
function subIndex(value, table) {
  if (!Number.isFinite(value) || value < 0) return null;
  const row = table.find(([, high]) => value <= high);
  if (!row) return 500;
  const [low, high, indexLow, indexHigh] = row;
  return Math.round(indexLow + ((indexHigh - indexLow) / (high - low)) * (value - low));
}
function firstBreach(decision) {
  if (!decision?.date || !Array.isArray(decision.hourly)) return null;
  const rows = decision.hourly.map(hour => {
    const index = Math.max(subIndex(Number(hour.pm25), PM25) ?? -1, subIndex(Number(hour.pm10), PM10) ?? -1);
    return { index, time: hour.time };
  }).filter(row => row.index > 300 && /^\d{2}:\d{2}$/.test(row.time)).sort((a, b) => a.time.localeCompare(b.time));
  return rows.length ? new Date(`${decision.date}T${rows[0].time}:00+05:30`).getTime() : null;
}

export function minutesFromBreachToNotice(decision, now = Date.now()) {
  const start = firstBreach(decision);
  const sentAt = (decision.deliveries || [])
    .filter(delivery => delivery.status === 'sent' && delivery.sentAt)
    .map(delivery => new Date(delivery.sentAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  const noticeTime = sentAt ?? (decision.approvedAt ? new Date(decision.approvedAt).getTime() : null);
  const end = noticeTime ?? (decision.status === 'proposed' ? now : null);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 60_000);
}

export function breachNoticeState(decision) {
  return decision?.status === 'sent' ? 'recorded' : decision?.status === 'proposed' ? 'awaiting approval' : 'not available';
}
