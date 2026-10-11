import { useEffect, useState } from 'react';
import { api, teacherTokenStore } from '../api.js';

const isTeacher = token => {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'teacher'; }
  catch { return false; }
};

export default function TeacherPage() {
  const [token, setToken] = useState(teacherTokenStore.get());
  const [today, setToday] = useState(null);
  const [name, setName] = useState('');
  const [schoolSlug, setSchoolSlug] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inviteToken = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/teacher/invite/${encodeURIComponent(inviteToken)}`).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'This invite is unavailable.');
      return result;
    }).then(setInvite).catch(e => setError(e.message));
  }, [inviteToken]);

  useEffect(() => {
    if (!token || !isTeacher(token) || inviteToken) return undefined;
    const load = () => api('/teacher/today').then(setToday).catch(e => { setError(e.message); teacherTokenStore.clear(); setToken(null); });
    load(); const timer = setInterval(load, 300000); return () => clearInterval(timer);
  }, [token, inviteToken]);

  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api('/teacher/login', { method: 'POST', body: JSON.stringify({ name, schoolSlug, password }) });
      teacherTokenStore.set(result.token); setToken(result.token); setPassword('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function activate(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api('/teacher/activate', { method: 'POST', body: JSON.stringify({ token: inviteToken, password }) });
      teacherTokenStore.set(result.token); setToken(result.token); setPassword(''); history.replaceState({}, '', '/teacher');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function confirm(action) {
    setBusy(true); setError('');
    try { await api('/teacher/confirm', { method: 'POST', body: JSON.stringify({ action }) }); setToday(await api('/teacher/today')); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function refreshToday() {
    setError('');
    try { setToday(await api('/teacher/today')); } catch (e) { setError(e.message); }
  }

  function signOut() { teacherTokenStore.clear(); setToken(null); setToday(null); }

  const signedIn = token && isTeacher(token) && !inviteToken;
  return <main className="public-page"><article className="public-card teacher-page">
    <a href="/">← Saans</a><p className="eyebrow">TEACHER ACTION DESK</p>
    <h1>{today?.schoolName || invite?.schoolName || 'Teacher sign in'}</h1>
    {inviteToken ? invite ? <form onSubmit={activate}>
      <p>Welcome, {invite.name}. Set a password to activate your teacher account.</p>
      <label>Password (at least 8 characters)<input type="password" minLength="8" required value={password} onChange={event => setPassword(event.target.value)}/></label>
      <button className="approve-button" disabled={busy}>{busy ? 'Activating…' : 'Activate teacher account'}</button>
    </form> : !error ? <p>Checking your one-time teacher invite…</p> : null
      : !signedIn ? <>
        <p>Sign in to view today’s checklist and confirm completed actions.</p>
        <div className="settings-note">First time here? Ask your principal for a one-time invite link. Open it to activate your account and set a password; then return here to sign in.</div>
        <form onSubmit={login}>
          <label>School page slug<input required value={schoolSlug} onChange={event => setSchoolSlug(event.target.value)} placeholder="your-school-slug" autoComplete="organization"/></label>
          <label>Teacher name<input required value={name} onChange={event => setName(event.target.value)} autoComplete="username"/></label>
          <label>Password<input type="password" required value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password"/></label>
          <button className="approve-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to teacher tasks'}</button>
        </form>
      </> : today ? <>
        <p>{today.date} · AQI {today.aqi ?? '—'} · {today.level}</p>
        <p>Confirm each action after it is completed. Your confirmations are recorded for the principal.</p>
        {today.actions.map(item => <div className="teacher-action" key={item.id}><span>{item.text}</span>{item.confirmation ? <b>Confirmed {new Date(item.confirmation.confirmedAt).toLocaleTimeString()}</b> : <button className="approve-button" disabled={busy} onClick={() => confirm(item.id)}>Mark done</button>}</div>)}
        {today.lastConfirmed && <small>Last confirmed at {new Date(today.lastConfirmed.confirmedAt).toLocaleTimeString()} by you.</small>}
        <div className="settings-actions"><button className="text-button" onClick={refreshToday}>Refresh tasks</button><button className="text-button" onClick={signOut}>Sign out</button></div>
      </> : <p>Loading today’s action list…</p>}
    {error && <p className="family-error" role="alert">{error}</p>}
  </article></main>;
}
