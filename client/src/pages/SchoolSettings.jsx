import { useEffect, useState } from 'react';
import { api } from '../api.js';

const minusHour = time => { const [h, m] = time.split(':').map(Number); const n = Math.max(0, h * 60 + m - 60); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; };

export function LocationPicker({ location, setLocation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  async function search(event) {
    event.preventDefault(); setSearching(true); setError('');
    try { const result = await api(`/geo/search?q=${encodeURIComponent(query)}`); setResults(result.results); if (!result.results.length) setError('No matching India locations. Try a nearby city name.'); }
    catch (e) { setError(e.message); } finally { setSearching(false); }
  }
  function useCurrent() {
    setError('');
    if (!navigator.geolocation) return setError('This browser does not support location access. Enter coordinates below.');
    navigator.geolocation.getCurrentPosition(position => setLocation({ lat: position.coords.latitude.toFixed(5), lng: position.coords.longitude.toFixed(5), locationLabel: 'Current location, India' }), () => setError('Location permission was unavailable. Enter coordinates manually.'));
  }
  function choose(result) { setLocation({ lat: result.lat, lng: result.lng, locationLabel: [result.name, result.admin1, 'India'].filter(Boolean).join(', ') }); setResults([]); setQuery(''); }
  return <div className="location-picker"><label>Search a locality<input value={query} placeholder="Aundh, Pune" onChange={e => setQuery(e.target.value)}/></label><button type="button" className="rule-button" disabled={searching || query.trim().length < 2} onClick={search}>{searching ? 'Searching…' : 'Search India locations'}</button>{results.length > 0 && <ul className="location-results">{results.map((result, index) => <li key={`${result.name}-${result.lat}-${index}`}><button type="button" onClick={() => choose(result)}>{result.name}{result.admin1 ? `, ${result.admin1}` : ''} <small>{result.lat.toFixed(4)}, {result.lng.toFixed(4)}</small></button></li>)}</ul>}<button type="button" className="text-button current-location" onClick={useCurrent}>Use my current location</button><div className="coordinates-row"><label>Latitude<input type="number" step="any" min="6" max="38" value={location.lat} onChange={e => setLocation(value => ({ ...value, lat: e.target.value, locationLabel: 'Manual coordinates, India' }))}/></label><label>Longitude<input type="number" step="any" min="68" max="98" value={location.lng} onChange={e => setLocation(value => ({ ...value, lng: e.target.value, locationLabel: 'Manual coordinates, India' }))}/></label></div><label>Resolved place name<input maxLength="120" required value={location.locationLabel} onChange={e => setLocation(value => ({ ...value, locationLabel: e.target.value }))}/></label>{location.lat && location.lng && <p className="resolved-location">Selected location: {location.locationLabel} · {location.lat}, {location.lng}</p>}{error && <p className="family-error">{error}</p>}</div>;
}

export default function SchoolSettings({ initialSchool, onSaved, onCancel }) {
  const [form, setForm] = useState({ name: '', lat: '', lng: '', locationLabel: '', schoolStart: '08:00', schoolEnd: '14:00', checkTime: '06:00', notifyBy: '07:00', slug: '', district:'Unspecified district', optedInToLeaderboard:false });
  const [preview, setPreview] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [teacherName,setTeacherName]=useState(''),[teacherPhone,setTeacherPhone]=useState(''),[teacherInvite,setTeacherInvite]=useState('');
  useEffect(() => { if (initialSchool) setForm(value => ({ ...value, ...initialSchool })); }, [initialSchool]);
  function update(key, value) { setForm(current => ({ ...current, [key]: value })); }
  async function runPreview() {
    setBusy(true); setError(''); setPreview(null);
    try { setPreview(await api('/school/preview', { method: 'POST', body: JSON.stringify({ lat: form.lat, lng: form.lng, locationLabel: form.locationLabel, schoolStart: form.schoolStart, schoolEnd: form.schoolEnd }) })); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/school', { method: 'PUT', body: JSON.stringify(form) });
      if (result.warning) setMessage(result.warning);
      else if (result.decision) setMessage('Settings saved. Today’s live reading has been recomputed.');
      onSaved?.(result.school, result.decision, result.warning || result.forecastError);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function inviteTeacher(event){event.preventDefault();setError('');try{const result=await api('/teacher/invite',{method:'POST',body:JSON.stringify({name:teacherName,phone:teacherPhone})});setTeacherInvite(result.invite_url);setTeacherName('');setTeacherPhone('');}catch(e){setError(e.message);}}
  return <section className="settings-page"><div className="eyebrow">SCHOOL SETTINGS</div><h1>{initialSchool?.configured ? 'School profile' : 'Set up your school'}</h1><p>Set the school location and operating hours used to select forecast readings. Timezone is India Standard Time.</p>
    <form className="settings-form" onSubmit={save}><label>School name<input required minLength="2" maxLength="80" value={form.name} onChange={e => update('name', e.target.value)}/></label><LocationPicker location={form} setLocation={setForm}/><div className="settings-note">Open-Meteo is a regional model and cannot distinguish nearby streets. A locality-level location is enough for this planning estimate.</div><label>School page slug<input readOnly value={form.slug || 'Assigned when school is saved'}/></label>
      <div className="coordinates-row"><label>School starts<input type="time" required value={form.schoolStart} onChange={e => setForm(current => ({ ...current, schoolStart: e.target.value, notifyBy: minusHour(e.target.value) }))}/></label><label>School ends<input type="time" required value={form.schoolEnd} onChange={e => update('schoolEnd', e.target.value)}/></label></div>
      <div className="coordinates-row"><label>Daily forecast check<input type="time" required value={form.checkTime} onChange={e => update('checkTime', e.target.value)}/></label><label>Principal reminder if pending<input type="time" required value={form.notifyBy} onChange={e => update('notifyBy', e.target.value)}/></label></div>
      <label>District name<input maxLength="100" value={form.district||''} onChange={e=>update('district',e.target.value)}/></label><label className="leaderboard-optin"><input type="checkbox" checked={Boolean(form.optedInToLeaderboard)} onChange={e=>update('optedInToLeaderboard',e.target.checked)}/> Show this school on the public district leaderboard. School name and response metrics will be public; no principal names or notice text are shared.</label>
      <div className="settings-actions"><button type="button" className="replay-button" disabled={busy || !form.lat || !form.lng} onClick={runPreview}>{busy ? 'Loading…' : 'Preview reading for this location'}</button><button className="approve-button" disabled={busy}>{busy ? 'Saving…' : 'Save school settings'}</button>{onCancel && <button type="button" className="text-button" onClick={onCancel}>Cancel</button>}</div>
    </form>
    {initialSchool?.configured&&<form className="settings-form teacher-invite" onSubmit={inviteTeacher}><h2>Teacher mode</h2><p>Invite a teacher to confirm actions as they happen. The invite link expires in seven days and can be shared out of band.</p><label>Teacher name<input required minLength="2" maxLength="80" value={teacherName} onChange={e=>setTeacherName(e.target.value)}/></label><label>Phone (optional)<input maxLength="30" value={teacherPhone} onChange={e=>setTeacherPhone(e.target.value)}/></label><button className="rule-button">Create one-time invite link</button>{teacherInvite&&<p className="toast-inline"><a href={teacherInvite}>{teacherInvite}</a> <button type="button" onClick={()=>navigator.clipboard?.writeText(teacherInvite)}>Copy</button></p>}</form>}
    {preview && <article className="location-preview"><div className="eyebrow">LIVE LOCATION PREVIEW</div><h3>{preview.locationLabel} · {preview.lat}, {preview.lng}</h3><p><strong>AQI {preview.aqi} · {preview.category}</strong> · {preview.readings} school-hour readings</p><p>PM2.5 {preview.meanPm25} µg/m³ · PM10 {preview.meanPm10} µg/m³ · {preview.action.replaceAll('_', ' ')}</p>{preview.bestWindow && <p>Best window: {preview.bestWindow.start}–{preview.bestWindow.end} · AQI {preview.bestWindow.aqi}</p>}<small>{preview.dataLabel}</small></article>}
    {message && <p className="toast-inline" role="status">{message}</p>}{error && <p className="family-error">{error}</p>}
  </section>;
}
