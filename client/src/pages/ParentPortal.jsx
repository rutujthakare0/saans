import { useCallback, useEffect, useState } from 'react';
import { parentApi, parentTokenStore } from '../api.js';

export function ParentLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await parentApi('/login', { method: 'POST', body: JSON.stringify({ email, password }) }); parentTokenStore.set(result.token); window.location.assign('/parent'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="family-page"><section className="family-card"><Brand/><div className="eyebrow">PARENT PORTAL</div><h1>School air updates</h1><p>Sign in to read school notices and acknowledge that you’ve seen them.</p><form onSubmit={submit}><label>Email<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></label>{error && <p className="family-error">{error}</p>}<button className="approve-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form><a href="/" className="family-link">Principal sign in</a></section></main>;
}

export function ParentJoin() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [invite, setInvite] = useState(null), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/parent/invite/${encodeURIComponent(token)}`).then(async res => { const body = await res.json(); if (!res.ok) throw new Error(body.error); return body; }).then(setInvite).catch(e => setError(e.message)); }, [token]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await parentApi('/activate', { method: 'POST', body: JSON.stringify({ token, password }) }); parentTokenStore.set(result.token); window.location.assign('/parent'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="family-page"><section className="family-card"><Brand schoolName={invite?.schoolName}/><div className="eyebrow">PARENT INVITATION</div><h1>Activate your account</h1>{invite ? <><p>Welcome, {invite.parentName}. Choose a password to view and acknowledge school notices.</p><form onSubmit={submit}><label>Password (at least 8 characters)<input type="password" minLength="8" maxLength="128" required value={password} onChange={e => setPassword(e.target.value)}/></label>{error && <p className="family-error">{error}</p>}<button className="approve-button" disabled={busy}>{busy ? 'Activating…' : 'Activate account'}</button></form></> : error ? <p className="family-error">{error}</p> : <p>Checking your one-time invite…</p>}</section></main>;
}

export default function ParentPortal() {
  const [profile, setProfile] = useState(null), [data, setData] = useState(null), [language, setLanguage] = useState('en'), [error, setError] = useState(''), [busyId, setBusyId] = useState('');
  const refresh = useCallback(async () => {
    try { const [me, notices] = await Promise.all([parentApi('/me'), parentApi('/notices')]); setProfile(me); setData(notices); if (me.language === 'hi') setLanguage('hi'); }
    catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function acknowledge(id) {
    setBusyId(id); setError('');
    try { await parentApi(`/notices/${id}/acknowledge`, { method: 'POST', body: '{}' }); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusyId(''); }
  }
  function signOut() { parentTokenStore.clear(); window.location.assign('/parent/login'); }
  if (error.includes('session') && !data) return <main className="family-page"><section className="family-card"><Brand/><h1>Please sign in again</h1><p>{error}</p><a className="approve-button family-button-link" href="/parent/login">Parent sign in</a></section></main>;
  if (!data) return <main className="family-page"><section className="family-card"><Brand/><p>{error || 'Loading school updates…'}</p></section></main>;
  const todayNotice = data.todayNotice || data.notices.find(item => String(item._id) === String(data.todayStatus.decisionId));
  const hi = language === 'hi';
  return <main className="family-page"><section className="family-card family-portal"><header className="family-header"><Brand schoolName={profile?.schoolName}/><button className="family-signout" onClick={signOut}>Sign out</button></header>
    <div className="family-welcome"><div className="eyebrow">{hi ? 'अभिभावक पोर्टल' : 'PARENT PORTAL'}</div><h1>{hi ? `नमस्ते, ${profile?.name || ''}` : `Hello, ${profile?.name || 'Parent'}`}</h1>{profile?.childName && <p>{profile.childName}{profile.className ? ` · ${profile.className}` : ''}</p>}</div>
    <div className="public-toggle"><button className={!hi ? 'active' : ''} onClick={() => setLanguage('en')}>English</button><button className={hi ? 'active' : ''} onClick={() => setLanguage('hi')}>हिन्दी</button></div>
    <section className="family-today"><div className="eyebrow">{hi ? 'आज की स्कूल अपडेट' : 'TODAY’S SCHOOL UPDATE'}</div>
      {todayNotice ? <Notice notice={todayNotice} language={language} busy={busyId === String(todayNotice._id)} onAcknowledge={() => acknowledge(todayNotice._id)}/> : data.todayStatus.state === 'sent' ? <><h2>Today’s notice could not be loaded</h2><p>The school has posted a notice. Refresh the page to load it.</p><button className="family-ack-button" onClick={() => window.location.reload()}>Refresh notice</button></> : data.todayStatus.state === 'none' ? <><h2>{hi ? 'आज बाहरी गतिविधियों पर कोई पाबंदी नहीं है' : 'No outdoor restrictions announced today'}</h2><p>{hi ? 'स्कूल ने आज की जाँच पूरी कर ली है।' : 'The school checked today; no outdoor restrictions were announced.'}</p></> : <><h2>{hi ? 'आज कोई नया अपडेट पोस्ट नहीं हुआ है' : 'No new update has been posted today'}</h2><p>{hi ? 'यदि स्कूल कोई सूचना जारी करेगा, तो वह यहाँ दिखाई देगी।' : 'A school notice will appear here if one is issued.'}</p></>}
    </section>
    {error && <p className="family-error">{error}</p>}
    <section className="family-history"><div className="eyebrow">{hi ? 'पिछले अपडेट' : 'RECENT NOTICES'}</div>{data.notices.filter(item => item._id !== todayNotice?._id).length ? data.notices.filter(item => item._id !== todayNotice?._id).map(item => <Notice key={item._id} notice={item} language={language} busy={busyId === String(item._id)} onAcknowledge={() => acknowledge(item._id)}/>) : <p className="family-muted">{hi ? 'अभी कोई पुराना नोटिस नहीं है।' : 'No earlier notices.'}</p>}</section>
    <footer className="family-footer">{hi ? 'मॉडल पर आधारित अनुमान; स्वास्थ्य सलाह नहीं।' : 'Modelled air-quality estimate; not a health advisory.'}</footer>
  </section></main>;
}

function Notice({ notice, language, busy, onAcknowledge }) {
  const hi = language === 'hi';
  const cancel = notice.action === 'cancel_outdoor';
  return <article className="family-notice"><h2>{hi ? (cancel ? 'आज बाहरी गतिविधियाँ रद्द हैं' : 'आज बाहरी गतिविधियाँ सीमित हैं') : cancel ? 'Outdoor activities cancelled today' : 'Outdoor activities limited today'}</h2>
    <div className="family-window">{cancel ? (hi ? 'आज बाहरी समय नहीं होगा।' : 'No outdoor time today.') : notice.bestWindow ? <>{hi ? 'खुले में गतिविधि केवल ' : 'Outdoor activity only between '}<b>{notice.bestWindow.start}–{notice.bestWindow.end}</b>{hi ? ' के बीच।' : '.'}</> : (hi ? 'आज कोई उपयुक्त बाहरी समय नहीं है।' : 'No outdoor time today.')}</div>
    <p className="family-copy" lang={language}>{notice.notice?.[language] || notice.notice?.en}</p><p className="family-why">{hi ? `अनुमानित स्कूल-समय वायु गुणवत्ता: ${notice.category} (AQI ~${notice.aqi})।` : `Estimated school-hours air quality: ${notice.category} (AQI ~${notice.aqi}). Modelled estimate, not a health advisory.`}</p>
    {notice.acknowledgedAt ? <div className="family-acknowledged">✓ {hi ? `पढ़ने की पुष्टि ${new Intl.DateTimeFormat('hi-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(new Date(notice.acknowledgedAt))} IST पर की गई` : `Acknowledged at ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(new Date(notice.acknowledgedAt))} IST`}</div> : <button className="family-ack-button" disabled={busy} onClick={onAcknowledge}>{busy ? (hi ? 'सहेज रहे हैं…' : 'Saving…') : hi ? 'मैंने यह पढ़ लिया है' : 'I’ve read this'}</button>}
    <small className="family-sent">{new Date(notice.sentAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {notice.dataLabel}</small>
  </article>;
}

function Brand({ schoolName }) { return <div className="public-brand"><span className="brand-mark">सा</span><div><b>saans</b>{schoolName && <small>{schoolName}</small>}</div></div>; }
