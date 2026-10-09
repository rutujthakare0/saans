import Acknowledgement from '../models/Acknowledgement.js';
import Parent from '../models/Parent.js';

export function reminderBlockReason(reminders = [], now = new Date()) {
  if (reminders.length >= 2) return 'limit';
  if (reminders.some(item => new Date(item.sentAt) > new Date(now.getTime() - 30 * 60_000))) return 'cooldown';
  return null;
}

export function remindableParentIds(deliveries = [], acknowledgedIds = []) {
  const acknowledged = new Set(acknowledgedIds.map(String));
  return [...new Set(deliveries.filter(item => item.status === 'sent' && item.channel === 'email').map(item => String(item.parentId)).filter(id => !acknowledged.has(id)))];
}

export function summarizeAcknowledgements({ parents, acknowledgements, deliveries, reminders = [] }) {
  const ackByParent = new Map(acknowledgements.map(item => [String(item.parentId), item.acknowledgedAt]));
  const deliveryByParent = new Map(deliveries.map(item => [String(item.parentId), item]));
  const pending = parents.filter(parent => !ackByParent.has(String(parent._id))).map(parent => ({
    parentId: parent._id, name: parent.name, language: parent.language,
    deliveryStatus: deliveryByParent.get(String(parent._id))?.status || 'not sent'
  }));
  const sent = deliveries.filter(item => item.status === 'sent' && item.channel === 'email').length;
  const failed = deliveries.filter(item => item.status === 'failed').length;
  const lastReminderAt = reminders.at(-1)?.sentAt || null;
  return {
    acknowledged: acknowledgements.length, parentCount: Math.max(parents.length, deliveries.length), pending,
    remindableCount: pending.filter(item => item.deliveryStatus === 'sent').length,
    failedDeliveryCount: failed, emailSentCount: sent,
    reminderCount: reminders.length, lastReminderAt
  };
}

export async function acknowledgementSummary(decision, schoolId) {
  const [parents, acknowledgements] = await Promise.all([
    Parent.find({ schoolId, active: true, status: 'active' }).select('name language'),
    Acknowledgement.find({ decisionId: decision._id }).select('parentId acknowledgedAt')
  ]);
  return summarizeAcknowledgements({ parents, acknowledgements, deliveries: decision.deliveries || [], reminders: decision.reminders || [] });
}
