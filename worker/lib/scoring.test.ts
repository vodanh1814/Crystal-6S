import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAppliedPenalty,
  calculateWeeklyScore,
  calculateMonthlyScore,
  isScorePassing,
  getScoreStatus,
  getEscalatedRepeatLevel,
  cleanHistoricalScore,
} from './scoring.ts';

test('calculateAppliedPenalty handles escalation step of 1 per repeated week', () => {
  // First time: repeat_level = 1
  assert.equal(calculateAppliedPenalty(2, 1, 1), 2);
  assert.equal(calculateAppliedPenalty(1, 1, 1), 1);

  // Second week: repeat_level = 2 -> +1
  assert.equal(calculateAppliedPenalty(2, 2, 1), 3);
  assert.equal(calculateAppliedPenalty(1, 2, 1), 2);

  // Third week: repeat_level = 3 -> +2
  assert.equal(calculateAppliedPenalty(2, 3, 1), 4);
  assert.equal(calculateAppliedPenalty(1, 3, 1), 3);

  // Fourth week: repeat_level = 4 -> +3
  assert.equal(calculateAppliedPenalty(2, 4, 1), 5);
});

test('calculateAppliedPenalty handles non-escalating items (S5.2, S5.3)', () => {
  // escalating = 0: BOD (4), Customer (6), IE (1)
  assert.equal(calculateAppliedPenalty(4, 1, 0), 4);
  assert.equal(calculateAppliedPenalty(4, 3, 0), 4);
  assert.equal(calculateAppliedPenalty(6, 2, 0), 6);
  assert.equal(calculateAppliedPenalty(1, 4, 0), 1);
});

test('calculateWeeklyScore computes score with floor at 0 and 2 decimal rounding', () => {
  // Normal score
  const res1 = calculateWeeklyScore([2, 1, 3]);
  assert.equal(res1.totalPenalty, 6);
  assert.equal(res1.score, 94);

  // Score floor at 0 (penalty > 100)
  const res2 = calculateWeeklyScore([50, 40, 30]);
  assert.equal(res2.totalPenalty, 120);
  assert.equal(res2.score, 0);

  // Exact 100 penalty -> 0
  const res3 = calculateWeeklyScore([100]);
  assert.equal(res3.totalPenalty, 100);
  assert.equal(res3.score, 0);

  // 0 penalty -> 100
  const res4 = calculateWeeklyScore([]);
  assert.equal(res4.totalPenalty, 0);
  assert.equal(res4.score, 100);
});

test('calculateMonthlyScore computes average correctly and ignores empty', () => {
  assert.equal(calculateMonthlyScore([]), null);
  assert.equal(calculateMonthlyScore([95, 96, 97]), 96);
  assert.equal(calculateMonthlyScore([90, 95]), 92.5);
  assert.equal(calculateMonthlyScore([91.33, 94.67]), 93);
});

test('getScoreStatus categorizes into pass (green), warning (yellow), fail (red)', () => {
  // Target: 95, Warning: 90
  // Pass (green): >= 95
  assert.equal(getScoreStatus(95, 95, 90), 'pass');
  assert.equal(getScoreStatus(98.5, 95, 90), 'pass');
  assert.equal(getScoreStatus(100, 95, 90), 'pass');

  // Warning (yellow): 90 <= score < 95
  assert.equal(getScoreStatus(90, 95, 90), 'warning');
  assert.equal(getScoreStatus(92.3, 95, 90), 'warning');
  assert.equal(getScoreStatus(94.99, 95, 90), 'warning');

  // Fail (red): < 90
  assert.equal(getScoreStatus(89.9, 95, 90), 'fail');
  assert.equal(getScoreStatus(80, 95, 90), 'fail');
  assert.equal(getScoreStatus(0, 95, 90), 'fail');

  // Edge cases
  assert.equal(getScoreStatus(null, 95, 90), 'none');
  assert.equal(getScoreStatus(undefined, 95, 90), 'none');
  assert.equal(getScoreStatus(NaN, 95, 90), 'none');
});

test('isScorePassing tests against target', () => {
  assert.equal(isScorePassing(95, 95), true);
  assert.equal(isScorePassing(95.1, 95), true);
  assert.equal(isScorePassing(94.99, 95), false);
});

test('getEscalatedRepeatLevel increments within month and resets on new month', () => {
  // Same month -> increment
  assert.equal(getEscalatedRepeatLevel('2026-05', '2026-05', 1), 2);
  assert.equal(getEscalatedRepeatLevel('2026-05', '2026-05', 2), 3);

  // Different month -> reset to 1
  assert.equal(getEscalatedRepeatLevel('2026-05', '2026-06', 1), 1);
  assert.equal(getEscalatedRepeatLevel('2026-05', '2026-06', 3), 1);
});

test('cleanHistoricalScore handles decimals, percentages, strings, and bounds', () => {
  // Ratio from Excel decimal percentages (0.9 -> 90, 0.88 -> 88, 1 -> 100)
  assert.equal(cleanHistoricalScore(0.9), 90);
  assert.equal(cleanHistoricalScore('0.88'), 88);
  assert.equal(cleanHistoricalScore(1), 100);
  assert.equal(cleanHistoricalScore('0.965'), 96.5);

  // Direct percentage numbers
  assert.equal(cleanHistoricalScore(95), 95);
  assert.equal(cleanHistoricalScore('92.5'), 92.5);
  assert.equal(cleanHistoricalScore('89,4%'), 89.4);
  assert.equal(cleanHistoricalScore(' 98 % '), 98);
  assert.equal(cleanHistoricalScore(0), 0);
  assert.equal(cleanHistoricalScore('0'), 0);
  assert.equal(cleanHistoricalScore('0%'), 0);

  // Empty or invalid values
  assert.equal(cleanHistoricalScore(''), null);
  assert.equal(cleanHistoricalScore(' - '), null);
  assert.equal(cleanHistoricalScore(null), null);
  assert.equal(cleanHistoricalScore(undefined), null);
  assert.equal(cleanHistoricalScore('invalid'), null);

  // Clamping to [0, 100]
  assert.equal(cleanHistoricalScore(150), 100);
  assert.equal(cleanHistoricalScore(-10), 0);
});
