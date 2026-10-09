import { useState } from 'react';
import { api, tokenStore } from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('principal@saans.demo');
  const [password, setPassword] = useState('schoolair');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); tokenStore.set(result.token); onLogin(result.token); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><section className="login-card"><a className="brand login-brand" href="/"><span className="brand-mark">सा</span><span>saans<span className="brand-dot">.</span></span></a><div className="eyebrow">SCHOOL AIR ACTION DESK</div><h1>Good mornings<br />start with a clear plan.</h1><p>Sign in to review your school's air brief and decide what happens next.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <div className="login-error">{error}</div>}<button className="approve-button login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span>→</span></button></form><div className="demo-login"><b>DEMO ACCOUNT</b><span>principal@saans.demo</span><span>schoolair</span></div><small className="login-disclaimer">Planning estimate only · not a health advisory</small></section><aside className="login-art"><span className="login-sun">☼</span><div className="login-art-copy"><div className="eyebrow">A CALMER SCHOOL MORNING</div><h2>One clear decision<br />for every school day.</h2><p>Forecast → Recommendation → Approval → Family notice</p></div><div className="login-cloud">PM₂.₅ &nbsp; · &nbsp; PM₁₀ &nbsp; · &nbsp; hourly forecast</div></aside></main>;
}
