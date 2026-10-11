import { useEffect, useState } from 'react';

const band = value => value <= 50 ? 'Good' : value <= 100 ? 'Satisfactory' : value <= 200 ? 'Moderate' : value <= 300 ? 'Poor' : value <= 400 ? 'Very Poor' : 'Severe';
const bandClass = value => band(value).toLowerCase().replace(' ', '-');

export default function Forecast() {
  const params = new URLSearchParams(location.search);
  const lat = params.get('lat'), lon = params.get('lon'), school = params.get('school');
  const [data, setData] = useState(null), [error, setError] = useState(''), [selectedHour, setSelectedHour] = useState(null);
  useEffect(() => {
    fetch(`/api/forecast?${school?`school=${encodeURIComponent(school)}`:`lat=${encodeURIComponent(lat||'28.6139')}&lon=${encodeURIComponent(lon||'77.209')}`}`)
      .then(response => response.json().then(body => { if (!response.ok) throw new Error(body.error || 'Forecast unavailable.'); return body; }))
      .then(setData).catch(error => setError(error.message));
  }, [lat, lon, school]);
  const morning = data?.morning_summary;
  const csv = data && 'time,pm25,pm10,aqi,category\n' + data.hours.map(hour => `${hour.at},${hour.pm25},${hour.pm10},${hour.aqi},${hour.category}`).join('\n');
  return <main className="public-page"><article className="public-card forecast-page">
    <a href="/">← Saans</a><p className="eyebrow">MODELLED FORECAST · OPEN-METEO</p><h1>Tomorrow’s air</h1>
    {error ? <p className="forecast-unavailable">Forecast unavailable. <a href="https://air-quality-api.open-meteo.com/">Open-Meteo source</a></p> : !data ? <p>Loading forecast…</p> : <>
      <h2>{morning ? new Date(`${morning.date}T12:00:00`).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' }) : 'Tomorrow morning'}</h2>
      {morning ? <><p className={`forecast-pill ${bandClass(morning.aqi)}`}>AQI {morning.aqi} · {morning.category}</p><p>{morning.note} Morning check at 06:00 IST will confirm.</p></> : <p>Tomorrow morning forecast unavailable.</p>}
      <h3>24-hour timeline</h3><div className="forecast-timeline" aria-label="Hourly AQI forecast">{data.hours.map(hour => <button type="button" aria-label={`${hour.at}: AQI ${hour.aqi}, ${hour.category}`} aria-pressed={selectedHour?.at === hour.at} key={hour.at} className={`forecast-hour ${bandClass(hour.aqi)}`} onClick={() => setSelectedHour(hour)}><span>{new Date(hour.at).getHours().toString().padStart(2, '0')}</span></button>)}</div>
      {selectedHour && <p className="forecast-selected"><b>{new Date(selectedHour.at).toLocaleString('en-IN', { timeZone:'Asia/Kolkata', weekday:'short', hour:'2-digit', minute:'2-digit' })}</b> · AQI {selectedHour.aqi} ({selectedHour.category}) · PM2.5 {selectedHour.pm25} µg/m³ · PM10 {selectedHour.pm10} µg/m³</p>}
      <h3>Week ahead · 06:00 IST</h3><ul>{data.week_ahead.map(day => <li key={day.date}>{day.date}: AQI {day.morning_aqi} · {day.category}</li>)}</ul>
      <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="saans-forecast.csv">Download forecast CSV</a>
    </>}
    <small>Forecast data: <a href="https://open-meteo.com/en/docs/air-quality-api">Open-Meteo Air Quality API</a>, based on CAMS. Regional estimates are not school sensors or health advice.</small>
  </article></main>;
}
