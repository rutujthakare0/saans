import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import DecisionCard from '../components/DecisionCard.jsx';
import NoticePreview from '../components/NoticePreview.jsx';
import RuleModal from '../components/RuleModal.jsx';
import History from '../components/History.jsx';
import ReplayPanel from '../components/ReplayPanel.jsx';

export default function Dashboard({ onSignOut }) {
  const [decision, setDecision] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [rules, setRules] = useState([]);
  const [parents, setParents] = useState({ count: 0, parents: [] });
  const [mode, setMode] = useState('severe');
  const [busy, setBusy] = useState(false);
  const [ruleBusy, setRuleBusy] = useState(false);
  const [error, setError] = useState('');
  const [ruleModal, setRuleModal] = useState(false);
  const [history, setHistory] = useState(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeLanguage, setNoticeLanguage] = useState('en');
  const [system, setSystem] = useState(null);
  const [systemOpen, setSystemOpen] = useState(false);
  const refresh = useCallback(async () => {
    setError('');
    try { setDecision(await api('/decisions/today')); }
    catch (e) { setError(e.message); if (e.message.includes('session') || e.message.includes('Sign in')) onSignOut(); }
  }, [onSignOut]);
  const refreshSideData = useCallback(() => {
    api('/auth/me').then(setPrincipal).catch(() => {});
    api('/rules').then(setRules).catch(() => {});
    api('/parents').then(setParents).catch(() => {});
  }, []);
  useEffect(() => { refresh(); refreshSideData(); }, [refresh, refreshSideData]);
  async function approve() { setBusy(true); try { setDecision(await api(`/decisions/${decision._id}/approve`, { method: 'POST', body: '{}' })); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function resend() { setBusy(true); try { setDecision(await api(`/decisions/${decision._id}/resend`, { method: 'POST', body: '{}' })); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function replay() { setBusy(true); setError(''); try { setDecision(await api('/replay/run', { method: 'POST', body: JSON.stringify({ mode }) })); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function saveRule(values) { setRuleBusy(true); try { await api('/rules', { method: 'POST', body: JSON.stringify(values) }); setRules(await api('/rules')); setRuleModal(false); setError('Standing rule saved. Replay a matching day to see it act automatically.'); } catch (e) { setError(e.message); } finally { setRuleBusy(false); } }
  async function showHistory() { try { const [decisions, nextRules] = await Promise.all([api('/decisions'), api('/rules')]); setHistory({ decisions, rules: nextRules }); } catch (e) { setError(e.message); } }
  async function revokeRule(id) { try { await api(`/rules/${id}`, { method: 'DELETE' }); const next = rules.map(r => r._id === id ? { ...r, active: false } : r); setRules(next); setHistory(h => ({ ...h, rules: next })); } catch (e) { setError(e.message); } }
  async function resetDemo() { if (!window.confirm('Delete saved replay decisions and standing rules for this demo school?')) return; setBusy(true); try { await api('/demo/reset', { method: 'POST', body: '{}' }); setRules(await api('/rules')); await refresh(); setError('Demo replay history and standing rules cleared.'); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function openSystem() { try { setSystem(await api('/system/status')); setSystemOpen(true); } catch (e) { setError(e.message); } }
  if (!decision) return <main className="loading-page"><div className="brand-mark">सा</div><p>{error || 'Loading your school air brief…'}</p>{error && <button className="approve-button" onClick={refresh}>Try again</button>}</main>;
  const today = new Date(`${decision.date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  const activeRule = rules.find(rule => rule.active);
  return <div className="shell">
    <aside className="rail"><a className="brand" href="/"><span className="brand-mark">सा</span><span>saans<span className="brand-dot">.</span></span></a><div className="rail-label">WORKSPACE</div><button className="nav-item active"><span>▦</span> Morning desk</button><button className="nav-item" onClick={showHistory}><span>↻</span> Decision history</button><button className="nav-item" onClick={openSystem}><span>ⓘ</span> System status</button><div className="rail-bottom"><div className="school-mini"><span className="school-icon">S</span><div><b>{principal?.name || 'Meera Sharma'}</b><small>{principal?.schoolName || decision.school?.name}</small></div><button className="signout-button" onClick={onSignOut} title="Sign out">↗</button></div><div className="version">AIR ACTION DESK <span>v1.1</span></div></div></aside>
    <main className="main"><header className="topbar"><div className="crumb">Workspace <span>/</span> Morning desk</div><div className="top-actions"><span className="live-pill"><i/> {decision.source === 'live' ? 'LIVE FORECAST' : 'SAVED REPLAY'}</span><button className="avatar" onClick={onSignOut} title="Sign out">{(principal?.name || 'P')[0]}</button></div></header>
      <section className="content"><div className="greeting-row"><div><div className="eyebrow">{today}{decision.source === 'replay' && <span className="date-replay"> · REPLAY DAY</span>}</div><h1>Good morning, {principal?.name?.split(' ')[0] || 'Principal'}.</h1><p className="subhead">Here’s your school’s air action brief for today.</p></div><button className="icon-button" onClick={refresh} title="Refresh decision">↻</button></div>
        {error && <div className="toast-inline" role="status">{error}<button onClick={() => setError('')}>×</button></div>}
        <DecisionCard decision={decision} schoolName={principal?.schoolName}/><div className="lower-grid"><NoticePreview decision={decision} parentCount={parents.count} onApprove={approve} onResend={resend} onOpen={language => { setNoticeLanguage(language || 'en'); setNoticeOpen(true); }} busy={busy}/>
          <article className="rule-card"><div className="section-head"><div><div className="eyebrow">SET IT ONCE</div><h3>Standing rule</h3></div><span className="rule-symbol">⌁</span></div>{activeRule ? <><p className="rule-desc"><b>Active until {new Date(activeRule.expiresAt).toLocaleDateString()}</b><br/>{activeRule.principalWords}</p><button className="rule-button" onClick={showHistory}>Manage standing rules →</button></> : <><p className="rule-desc">Set a matching threshold for automatic action on future high-pollution days.</p><button className="rule-button" onClick={() => setRuleModal(true)}>＋ Create a standing rule</button></>}<div className="rule-foot">Rules use only the action tied to their threshold and expire on your chosen date.</div></article>
        </div>
        <div className="parent-contact-summary"><div><b>{parents.count} parent contacts configured</b><span>Masked contact details are visible to school staff only.</span></div><details><summary>View contacts</summary><ul>{parents.parents.map(parent => <li key={parent._id}>{parent.name} · {parent.email} · {parent.language}</li>)}</ul></details></div>
        <ReplayPanel mode={mode} setMode={setMode} onRun={replay} onReset={resetDemo} busy={busy}/><footer><span>SAANS · SCHOOL AIR ACTION DESK</span><span>Planning estimate only. Not a health advisory.</span></footer>
      </section>
    </main>
    <RuleModal open={ruleModal} onClose={() => setRuleModal(false)} onSave={saveRule} busy={ruleBusy}/>
    <History items={history} onClose={() => setHistory(null)} onRevoke={revokeRule}/>
    {noticeOpen && <div className="modal"><div className="modal-backdrop" onClick={() => setNoticeOpen(false)}/><section className="modal-panel notice-panel"><button className="modal-close" onClick={() => setNoticeOpen(false)}>×</button><div className="eyebrow">FAMILY UPDATE PREVIEW</div><h2>Today’s parent notice</h2><div className="preview-language"><button className={`lang ${noticeLanguage === 'en' ? 'active' : ''}`} onClick={() => setNoticeLanguage('en')}>English</button><button className={`lang ${noticeLanguage === 'hi' ? 'active' : ''}`} onClick={() => setNoticeLanguage('hi')}>हिन्दी</button></div><div className="large-notice" lang={noticeLanguage}>{decision.notice?.[noticeLanguage] || 'No parent notice is needed for this day.'}</div><p className="preview-foot">{decision.status === 'sent' ? 'Approval recorded. Delivery results are shown on the dashboard.' : 'Approving sends this notice to configured parent contacts.'}</p><button className="approve-button" disabled={decision.status === 'sent' || decision.status === 'no_action' || busy} onClick={approve}>{decision.status === 'sent' ? 'Approved ✓' : decision.status === 'no_action' ? 'No action required' : 'Approve notice →'}</button></section></div>}
    {systemOpen && system && <div className="modal"><div className="modal-backdrop" onClick={() => setSystemOpen(false)}/><section className="modal-panel system-panel"><button className="modal-close" onClick={() => setSystemOpen(false)}>×</button><div className="eyebrow">TRANSPARENCY</div><h2>System status</h2><div className="status-grid">{Object.entries({ 'Forecast source': `${system.data.provider} · ${system.data.label}`, 'Last data fetch': system.data.fetchedAt ? new Date(system.data.fetchedAt).toLocaleString() : 'Not fetched', 'Action policy': system.policy, 'Notice wording': system.wording.engine, 'Daily scheduler': system.scheduler, 'Last daily run': system.lastDailyRunAt ? new Date(system.lastDailyRunAt).toLocaleString() : 'Not run yet', 'Delivery': `${system.delivery.provider} · ${system.delivery.sent} sent · ${system.delivery.failed} failed · ${system.delivery.preview} preview`, 'Configured parents': system.delivery.parentsConfigured, 'Hosting': system.hosting }).map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>{system.dailySummary && <p>Last run: {system.dailySummary.succeeded}/{system.dailySummary.processed} schools processed; {system.dailySummary.failures.length} errors.</p>}</section></div>}
  </div>;
}
