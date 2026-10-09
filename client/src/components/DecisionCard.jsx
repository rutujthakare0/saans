export default function DecisionCard({ decision, schoolName, onRemind, remindBusy }) {
  const categoryClass = decision.category.toLowerCase().replaceAll(' ', '-');
  const actionCopy = decision.action === 'normal'
    ? ['No change needed', 'Air is within the planning threshold. Outdoor activities can continue as planned.']
    : decision.action === 'cancel_outdoor'
    ? ['Cancel outdoor activities', 'Keep assembly, PE and other outdoor activities indoors today.']
    : ['Limit outdoor activities', decision.bestWindow
      ? `Schedule necessary outdoor activity only between ${decision.bestWindow.start} and ${decision.bestWindow.end}. Keep it brief.`
      : 'No suitable outdoor window is available today. Keep activities indoors.'];
  const readings = decision.hourly || [];
  const mean = key => readings.length ? Math.round(readings.reduce((sum, item) => sum + item[key], 0) / readings.length) : '—';
  return <div className="decision-grid">
    <article className="air-card" data-category={categoryClass}>
      <div className="card-top"><span className="status-tag"><i/> TODAY'S AIR BRIEF</span><span className="source-chip">{decision.source === 'replay' ? 'SAVED REPLAY' : 'LIVE FORECAST'}</span></div>
      <div className="air-main"><div><div className="air-label">SCHOOL-HOURS AQI ESTIMATE</div><div className="aqi-line"><strong>{decision.aqi}</strong><span className={`category ${categoryClass}`}>{decision.category}</span></div><p className="reading-note">Modelled estimate · {schoolName || 'Your school'}</p><p className="data-provenance">{decision.dataLabel || 'Provenance unavailable'}</p></div><div className="air-orb"><span>◉</span></div></div>
      <div className="meter"><div className="meter-fill" style={{ width: `${Math.min(98, Math.max(2, decision.aqi / 500 * 100))}%` }}/></div><div className="meter-scale"><span>Good</span><span>Moderate</span><span>Poor</span><span>Severe</span></div><div className="air-divider"/>
      <div className="metric-row"><div><span>PM2.5</span><b>{mean('pm25')} <small>µg/m³</small></b></div><div><span>PM10</span><b>{mean('pm10')} <small>µg/m³</small></b></div><div><span>Readings</span><b>{readings.length} <small>hourly</small></b></div></div>
      <div className="source-note">ⓘ Open-Meteo model forecast; not a playground sensor.</div>
    </article>
    <article className="action-card"><div className="action-header"><div><div className="eyebrow">RECOMMENDED ACTION</div><h2>{actionCopy[0]}</h2></div><span className="action-icon">✳</span></div><p className="action-copy">{actionCopy[1]}</p>
      {decision.action === 'limit_outdoor' && decision.bestWindow && <div className="window-box"><span className="window-icon">◷</span><div><small>BEST AVAILABLE 2-HOUR WINDOW · AQI ≤ 200</small><b>{decision.bestWindow.start}–{decision.bestWindow.end} · AQI {decision.bestWindow.aqi}</b></div></div>}
      <div className="action-footer"><div className="reasons"><span className="check">✓</span><span>{decision.reasons?.[0] || 'Based on school hours'}</span></div></div>
      {decision.status === 'sent' && decision.ackSummary && <div className="decision-ack"><div className="ack-heading"><b>{decision.ackSummary.acknowledged} of {decision.ackSummary.parentCount} acknowledged</b><span>{decision.ackSummary.failedDeliveryCount} failed delivery</span></div><div className="ack-progress"><i style={{ width: `${decision.ackSummary.parentCount ? decision.ackSummary.acknowledged / decision.ackSummary.parentCount * 100 : 0}%` }}/></div>{decision.ackSummary.pending.length > 0 && <><ul className="ack-pending">{decision.ackSummary.pending.map(parent => <li key={parent.parentId}>{parent.name} · {parent.language} · {parent.deliveryStatus}</li>)}</ul><button className="text-button" disabled={remindBusy || !decision.ackSummary.remindableCount} onClick={onRemind}>{remindBusy ? 'Sending reminders…' : `Remind pending parents (${decision.ackSummary.remindableCount})`}</button>{decision.ackSummary.reminderCount > 0 && <small className="reminder-limit">{decision.ackSummary.reminderCount}/2 reminders sent{decision.ackSummary.lastReminderAt ? ` · last ${new Date(decision.ackSummary.lastReminderAt).toLocaleTimeString()}` : ''}</small>}</>}</div>}
    </article>
  </div>;
}
