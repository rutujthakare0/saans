import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSchoolSettings, defaultNotifyBy, makeSlug } from '../src/services/schoolSettings.js';
import { createInviteCredentials, hashInviteToken } from '../src/services/invites.js';
import { summarizeAcknowledgements, reminderBlockReason, remindableParentIds } from '../src/services/acknowledgements.js';
import { hasRole } from '../src/middleware/auth.js';
import { sanitizeGeoResults } from '../src/routes/geo.js';
import School from '../src/models/School.js';
import { combineCurrentAndRecentNotices } from '../src/routes/parent.js';

const validSchool = { name: 'Aundh School', locationLabel: 'Aundh, Pune, Maharashtra, India', lat: 18.56, lng: 73.81, schoolStart: '08:00', schoolEnd: '14:00', checkTime: '06:00' };
test('school settings enforce India bounds, name and ordered times; slug is stable', () => {
  assert.equal(validateSchoolSettings(validSchool).value.configured, true);
  assert.match(validateSchoolSettings({ ...validSchool, lat: 50 }).error, /within India/);
  assert.match(validateSchoolSettings({ ...validSchool, name: 'X' }).error, /School name/);
  assert.match(validateSchoolSettings({ ...validSchool, schoolStart: '14:00', schoolEnd: '08:00' }).error, /school hours/);
  assert.equal(defaultNotifyBy('08:00'), '07:00');
  assert.equal(makeSlug('École Aundh'), 'ecole-aundh');
});

test('legacy school documents receive a slug before required-field validation', async () => {
  const school = new School({ name: 'North Campus', lat: 18.5, lng: 73.8, principalName: 'Principal', email: 'principal@school.invalid', passwordHash: 'hashed' });
  await school.validate();
  assert.match(school.slug, /^north-campus-[a-f0-9]{6}$/);
});

test('geocode results are filtered to India and stripped to approved fields', () => {
  const results = sanitizeGeoResults([
    { name: 'Pune', admin1: 'Maharashtra', latitude: 18.5, longitude: 73.8, country_code: 'IN', population: 1_000_000 },
    { name: 'London', latitude: 51.5, longitude: -0.1, country_code: 'GB' }
  ]);
  assert.deepEqual(results, [{ name: 'Pune', admin1: 'Maharashtra', lat: 18.5, lng: 73.8 }]);
});

test('invite credentials use a 32-byte token, save a hash and expire in seven days', () => {
  const now = new Date('2026-10-09T00:00:00Z');
  const invite = createInviteCredentials(now);
  assert.equal(Buffer.from(invite.token, 'hex').length, 32);
  assert.equal(invite.tokenHash, hashInviteToken(invite.token));
  assert.notEqual(invite.tokenHash, invite.token);
  assert.equal(invite.expiresAt.getTime() - now.getTime(), 7 * 24 * 60 * 60 * 1000);
});

test('parent role is isolated and acknowledgement counts and reminder restrictions are summarized', () => {
  assert.equal(hasRole({ role: 'parent' }, 'parent'), true);
  assert.equal(hasRole({ role: 'parent' }, 'principal'), false);
  const parents = [{ _id: 'p1', name: 'Asha', language: 'both' }, { _id: 'p2', name: 'Dev', language: 'en' }];
  const summary = summarizeAcknowledgements({ parents, acknowledgements: [{ parentId: 'p1', acknowledgedAt: new Date() }], deliveries: [{ parentId: 'p1', status: 'sent', channel: 'email' }, { parentId: 'p2', status: 'failed', channel: 'email' }] });
  assert.equal(summary.acknowledged, 1); assert.equal(summary.parentCount, 2); assert.equal(summary.pending[0].name, 'Dev');
  assert.equal(summary.remindableCount, 0); assert.equal(summary.failedDeliveryCount, 1);
  assert.equal(reminderBlockReason([]), null);
  assert.equal(reminderBlockReason([{ sentAt: new Date() }]), 'cooldown');
  assert.equal(reminderBlockReason([{ sentAt: new Date(0) }, { sentAt: new Date(0) }]), 'limit');
  assert.deepEqual(remindableParentIds([
    { parentId: 'p1', status: 'sent', channel: 'email' },
    { parentId: 'p2', status: 'failed', channel: 'email' },
    { parentId: 'p3', status: 'preview', channel: 'preview' }
  ], ['p1']), []);
  assert.deepEqual(remindableParentIds([{ parentId: 'p2', status: 'sent', channel: 'email' }], ['p1']), ['p2']);
});

test('parent notice history always includes today plus the latest five previous notices', () => {
  const today = { _id: 'today' };
  const previous = Array.from({ length: 7 }, (_, index) => ({ _id: `previous-${index}` }));
  const result = combineCurrentAndRecentNotices(today, previous);
  assert.equal(result.length, 6);
  assert.equal(result[0]._id, 'today');
  assert.deepEqual(result.slice(1).map(item => item._id), previous.slice(0, 5).map(item => item._id));
});
