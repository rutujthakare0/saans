import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function ParentsPanel() {
  const [data, setData] = useState({ count: 0, parents: [] });
  const [form, setForm] = useState({ name: '', email: '', language: 'both', childName: '', className: '' });
  const [csvText, setCsvText] = useState('');
  const [csvLinks, setCsvLinks] = useState([]);
  const [inviteLink, setInviteLink] = useState('');
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const refresh = async () => setData(await api('/parents'));
  useEffect(() => { refresh().catch(e => setError(e.message)); }, []);
  async function add(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); setInviteLink('');
    try { const result = await api('/parents', { method: 'POST', body: JSON.stringify(form) }); setInviteLink(result.invite.previewLink || ''); setMessage(result.invite.deliveryStatus === 'sent' ? 'Invitation email sent.' : result.invite.deliveryStatus === 'preview' ? 'Preview invite created. Copy the link to share it.' : 'Invite created but email failed. Check email settings and retry.'); setForm({ name: '', email: '', language: 'both', childName: '', className: '' }); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function importCsv(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); setCsvLinks([]);
    try { const result = await api('/parents/import', { method: 'POST', body: JSON.stringify({ csv: csvText }) }); setMessage(`Imported ${result.imported} parent(s); skipped ${result.skipped.length}.`); setCsvLinks(result.parents.filter(parent => parent.previewLink)); setCsvText(''); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function resend(parentId) {
    setBusy(true); setError(''); setMessage(''); setInviteLink('');
    try { const result = await api(`/parents/${parentId}/resend-invite`, { method: 'POST', body: '{}' }); setInviteLink(result.invite.previewLink || ''); setMessage(result.invite.deliveryStatus === 'sent' ? 'Invitation email resent.' : result.invite.deliveryStatus === 'preview' ? 'Preview invite refreshed. Copy the new link.' : 'Invite email failed. Check SES settings and retry.'); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function deactivate(parentId) {
    if (!window.confirm('Deactivate this parent account and stop future notices?')) return;
    setBusy(true); try { await api(`/parents/${parentId}/deactivate`, { method: 'POST', body: '{}' }); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function copyLink() { await navigator.clipboard.writeText(inviteLink); setMessage('Invite link copied. It expires in 7 days.'); }
  return <section className="settings-page parents-page">
    <div className="eyebrow">FAMILY ACCESS</div><h1>Parents</h1><p>{data.count} active parent accounts receive approved notices. New parents activate an account before they can acknowledge updates.</p>
    <form className="parent-add-form" onSubmit={add}><h3>Add a parent</h3><div className="coordinates-row"><label>Parent name<input required minLength="2" maxLength="80" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>Email<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label></div><div className="coordinates-row"><label>Notice language<select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}><option value="both">English and Hindi</option><option value="en">English</option><option value="hi">Hindi</option></select></label><label>Child name (optional)<input maxLength="80" value={form.childName} onChange={e => setForm({ ...form, childName: e.target.value })}/></label><label>Class (optional)<input maxLength="40" value={form.className} onChange={e => setForm({ ...form, className: e.target.value })}/></label></div><button className="approve-button" disabled={busy}>{busy ? 'Creating…' : 'Create invite'}</button></form>
    <form className="parent-add-form" onSubmit={importCsv}><h3>Import from CSV</h3><p>Columns: name,email,language (en, hi, or both); up to 300 rows.</p><textarea rows="5" value={csvText} onChange={e => setCsvText(e.target.value)} placeholder={'name,email,language\nAsha Rao,asha@example.com,both'} /><button className="rule-button" disabled={busy || !csvText.trim()}>Import CSV</button></form>
    {inviteLink && <div className="invite-link-box"><div><b>One-time invitation link</b><small>Anyone with this link can activate the invited account until it expires.</small><code>{inviteLink}</code></div><button className="replay-button" onClick={copyLink}>Copy invite link</button></div>}{csvLinks.length > 0 && <div className="invite-link-box"><div><b>Preview invitation links</b>{csvLinks.map((parent, index) => <small key={`${parent.email}-${index}`}>{parent.email}: <a href={parent.previewLink}>{parent.previewLink}</a></small>)}</div></div>}{message && <p className="toast-inline" role="status">{message}</p>}{error && <p className="family-error">{error}</p>}
    <div className="parent-list">{data.parents.map(parent => <article className="parent-list-item" key={parent._id}><div><b>{parent.name}</b><small>{parent.email} · {parent.language}{parent.childName ? ` · ${parent.childName}${parent.className ? `, ${parent.className}` : ''}` : ''}</small></div><span className={`parent-state ${parent.status}`}>{parent.status}</span><div className="parent-manage-actions">{parent.status !== 'active' && <button className="text-button" disabled={busy} onClick={() => resend(parent._id)}>Resend invite</button>}{parent.active && <button className="text-button danger-link" disabled={busy} onClick={() => deactivate(parent._id)}>Deactivate</button>}</div></article>)}</div>
  </section>;
}
