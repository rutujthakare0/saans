import test from 'node:test';
import assert from 'node:assert/strict';
import { actionForCategory, ruleMatches } from '../src/services/policy.js';

test('action policy is deterministic for all categories', () => {
  assert.equal(actionForCategory('Good'), 'normal');
  assert.equal(actionForCategory('Moderate'), 'normal');
  assert.equal(actionForCategory('Poor'), 'limit_outdoor');
  assert.equal(actionForCategory('Very Poor'), 'cancel_outdoor');
  assert.equal(actionForCategory('Severe'), 'cancel_outdoor');
});
test('standing rule only matches at or above threshold while active and unexpired', () => {
  const now = new Date('2026-10-09T12:00:00Z');
  const rule = { active: true, minCategory: 'Very Poor', expiresAt: '2026-10-10T00:00:00Z' };
  assert.equal(ruleMatches(rule, 'Severe', now), true);
  assert.equal(ruleMatches(rule, 'Poor', now), false);
  assert.equal(ruleMatches({ ...rule, active: false }, 'Severe', now), false);
  assert.equal(ruleMatches({ ...rule, expiresAt: '2026-10-08T00:00:00Z' }, 'Severe', now), false);
});
