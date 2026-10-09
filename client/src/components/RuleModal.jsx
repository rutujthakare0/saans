import { useEffect, useState } from 'react';

export default function RuleModal({ open, onClose, onSave, busy }) {
  const [category, setCategory] = useState('Very Poor');
  const [action, setAction] = useState('cancel_outdoor');
  const [expiry, setExpiry] = useState(`${new Date().getFullYear()}-12-31`);
  const [words, setWords] = useState('If air is Very Poor or worse, cancel outdoor activities and prepare a parent notice.');
  useEffect(() => { setWords(`If air is ${category} or worse, cancel outdoor activities and prepare a parent notice.`); }, [category]);
  if (!open) return null;
  return <div className="modal"><div className="modal-backdrop" onClick={onClose}/><section className="modal-panel"><button className="modal-close" onClick={onClose}>×</button><div className="eyebrow">AUTOMATION RULE</div><h2>Set your standing rule</h2><p>On future bad-air days, Saans can record the action and prepare the parent notice automatically.</p><form onSubmit={e => { e.preventDefault(); onSave({ minCategory: category, action, expiresAt: expiry, principalWords: words }); }}><label>Apply when air quality is<select value={category} onChange={e => setCategory(e.target.value)}><option>Very Poor</option><option>Severe</option><option>Poor</option></select> or worse</label><label>What should Saans do?<select value={action} onChange={e => setAction(e.target.value)}><option value="cancel_outdoor">Cancel outdoor activities</option><option value="limit_outdoor">Limit outdoor activities</option></select></label><label>Rule expires<input type="date" min={new Date().toISOString().slice(0,10)} required value={expiry} onChange={e => setExpiry(e.target.value)}/></label><label>Your instruction<textarea rows="3" maxLength="500" required value={words} onChange={e => setWords(e.target.value)}/></label><div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button className="approve-button" disabled={busy}>{busy ? 'Saving…' : <>Save rule <span>→</span></>}</button></div></form></section></div>;
}
