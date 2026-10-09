import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDataLabel, normalize } from '../src/services/forecast.js';

const payload = (pm25, pm10) => ({ hourly: { time: ['2026-08-17T07:00', '2026-08-17T08:00', '2026-08-17T09:00', '2026-08-17T10:00', '2026-08-17T11:00', '2026-08-17T12:00'], pm2_5: pm25, pm10 } });

test('normalization requires four valid school-hour PM readings and ignores null values', () => {
  const result = normalize(payload([99, 30, 35, null, 40, 45], [99, 45, 50, 55, 60, 65]), '2026-08-17', 'replay', '08:00', '14:00');
  assert.deepEqual(result.hours.map(item => item.time), ['08:00', '09:00', '11:00', '12:00']);
  assert.throws(() => normalize(payload([99, null, null, null, 40, 45], [99, 45, 50, 55, 60, 65]), '2026-08-17', 'replay', '08:00', '14:00'), /at least 4/);
});

test('data labels report replay provenance and live fetch time', () => {
  assert.match(formatDataLabel('replay', { kind: 'real', realDate: '2026-08-17' }), /Saved real day/);
  assert.match(formatDataLabel('replay', { kind: 'illustrative' }), /Illustrative/);
  assert.match(formatDataLabel('live', {}, new Date('2026-10-09T10:00:00Z')), /Live forecast.*IST/);
});
