import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotice, fixedNotice, validateNotice } from '../src/services/notice.js';
import { parentMessage, createSerialSender } from '../src/services/dispatch.js';
import { publicDecision } from '../src/routes/public.js';

const facts = { schoolName: 'Demo School', aqi: 230, category: 'Poor', action: 'limit_outdoor', bestWindow: { start: '10:00', end: '12:00' } };
test('notice wording uses the validated fixed bilingual template',()=>{
  const facts={schoolName:'Demo School',aqi:314,category:'Very Poor',action:'cancel_outdoor',bestWindow:null};
  const result=createNotice(facts);
  assert.equal(validateNotice(result.notice,facts),true);
  assert.match(result.notice.en,/school remains open/i);
});

test('fixed limit notice tells families the window, school status, AQI, and data limitation', () => {
  const notice = fixedNotice(facts);
  for (const value of Object.values(notice)) {
    assert.match(value, /10:00/); assert.match(value, /12:00/); assert.match(value, /230/);
  }
  assert.match(notice.en, /School remains open as planned/);
  assert.match(notice.en, /Outdoor activity only between/);
  assert.doesNotMatch(notice.en, /keep students indoors/i);
});

test('cancel notice explicitly keeps school open and says there is no outdoor time', () => {
  const notice = fixedNotice({ ...facts, aqi: 430, category: 'Severe', action: 'cancel_outdoor', bestWindow: null });
  assert.match(notice.en, /assembly, PE and outdoor break time are cancelled/i);
  assert.match(notice.en, /Students will stay indoors at school/);
  assert.match(notice.en, /No outdoor time is planned today/);
  assert.match(notice.en, /School remains open as planned/);
  assert.equal(validateNotice(notice, { ...facts, aqi: 430, action: 'cancel_outdoor', bestWindow: null }), true);
  assert.equal(validateNotice({ ...notice, en: notice.en.replace('School remains open as planned', 'School is closed') }, { ...facts, aqi: 430, action: 'cancel_outdoor', bestWindow: null }), false);
});

test('parent email links to the acknowledgement portal and includes notice details', () => {
  const decision = { ...facts, approvedAt: new Date('2026-10-09T04:00:00Z'), notice: { en: 'English notice', hi: 'Hindi notice' } };
  const message = parentMessage(decision, { name: 'Demo School', slug: 'demo-school' }, 'both');
  for (const phrase of ['Outdoor activities limited today', '10:00', 'AQI ~230', 'Demo School', '/parent', 'Open notice and acknowledge']) assert.ok(message.text.includes(phrase));
  assert.ok(message.text.includes('Hindi notice'));
});

test('public decision payload omits contact, per-hour and delivery data', () => {
  const result = publicDecision({ action: 'cancel_outdoor', category: 'Severe', aqi: 456, hourly: [{ pm25: 500 }], deliveries: [{ email: 'private@example.org' }], notice: { en: 'Cancel outside.', hi: 'रद्द करें' } }, { name: 'Demo School' }, '2026-10-09');
  assert.equal(result.aqi, 456);
  assert.equal('hourly' in result, false); assert.equal('deliveries' in result, false); assert.equal('email' in result, false);
});

test('SES send queue serializes requests and retries throttling once', async () => {
  const active = { count: 0, max: 0 }, attempts = new Map();
  const sender = createSerialSender(async item => {
    active.count += 1; active.max = Math.max(active.max, active.count);
    attempts.set(item.id, (attempts.get(item.id) || 0) + 1);
    await new Promise(resolve => setTimeout(resolve, 3)); active.count -= 1;
    if (item.id === 1 && attempts.get(item.id) === 1) { const error = new Error('ThrottlingException'); error.name = 'ThrottlingException'; throw error; }
    return item.id;
  }, 0, async () => {});
  assert.deepEqual(await Promise.all([{ id: 1 }, { id: 2 }].map(sender)), [1, 2]);
  assert.equal(active.max, 1); assert.equal(attempts.get(1), 2);
});
