export default function NoticePreview({ decision, onApprove, onOpen, onResend, busy, parentCount }) {
  if (decision.status === 'no_action') return <article className="notice-card no-action-card"><div className="section-head"><div><div className="eyebrow">TODAY'S PLAN</div><h3>No parent update needed</h3></div><span className="draft-badge sent-badge">NO ACTION</span></div><p>Air is within the planning threshold. Outdoor activities can continue as planned.</p></article>;
  const approved = decision.status === 'sent';
  const deliveries = decision.deliveries || [];
  const sent = deliveries.filter(item => item.status === 'sent').length;
  const failed = deliveries.filter(item => item.status === 'failed').length;
  const preview = deliveries.filter(item => item.status === 'preview').length;
  return <article className="notice-card"><div className="section-head"><div><div className="eyebrow">READY FOR FAMILIES</div><h3>Parent notice</h3></div><span className={`draft-badge ${approved ? 'sent-badge' : ''}`}>{approved ? decision.approvedBy === 'standing_rule' ? 'AUTO-ACTION · STANDING RULE' : 'APPROVED' : 'DRAFT · REVIEW REQUIRED'}</span></div>
    <div className="language-tabs"><button className="lang active">English</button><button className="lang" onClick={() => onOpen('hi')}>हिन्दी</button><span className="notice-hint">{decision.wordingSource === 'bedrock' ? `Drafted by ${decision.modelId || 'Amazon Bedrock'}` : 'Fixed template · reviewed by code'}</span></div>
    <div className="notice-text">{decision.notice?.en || 'Notice text is unavailable.'}</div>
    <div className="notice-actions"><span className="approval-hint">{approved ? `${sent} sent${preview ? ` · ${preview} preview` : ''}${failed ? ` · ${failed} failed` : ''} of ${parentCount} families` : `Approval sends to ${parentCount} configured parent contacts`}</span><div className="notice-buttons">{failed > 0 && <button className="text-button" disabled={busy} onClick={onResend}>Retry failed ({failed})</button>}<button className="text-button" onClick={() => onOpen('en')}>Full preview →</button><button className="approve-button" disabled={approved || busy} onClick={onApprove}>{approved ? 'Approved ✓' : busy ? 'Saving…' : <>Approve notice <span>→</span></>}</button></div></div>
    {approved && <p className="dispatch-note">{preview ? 'Preview mode: no email was sent.' : sent ? 'SES accepted each successful send request; delivery and bounce events are not connected.' : 'Delivery could not be confirmed. Failed contacts can be retried.'}</p>}
  </article>;
}
