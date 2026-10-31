import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getISOWeek,
  getVietnamToday,
  addDays,
  daysRemaining,
  isSameISOWeek,
  isWeekLater,
} from './week.ts';

test('getISOWeek calculates correct ISO week, weekStart, and month', () => {
  // 2026-01-01 is Thursday -> ISO week 1 of 2026
  // Monday of this week is 2025-12-29
  // month is 2025-12 (month of weekStart)
  const w1 = getISOWeek('2026-01-01');
  assert.equal(w1.isoYear, 2026);
  assert.equal(w1.isoWeek, 1);
  assert.equal(w1.weekStart, '2025-12-29');
  assert.equal(w1.month, '2025-12');

  // 2026-01-05 is Monday -> ISO week 2 of 2026
  const w2 = getISOWeek('2026-01-05');
  assert.equal(w2.isoYear, 2026);
  assert.equal(w2.isoWeek, 2);
  assert.equal(w2.weekStart, '2026-01-05');
  assert.equal(w2.month, '2026-01');

  // 2024-12-30 is Monday -> ISO week 1 of 2025
  const w3 = getISOWeek('2024-12-30');
  assert.equal(w3.isoYear, 2025);
  assert.equal(w3.isoWeek, 1);
  assert.equal(w3.weekStart, '2024-12-30');
  assert.equal(w3.month, '2024-12');

  // Mid-year: 2026-10-31 is Saturday -> weekStart is 2026-10-26 (Monday)
  const w4 = getISOWeek('2026-10-31');
  assert.equal(w4.isoYear, 2026);
  assert.equal(w4.isoWeek, 44);
  assert.equal(w4.weekStart, '2026-10-26');
  assert.equal(w4.month, '2026-10');
});

test('addDays adds positive and negative days', () => {
  assert.equal(addDays('2026-01-01', 7), '2026-01-08');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});

test('daysRemaining calculates difference correctly', () => {
  assert.equal(daysRemaining('2026-01-08', '2026-01-01'), 7);
  assert.equal(daysRemaining('2026-01-01', '2026-01-08'), -7);
  assert.equal(daysRemaining('2026-01-01', '2026-01-01'), 0);
});

test('isSameISOWeek detects matching and different weeks', () => {
  assert.equal(isSameISOWeek('2026-01-01', '2026-01-04'), true); // Thu and Sun of same week
  assert.equal(isSameISOWeek('2026-01-01', '2026-01-05'), false); // next Monday
});

test('isWeekLater compares ISO week pairs properly', () => {
  assert.equal(isWeekLater(2026, 2, 2026, 1), true);
  assert.equal(isWeekLater(2027, 1, 2026, 52), true);
  assert.equal(isWeekLater(2026, 1, 2026, 1), false);
  assert.equal(isWeekLater(2026, 1, 2026, 2), false);
});

test('getVietnamToday returns valid YYYY-MM-DD in UTC+7', () => {
  // Test with fixed UTC date: 2026-10-31T18:00:00Z -> In UTC+7, it is 2026-11-01 01:00:00
  const date = new Date('2026-10-31T18:00:00Z');
  assert.equal(getVietnamToday(date), '2026-11-01');

  // Current time should return standard date format
  const today = getVietnamToday();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});
