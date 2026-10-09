import { Router } from 'express';
import Parent from '../models/Parent.js';
import { config } from '../config.js';
import { sendInvite } from '../services/dispatch.js';
import { createInviteCredentials } from '../services/invites.js';

const router = Router();
const mask = email => { const [local, domain] = email.split('@'); return `${local.slice(0, 2)}***@${domain || ''}`; };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inviteUrl = token => `${config.publicBaseUrl.replace(/\/$/, '')}/parent/join?token=${token}`;

router.get('/', async (req, res) => {
  const parents = await Parent.find({ schoolId: req.school._id }).sort({ name: 1 });
  res.json({ count: parents.filter(parent => parent.active && parent.status === 'active').length, parents: parents.map(parent => ({ _id: parent._id, name: parent.name, email: mask(parent.email), language: parent.language, childName: parent.childName, className: parent.className, status: parent.status, active: parent.active, lastLoginAt: parent.lastLoginAt })) });
});

async function createOrRefreshInvite(parent, school) {
  const invite = createInviteCredentials();
  parent.inviteTokenHash = invite.tokenHash;
  parent.inviteExpiresAt = invite.expiresAt;
  parent.status = 'invited';
  parent.active = false;
  parent.passwordHash = null;
  await parent.save();
  const url = inviteUrl(invite.token);
  const sent = await sendInvite(parent, school, url);
  return { expiresAt: parent.inviteExpiresAt, previewLink: sent.previewLink, deliveryStatus: sent.status };
}

function parseCsvLine(line) {
  const fields = []; let value = '', quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { fields.push(value.trim()); value = ''; }
    else value += char;
  }
  fields.push(value.trim());
  return fields;
}

router.post('/import', async (req, res) => {
  const raw = String(req.body.csv || '');
  if (raw.length > 200_000) return res.status(413).json({ error: 'CSV must be smaller than 200 KB.' });
  const lines = raw.split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return res.status(400).json({ error: 'Choose a CSV with name, email, and language columns.' });
  const headers = parseCsvLine(lines.shift()).map(value => value.toLowerCase());
  const nameIndex = headers.indexOf('name'), emailIndex = headers.indexOf('email'), languageIndex = headers.indexOf('language');
  if (nameIndex < 0 || emailIndex < 0 || languageIndex < 0) return res.status(400).json({ error: 'CSV headers must include name, email, and language.' });
  const rows = lines.map(parseCsvLine);
  if (rows.length > 300) return res.status(400).json({ error: 'CSV import is limited to 300 parents.' });
  const created = [], skipped = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i], name = row[nameIndex]?.trim(), email = row[emailIndex]?.trim().toLowerCase(), language = row[languageIndex]?.trim().toLowerCase();
    if (!name || name.length < 2 || name.length > 80 || !emailPattern.test(email || '') || !['en', 'hi', 'both'].includes(language)) { skipped.push({ row: i + 2, reason: 'Invalid name, email, or language (use en, hi, or both).' }); continue; }
    if (await Parent.exists({ email })) { skipped.push({ row: i + 2, reason: 'Email already exists.' }); continue; }
    try {
      const parent = await Parent.create({ schoolId: req.school._id, name, email, language, status: 'invited', active: false });
      const invite = await createOrRefreshInvite(parent, req.school);
      created.push({ name, email: mask(email), deliveryStatus: invite.deliveryStatus, previewLink: invite.previewLink });
    } catch (error) {
      if (error.code === 11000) skipped.push({ row: i + 2, reason: 'Email already exists.' });
      else throw error;
    }
  }
  res.status(201).json({ imported: created.length, skipped, parents: created });
});

router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const language = ['en', 'hi', 'both'].includes(req.body.language) ? req.body.language : 'both';
  const childName = String(req.body.childName || '').trim();
  const className = String(req.body.className || '').trim();
  if (name.length < 2 || name.length > 80 || !emailPattern.test(email) || childName.length > 80 || className.length > 40) return res.status(400).json({ error: 'Enter a parent name, valid email, and optional child/class details within the limits.' });
  if (await Parent.exists({ email })) return res.status(409).json({ error: 'A parent account with this email already exists.' });
  const parent = await Parent.create({ schoolId: req.school._id, name, email, language, childName, className, status: 'invited', active: false });
  const invite = await createOrRefreshInvite(parent, req.school);
  res.status(201).json({ parent: { _id: parent._id, name, email: mask(email), language, childName, className, status: parent.status, active: parent.active }, invite });
});

router.post('/:id/resend-invite', async (req, res) => {
  const parent = await Parent.findOne({ _id: req.params.id, schoolId: req.school._id, status: { $ne: 'active' } });
  if (!parent) return res.status(404).json({ error: 'Invited parent not found.' });
  const invite = await createOrRefreshInvite(parent, req.school);
  res.json({ invite });
});

router.post('/:id/deactivate', async (req, res) => {
  const parent = await Parent.findOneAndUpdate({ _id: req.params.id, schoolId: req.school._id }, { $set: { status: 'deactivated', active: false, inviteTokenHash: null, inviteExpiresAt: null } }, { new: true });
  if (!parent) return res.status(404).json({ error: 'Parent not found.' });
  res.json({ ok: true, status: parent.status });
});

export default router;
