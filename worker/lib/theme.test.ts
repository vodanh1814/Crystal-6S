import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_UI_THEME,
  VALID_UI_THEMES,
  isValidUiTheme,
  normalizeUiTheme,
} from './theme.ts';
import { resolveColorMode, UI_THEME_CATALOG } from '../../src/lib/theme.ts';

test('DEFAULT_UI_THEME preserves classic UI as default', () => {
  assert.equal(DEFAULT_UI_THEME, 'classic');
  assert.deepEqual(VALID_UI_THEMES, ['classic', 'crystal-glass', 'crystal-hybrid']);
});

test('isValidUiTheme validates supported UI themes strictly', () => {
  assert.equal(isValidUiTheme('classic'), true);
  assert.equal(isValidUiTheme('crystal-glass'), true);
  assert.equal(isValidUiTheme('crystal-hybrid'), true);
  assert.equal(isValidUiTheme(' crystal-glass '), true);

  assert.equal(isValidUiTheme('unknown-theme'), false);
  assert.equal(isValidUiTheme(''), false);
  assert.equal(isValidUiTheme(null), false);
  assert.equal(isValidUiTheme(undefined), false);
  assert.equal(isValidUiTheme(123), false);
});

test('normalizeUiTheme normalizes input and falls back to classic safely', () => {
  assert.equal(normalizeUiTheme('classic'), 'classic');
  assert.equal(normalizeUiTheme('crystal-glass'), 'crystal-glass');
  assert.equal(normalizeUiTheme('  crystal-hybrid  '), 'crystal-hybrid');

  assert.equal(normalizeUiTheme('invalid'), 'classic');
  assert.equal(normalizeUiTheme(''), 'classic');
  assert.equal(normalizeUiTheme(null), 'classic');
  assert.equal(normalizeUiTheme(undefined), 'classic');
});

test('UI_THEME_CATALOG preserves Classic as default plus Samples 2 & 4', () => {
  assert.deepEqual(
    UI_THEME_CATALOG.map((item) => item.id),
    ['classic', 'crystal-glass', 'crystal-hybrid']
  );
});

test('resolveColorMode keeps classic TV dark & management light regardless of override', () => {
  assert.equal(resolveColorMode('classic', null, true), 'dark');
  assert.equal(resolveColorMode('classic', 'light', true), 'dark');
  assert.equal(resolveColorMode('classic', null, false), 'light');
  assert.equal(resolveColorMode('classic', 'dark', false), 'light');
});

test('resolveColorMode honors Light/Dark override on crystal-glass and crystal-hybrid', () => {
  for (const theme of ['crystal-glass', 'crystal-hybrid'] as const) {
    assert.equal(resolveColorMode(theme, null, true), 'dark');
    assert.equal(resolveColorMode(theme, null, false), 'light');
    assert.equal(resolveColorMode(theme, 'light', true), 'light');
    assert.equal(resolveColorMode(theme, 'dark', false), 'dark');
  }
});
