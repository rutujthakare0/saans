import { useEffect, useState } from 'react';
import { api } from '../api.js';

export function TomorrowCard({ school }) {
  const [forecast, setForecast] = useState(null);
  useEffect(() => {
    if (!school?.lat) return;
    fetch(`/api/forecast?lat=${school.lat}&lon=${school.lng}`).then(response => response.ok ? response.json() : null).then(setForecast).catch(() => {});
  }, [school?.lat, school?.lng]);
  const morning = forecast?.morning_summary;
  return <article className="rule-card"><div className="eyebrow">NEXT MORNING</div><h3>Tomorrow</h3>{morning ? <p><b className={`forecast-pill ${morning.category.toLowerCase().replace(' ', '-')}`}>AQI {morning.aqi} · {morning.category}</b></p> : <p>Forecast unavailable</p>}<a href={`/forecast?lat=${school.lat}&lon=${school.lng}`}>View 24-hour forecast →</a><p className="rule-foot">Modelled estimate. 06:00 check will confirm.</p></article>;
}

export function PrincipalActivity() {
  const [confirmations, setConfirmations] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const load = () => api('/teacher/confirmations').then(setConfirmations).catch(e => setError(e.message));
    load(); const timer = setInterval(load, 60000); return () => clearInterval(timer);
  }, []);
  return <div className="feature-columns"><article className="rule-card"><div className="eyebrow">TEACHER FOLLOW-THROUGH</div><h3>{confirmations?.count ?? 0}/4 actions confirmed today</h3>{confirmations?.confirmations.map((row, index) => <div className="activity-row" key={`${row.confirmedAt}-${index}`}><b>{row.actionText}</b><small>{row.teacher} · {new Date(row.confirmedAt).toLocaleTimeString()}</small></div>)}<a href="/teacher">Open teacher task sign-in →</a>{error && <small>{error}</small>}</article></div>;
}
