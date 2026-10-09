import test from 'node:test';
import assert from 'node:assert/strict';
import { bestOutdoorWindow } from '../src/services/window.js';

test('selects the cleanest adjacent two-hour window at or below AQI 200', () => {
  const hours = [
    { time: '08:00', pm25: 80, pm10: 120 },
    { time: '09:00', pm25: 20, pm10: 35 },
    { time: '10:00', pm25: 18, pm10: 30 },
    { time: '11:00', pm25: 70, pm10: 100 }
  ];
  assert.deepEqual(bestOutdoorWindow(hours), { start: '09:00', end: '11:00', aqi: 33 });
});
test('returns no window if every two-hour stretch exceeds AQI 200', () => {
  assert.equal(bestOutdoorWindow([{ time: '08:00', pm25: 100, pm10: 160 }, { time: '09:00', pm25: 120, pm10: 180 }]), null);
});
test('needs at least two hourly readings', () => {
  assert.equal(bestOutdoorWindow([{ time: '08:00', pm25: 10, pm10: 20 }]), null);
});
test('supports the Poor-category planning threshold above 100 and at or below 200', () => {
  const hours = [
    { time: '08:00', pm25: 80, pm10: 120 },
    { time: '09:00', pm25: 90, pm10: 140 },
    { time: '10:00', pm25: 80, pm10: 130 }
  ];
  const window = bestOutdoorWindow(hours, 200);
  assert.ok(window);
  assert.ok(window.aqi > 100 && window.aqi <= 200);
  assert.equal(bestOutdoorWindow(hours, 100), null);
});
