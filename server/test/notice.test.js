import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGeneratedNotice } from '../src/services/notice.js';
import { parentMessage } from '../src/services/dispatch.js';
import { publicDecision } from '../src/routes/public.js';

const facts = { aqi: 230, action: 'limit_outdoor', bestWindow: { start: '10:00', end: '12:00' } };
test('notice validation requires both actions and the selected window in both languages', () => {
  const valid = { en: 'AQI 230. Limit activities, between 10:00 and 12:00.', hi: 'AQI 230. गतिविधियाँ सीमित रखें 10:00 से 12:00 तक।' };
  assert.equal(validateGeneratedNotice(valid, facts), true);
  assert.equal(validateGeneratedNotice({ ...valid, hi: 'AQI 230. गतिविधियाँ सीमित रखें।' }, facts), false);
});
test('cancel wording rejects negation', () => {
  const cancelFacts = { aqi: 430, action: 'cancel_outdoor', bestWindow: null };
  assert.equal(validateGeneratedNotice({ en: 'AQI 430. Cancel outdoor activities. Modelled estimate, not a health advisory.', hi: 'AQI 430. बाहरी गतिविधियाँ रद्द करें।' }, cancelFacts), true);
  assert.equal(validateGeneratedNotice({ en: 'AQI 430. Do not cancel outdoor activities.', hi: 'AQI 430. बाहरी गतिविधियाँ रद्द करें।' }, cancelFacts), false);
});

test('parent email contains action, time, explanation, school, sent time and update link', () => {
  const decision = { action: 'limit_outdoor', category: 'Poor', aqi: 230, bestWindow: { start: '10:00', end: '12:00' }, notice: { en: 'English notice', hi: 'Hindi notice' }, approvedAt: new Date('2026-10-09T04:00:00Z') };
  const message = parentMessage(decision, { name: 'Demo School', slug: 'demo-school' }, 'both');
  for (const phrase of ['Outdoor activities limited today', '10:00', 'AQI ~230', 'Demo School', '/p/demo-school']) assert.ok(message.text.includes(phrase));
  assert.ok(message.text.includes('Hindi notice'));
});

test('public decision payload omits contact, per-hour and delivery data', () => {
  const result = publicDecision({ action: 'cancel_outdoor', category: 'Severe', aqi: 456, hourly: [{ pm25: 500 }], deliveries: [{ email: 'private@example.org' }], notice: { en: 'Cancel outside.', hi: 'रद्द करें' } }, { name: 'Demo School' }, '2026-10-09');
  assert.equal(result.aqiApprox, 460);
  assert.equal('hourly' in result, false);
  assert.equal('deliveries' in result, false);
  assert.equal('email' in result, false);
});
