import test from 'node:test';
import assert from 'node:assert/strict';
import { aqi, category } from '../src/services/naqi.js';

test('NAQI uses the larger PM sub-index', () => {
  assert.equal(aqi(30, 50), 50);
  assert.equal(aqi(90, 50), 200);
  assert.equal(aqi(30, 250), 200);
});
test('category boundaries map to the documented bands', () => {
  assert.equal(category(50), 'Good');
  assert.equal(category(51), 'Satisfactory');
  assert.equal(category(101), 'Moderate');
  assert.equal(category(201), 'Poor');
  assert.equal(category(301), 'Very Poor');
  assert.equal(category(401), 'Severe');
});
test('negative and missing particulate values are rejected', () => {
  assert.throws(() => aqi(-1, 10), /non-negative/);
  assert.throws(() => aqi(Number.NaN, 10), /non-negative/);
});
