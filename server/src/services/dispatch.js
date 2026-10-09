// Dispatch is deliberately a recorded preview. The app never sends SMS or email.
export function previewDispatch(decision) {
  return { status: 'sent', approvedAt: new Date() };
}
