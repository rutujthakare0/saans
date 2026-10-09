import { useEffect, useState } from 'react';

export default function RuleModal({ open, onClose, onSave, busy }) {
  const [category, setCategory] = useState('Very Poor');
  const [expiry, setExpiry] = useState(`${new Date().getFullYear()}-12-31`);
  const [words, setWords] = useState('If air is Very Poor or worse, cancel outdoor activities and prepare a parent notice.');
  useEffect(() => { setWords(category === 'Poor' ? 'If air is Poor, limit outdoor activities and prepare a parent notice.' : 'If air is Very Poor or worse, cancel outdoor activities and prepare a parent notice.'); }, [category]);
  if (!open) return null;
  return <div className="modal"><div className="modal-backdrop" onClick={onClose}/><section className="modal-panel"><button className="modal-close" onClick={onClose}>×</button><div className="eyebrow">AUTOMATION RULE</div><h2>Set your standing rule</h2><p>On future matching days, Saans records the action and sends a parent notice through the configured delivery channel.</p><form onSubmit={e => { e.preventDefault(); onSave({ minCategory: category, action: category === 'Poor' ? 'limit_outdoor' : 'cancel_outdoor', expiresAt: expiry, principalWords: words }); }}><label>Choose a rule<select value={category} onChange={e => setCategory(e.target.value)}><option value="Poor">Poor → limit outdoor</option><option value="Very Poor">Very Poor or worse → cancel outdoor</option></select></label><label>Rule expires<input type="date" min={new Date().toISOString().slice(0,10)} required value={expiry} onChange={e => setExpiry(e.target.value)}/></label><label>Your instruction<textarea rows="3" maxLength="500" required value={words} onChange={e => setWords(e.target.value)}/></label><div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button className="approve-button" disabled={busy}>{busy ? 'Saving…' : <>Save rule <span>→</span></>}</button></div></form></section></div>;
}
