import { useState } from 'react';
import { api, tokenStore } from '../api.js';
import { LocationPicker } from './SchoolSettings.jsx';

const minusHour = time => { const [h, m] = time.split(':').map(Number); const n = Math.max(0, h * 60 + m - 60); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; };
export default function SchoolRegister() {
  const [form, setForm] = useState({ principalName: '', email: '', password: '', name: '', lat: '28.6139', lng: '77.2090', locationLabel: 'New Delhi, India', schoolStart: '08:00', schoolEnd: '14:00', checkTime: '06:00', notifyBy: '07:00' });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { const result = await api('/auth/register', { method: 'POST', body: JSON.stringify(form) }); tokenStore.set(result.token); window.location.assign('/'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="family-page"><section className="family-card register-card"><div className="public-brand"><span className="brand-mark">सा</span><b>saans</b></div><div className="eyebrow">NEW SCHOOL</div><h1>Create your school workspace</h1><p>Choose a locality in India so the air-quality forecast uses a nearby model grid.</p><form className="settings-form" onSubmit={submit}><label>Principal name<input required minLength="2" maxLength="80" value={form.principalName} onChange={e => setForm({ ...form, principalName: e.target.value })}/></label><label>Principal email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label><label>Password (at least 8 characters)<input required type="password" minLength="8" maxLength="128" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label><label>School name<input required minLength="2" maxLength="80" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><LocationPicker location={form} setLocation={setForm}/><div className="coordinates-row"><label>School starts<input type="time" required value={form.schoolStart} onChange={e => setForm(current => ({ ...current, schoolStart: e.target.value, notifyBy: minusHour(e.target.value) }))}/></label><label>School ends<input type="time" required value={form.schoolEnd} onChange={e => setForm({ ...form, schoolEnd: e.target.value })}/></label></div>{error && <p className="family-error">{error}</p>}<button className="approve-button" disabled={busy}>{busy ? 'Creating…' : 'Create school account'}</button></form><a className="family-link" href="/">Already have a principal account? Sign in</a></section></main>;
}
