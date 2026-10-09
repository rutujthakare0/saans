import test from 'node:test';
import assert from 'node:assert/strict';
import { bestOutdoorWindow } from '../src/services/window.js';

test('selects the cleanest adjacent two-hour school window when moderate or better', () => {
  const hours = [
    { time: '08:00', pm25: 80, pm10: 120 },
    { time: '09:00', pm25: 20, pm10: 35 },
    { time: '10:00', pm25: 18, pm10: 30 },
    { time: '11:00', pm25: 70, pm10: 100 }
  ];
  assert.deepEqual(bestOutdoorWindow(hours), { start: '09:00', end: '11:00', aqi: 33 });
});
test('returns no window if every two-hour stretch is above moderate', () => {
  assert.equal(bestOutdoorWindow([{ time: '08:00', pm25: 100, pm10: 160 }, { time: '09:00', pm25: 120, pm10: 180 }]), null);
});
test('needs at least two hourly readings', () => {
  assert.equal(bestOutdoorWindow([{ time: '08:00', pm25: 10, pm10: 20 }]), null);
});
