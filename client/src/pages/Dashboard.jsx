import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import DecisionCard from '../components/DecisionCard.jsx';
import NoticePreview from '../components/NoticePreview.jsx';
import RuleModal from '../components/RuleModal.jsx';
import History from '../components/History.jsx';
import ReplayPanel from '../components/ReplayPanel.jsx';
import SchoolSettings from './SchoolSettings.jsx';
import ParentsPanel from './ParentsPanel.jsx';
import { minutesFromBreachToNotice } from '../utils/metrics.js';
import { TomorrowCard, PrincipalActivity } from '../components/FeatureCards.jsx';

export default function Dashboard({ onSignOut }) {
  const [school, setSchool] = useState(null), [principal, setPrincipal] = useState(null), [decision, setDecision] = useState(null);
  const [rules, setRules] = useState([]), [parents, setParents] = useState({ count: 0, parents: [] });
  const [mode, setMode] = useState('severe'), [section, setSection] = useState('morning');
  const [busy, setBusy] = useState(false), [ruleBusy, setRuleBusy] = useState(false), [remindBusy, setRemindBusy] = useState(false);
  const [error, setError] = useState(''), [ruleModal, setRuleModal] = useState(false), [history, setHistory] = useState(null);
  const [noticeOpen, setNoticeOpen] = useState(false), [noticeLanguage, setNoticeLanguage] = useState('en');
  const [system, setSystem] = useState(null), [systemOpen, setSystemOpen] = useState(false);

  const refresh = useCallback(async () => {
    setError('');
    try { setDecision(await api('/decisions/today')); }
    catch (e) { setError(e.message); if (e.message.includes('session') || e.message.includes('Principal access')) onSignOut(); }
  }, [onSignOut]);
  const refreshSideData = useCallback(async () => {
    const [me, configuredSchool, nextRules, nextParents] = await Promise.all([api('/auth/me'), api('/school'), api('/rules'), api('/parents')]);
    setPrincipal(me); setSchool(configuredSchool); setRules(nextRules); setParents(nextParents);
    if (!configuredSchool.configured) setSection('settings');
    else await refresh();
  }, [refresh]);
  useEffect(() => { refreshSideData().catch(e => setError(e.message)); }, [refreshSideData]);

  useEffect(() => {
    if (decision?.status !== 'sent' || !decision.ackSummary?.pending?.length) return undefined;
    const id = decision._id;
    const timer = setInterval(() => api(`/decisions/${id}/summary`).then(ackSummary => setDecision(current => current?._id === id ? { ...current, ackSummary } : current)).catch(() => {}), 10_000);
    return () => clearInterval(timer);
  }, [decision?._id, decision?.status, decision?.ackSummary?.pending?.length]);

  async function approve(parentLine = '') { setBusy(true); setError(''); try { setDecision(await api(`/decisions/${decision._id}/approve`, { method: 'POST', body: JSON.stringify({ parentLine }) })); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function resend() { setBusy(true); try { setDecision(await api(`/decisions/${decision._id}/resend`, { method: 'POST', body: '{}' })); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function remindParents() { setRemindBusy(true); setError(''); try { setDecision(await api(`/decisions/${decision._id}/remind`, { method: 'POST', body: '{}' })); } catch (e) { setError(e.message); } finally { setRemindBusy(false); } }
  async function replay() { setBusy(true); setError(''); try { setDecision(await api('/replay/run', { method: 'POST', body: JSON.stringify({ mode }) })); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function saveRule(values) { setRuleBusy(true); try { await api('/rules', { method: 'POST', body: JSON.stringify(values) }); setRules(await api('/rules')); setRuleModal(false); setError('Standing rule saved. Replay a matching day to see it act automatically.'); } catch (e) { setError(e.message); } finally { setRuleBusy(false); } }
  async function showHistory() { try { const [decisions, nextRules, followThrough] = await Promise.all([api('/decisions'), api('/rules'), api('/teacher/confirmations')]); setHistory({ decisions, rules: nextRules, followThrough }); } catch (e) { setError(e.message); } }
  async function revokeRule(id) { try { await api(`/rules/${id}`, { method: 'DELETE' }); const next = rules.map(r => r._id === id ? { ...r, active: false } : r); setRules(next); setHistory(h => ({ ...h, rules: next })); } catch (e) { setError(e.message); } }
  async function resetDemo() { if (!window.confirm('Delete saved replay decisions and standing rules for this demo school?')) return; setBusy(true); try { await api('/demo/reset', { method: 'POST', body: '{}' }); setRules(await api('/rules')); setDecision(null); await refresh(); setError('Demo replay history and standing rules cleared.'); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function openSystem() { try { setSystem(await api('/system/status')); setSystemOpen(true); } catch (e) { setError(e.message); } }
  async function onSchoolSaved(nextSchool, nextDecision, warning) { setSchool(nextSchool); if (nextDecision) setDecision(nextDecision); setSection('morning'); if (!nextDecision) await refresh(); await refreshSideData(); if (warning) setError(warning); }

  if (!school) return <main className="loading-page"><div className="brand-mark">सा</div><p>{error || 'Loading your school workspace…'}</p>{error && <button className="approve-button" onClick={refreshSideData}>Try again</button>}</main>;
  const date = decision?.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const today = new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  const activeRule = rules.find(rule => rule.active);
  return <div className="shell">
    <aside className="rail"><a className="brand" href="/"><span className="brand-mark">सा</span><span>saans<span className="brand-dot">.</span></span></a><div className="rail-label">WORKSPACE</div><button className={`nav-item ${section === 'morning' ? 'active' : ''}`} onClick={() => setSection('morning')}><span>▦</span> Morning desk</button><button className="nav-item" onClick={showHistory}><span>↻</span> Decision history</button><button className={`nav-item ${section === 'parents' ? 'active' : ''}`} onClick={() => setSection('parents')}><span>♧</span> Parents</button><button className={`nav-item ${section === 'settings' ? 'active' : ''}`} onClick={() => setSection('settings')}><span>⚙</span> School settings</button><a className="nav-item nav-link-item" href="/teacher"><span>✓</span> Teacher tasks</a><button className="nav-item" onClick={openSystem}><span>ⓘ</span> System status</button><div className="rail-bottom"><div className="school-mini"><span className="school-icon">S</span><div><b>{principal?.name || 'Principal'}</b><small>{school.name}</small></div><button className="signout-button" onClick={onSignOut} title="Sign out">↗</button></div><div className="version">AIR ACTION DESK <span>v2.0</span></div></div></aside>
    <main className="main"><header className="topbar"><div className="crumb">Workspace <span>/</span> {section === 'morning' ? 'Morning desk' : section === 'parents' ? 'Parents' : 'School settings'}</div>{decision?.source === 'replay' && <ReplayKpi decision={decision}/>}<div className="top-actions"><span className="live-pill"><i/> {decision?.source === 'replay' ? 'SAVED REPLAY' : 'LIVE FORECAST'}</span><button className="avatar" onClick={onSignOut} title="Sign out">{(principal?.name || 'P')[0]}</button></div></header>
      <section className="content">
        {error && <div className="toast-inline" role="status">{error}<button onClick={() => setError('')}>×</button></div>}
        {section === 'settings' ? <SchoolSettings initialSchool={school} onSaved={onSchoolSaved} onCancel={school.configured ? () => setSection('morning') : undefined}/> : section === 'parents' ? <ParentsPanel/> : <>
          <div className="greeting-row"><div><div className="eyebrow">{today}{decision?.source === 'replay' && <span className="date-replay"> · REPLAY DAY</span>}</div><h1>Good morning, {principal?.name?.split(' ')[0] || 'Principal'}.</h1><p className="subhead">Here’s your school’s air action brief for today · {school.locationLabel}.</p></div><button className="icon-button" onClick={refresh} title="Refresh decision">↻</button></div>
          {!decision ? <div className="forecast-error"><h2>Today’s live reading is unavailable</h2><p>{error || 'Try again when the forecast provider is available, or use a saved replay below.'}</p><button className="approve-button" onClick={refresh}>Retry live forecast</button></div> : <><DecisionCard decision={decision} schoolName={school.name} onRemind={remindParents} remindBusy={remindBusy}/><div className="lower-grid"><NoticePreview decision={decision} parentCount={parents.count} onApprove={approve} onResend={resend} onOpen={language => { setNoticeLanguage(language || 'en'); setNoticeOpen(true); }} busy={busy}/>
            <article className="rule-card"><div className="section-head"><div><div className="eyebrow">SET IT ONCE</div><h3>Standing rule</h3></div><span className="rule-symbol">⌁</span></div>{activeRule ? <><p className="rule-desc"><b>Active until {new Date(activeRule.expiresAt).toLocaleDateString()}</b><br/>{activeRule.principalWords}</p><button className="rule-button" onClick={showHistory}>Manage standing rules →</button></> : <><p className="rule-desc">Set a matching threshold for automatic action on future high-pollution days.</p><button className="rule-button" onClick={() => setRuleModal(true)}>＋ Create a standing rule</button></>}<div className="rule-foot">Rules use only the action tied to their threshold and expire on your chosen date.</div></article>
          </div>
          <div className="parent-contact-summary"><div><b>{parents.count} active parent accounts</b><span>Approved notices go to active accounts. Invitations are managed in Parents.</span></div><button className="text-button" onClick={() => setSection('parents')}>Manage parents →</button></div><div className="feature-columns"><TomorrowCard school={school}/><article className="rule-card"><div className="eyebrow">PUBLIC DISTRICT REPORT</div><h3>Opt-in response leaderboard</h3><p className="rule-desc">Only schools that enable consent in settings appear here.</p><a href="/district">Open district view →</a></article></div><PrincipalActivity/>
          </>}
          <ReplayPanel mode={mode} setMode={setMode} onRun={replay} onReset={resetDemo} busy={busy}/><footer><span>SAANS · SCHOOL AIR ACTION DESK</span><span>Planning estimate only. Not a health advisory.</span></footer>
        </>}
      </section>
    </main>
    <RuleModal open={ruleModal} onClose={() => setRuleModal(false)} onSave={saveRule} busy={ruleBusy}/><History items={history} onClose={() => setHistory(null)} onRevoke={revokeRule}/>
    {noticeOpen && decision?.notice && <div className="modal"><div className="modal-backdrop" onClick={() => setNoticeOpen(false)}/><section className="modal-panel notice-panel"><button className="modal-close" onClick={() => setNoticeOpen(false)}>×</button><div className="eyebrow">FAMILY UPDATE PREVIEW</div><h2>Today’s parent notice</h2><div className="preview-language"><button className={`lang ${noticeLanguage === 'en' ? 'active' : ''}`} onClick={() => setNoticeLanguage('en')}>English</button><button className={`lang ${noticeLanguage === 'hi' ? 'active' : ''}`} onClick={() => setNoticeLanguage('hi')}>हिन्दी</button></div><div className="large-notice" lang={noticeLanguage}>{decision.notice?.[noticeLanguage] || 'No parent notice is needed for this day.'}</div><p className="preview-foot">{decision.status === 'sent' ? 'Approval recorded. Parent acknowledgement status is on the decision card.' : 'Approving sends this notice to active parent accounts.'}</p><button className="approve-button" disabled={decision.status === 'sent' || decision.status === 'no_action' || busy} onClick={() => approve()}>{decision.status === 'sent' ? 'Approved ✓' : decision.status === 'no_action' ? 'No action required' : 'Approve notice →'}</button></section></div>}
    {systemOpen && system && <div className="modal"><div className="modal-backdrop" onClick={() => setSystemOpen(false)}/><section className="modal-panel system-panel"><button className="modal-close" onClick={() => setSystemOpen(false)}>×</button><div className="eyebrow">TRANSPARENCY</div><h2>System status</h2><div className="status-grid">{Object.entries({ 'Forecast source': `${system.data.provider} · ${system.data.label}`, 'Last data fetch': system.data.fetchedAt ? new Date(system.data.fetchedAt).toLocaleString() : 'Not fetched', 'Action policy': system.policy, 'Notice wording': system.wording.engine, 'Daily scheduler': system.scheduler, 'Last daily run': system.lastDailyRunAt ? new Date(system.lastDailyRunAt).toLocaleString() : 'Not run yet', 'Delivery': `${system.delivery.provider} · ${system.delivery.sent} sent · ${system.delivery.failed} failed · ${system.delivery.preview} preview`, 'Configured parents': system.delivery.parentsConfigured, 'Hosting': system.hosting }).map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>{system.dailySummary && <p>Last run: {system.dailySummary.succeeded}/{system.dailySummary.processed} schools processed; {system.dailySummary.failures.length} errors.</p>}</section></div>}
  </div>;
}

function ReplayKpi({ decision }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (decision.status !== 'proposed') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [decision.status, decision.checkedAt]);
  const minutes = minutesFromBreachToNotice(decision, now);
  return <div className="breach-notice-kpi" title="Minutes from the first school-hour AQI above 300 to notice publication">
    <span>MINUTES FROM BREACH TO NOTICE</span>
    <strong>{minutes ?? '—'}<small>min</small></strong>
    {decision.status === 'proposed' && <em>elapsed · awaiting approval</em>}
  </div>;
}
