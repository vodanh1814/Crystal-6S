import test from 'node:test';
import assert from 'node:assert/strict';
import { formatScore, formatDelta } from '../../src/lib/format.ts';

test('formatScore formats scores with 1 decimal place and localized separators', () => {
  // Vietnamese format (comma separator)
  assert.equal(formatScore(95.333, 'vi'), '95,3%');
  assert.equal(formatScore(95, 'vi'), '95,0%');
  assert.equal(formatScore(100, 'vi'), '100,0%');
  assert.equal(formatScore(0, 'vi'), '0,0%');
  assert.equal(formatScore(88.88, 'vi'), '88,9%'); // rounds correctly

  // English format (dot separator)
  assert.equal(formatScore(95.333, 'en'), '95.3%');
  assert.equal(formatScore(95, 'en'), '95.0%');
  assert.equal(formatScore(100, 'en'), '100.0%');
  assert.equal(formatScore(0, 'en'), '0.0%');
  assert.equal(formatScore(88.88, 'en'), '88.9%');

  // Options: without percent
  assert.equal(formatScore(95.3, 'vi', { showPercent: false }), '95,3');
  assert.equal(formatScore(95.3, 'en', { showPercent: false }), '95.3');

  // Null, undefined, and NaN values
  assert.equal(formatScore(null, 'vi'), '-');
  assert.equal(formatScore(undefined, 'vi'), '-');
  assert.equal(formatScore(NaN, 'vi'), '-');
  assert.equal(formatScore(null, 'vi', { fallback: 'N/A' }), 'N/A');
});

test('formatDelta formats weekly score changes with arrows and localized signs', () => {
  // Positive delta
  assert.equal(formatDelta(1.5, 'vi'), '▲ +1,5%');
  assert.equal(formatDelta(1.5, 'en'), '▲ +1.5%');
  assert.equal(formatDelta(0, 'vi'), '▲ +0,0%');
  assert.equal(formatDelta(0, 'en'), '▲ +0.0%');

  // Negative delta
  assert.equal(formatDelta(-2.3, 'vi'), '▼ -2,3%');
  assert.equal(formatDelta(-2.3, 'en'), '▼ -2.3%');

  // Null / undefined / NaN
  assert.equal(formatDelta(null), '-');
  assert.equal(formatDelta(undefined), '-');
  assert.equal(formatDelta(NaN), '-');
});
