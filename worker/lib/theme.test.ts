import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_UI_THEME,
  VALID_UI_THEMES,
  isValidUiTheme,
  normalizeUiTheme,
  DEFAULT_DASHBOARD_LAYOUT,
  VALID_DASHBOARD_LAYOUTS,
  isValidDashboardLayout,
  normalizeDashboardLayout,
} from './theme.ts';
import {
  resolveColorMode,
  UI_THEME_CATALOG,
  DASHBOARD_LAYOUT_CATALOG,
} from '../../src/lib/theme.ts';

test('DEFAULT_UI_THEME preserves classic UI as default', () => {
  assert.equal(DEFAULT_UI_THEME, 'classic');
  assert.deepEqual(VALID_UI_THEMES, ['classic']);
});

test('isValidUiTheme validates supported UI themes strictly', () => {
  assert.equal(isValidUiTheme('classic'), true);
  assert.equal(isValidUiTheme(' classic '), true);

  assert.equal(isValidUiTheme('crystal-glass'), false);
  assert.equal(isValidUiTheme('crystal-hybrid'), false);
  assert.equal(isValidUiTheme('unknown-theme'), false);
  assert.equal(isValidUiTheme(''), false);
  assert.equal(isValidUiTheme(null), false);
  assert.equal(isValidUiTheme(undefined), false);
  assert.equal(isValidUiTheme(123), false);
});

test('normalizeUiTheme normalizes input and falls back to classic safely', () => {
  assert.equal(normalizeUiTheme('classic'), 'classic');
  assert.equal(normalizeUiTheme('invalid'), 'classic');
  assert.equal(normalizeUiTheme(''), 'classic');
  assert.equal(normalizeUiTheme(null), 'classic');
  assert.equal(normalizeUiTheme(undefined), 'classic');
});

test('UI_THEME_CATALOG preserves Classic as default', () => {
  assert.deepEqual(
    UI_THEME_CATALOG.map((item) => item.id),
    ['classic']
  );
});

test('resolveColorMode keeps classic TV dark & management light', () => {
  assert.equal(resolveColorMode('classic', null, true), 'dark');
  assert.equal(resolveColorMode('classic', 'light', true), 'dark');
  assert.equal(resolveColorMode('classic', null, false), 'light');
  assert.equal(resolveColorMode('classic', 'dark', false), 'light');
});

test('VALID_DASHBOARD_LAYOUTS supports 2 dashboard layouts', () => {
  assert.equal(DEFAULT_DASHBOARD_LAYOUT, 'matrix');
  assert.deepEqual(VALID_DASHBOARD_LAYOUTS, ['matrix', 'zone']);
  assert.deepEqual(
    DASHBOARD_LAYOUT_CATALOG.map((item) => item.id),
    ['matrix', 'zone']
  );

  assert.equal(isValidDashboardLayout('matrix'), true);
  assert.equal(isValidDashboardLayout('zone'), true);
  assert.equal(isValidDashboardLayout('heatmap'), false);
  assert.equal(isValidDashboardLayout('invalid'), false);

  assert.equal(normalizeDashboardLayout('zone'), 'zone');
  assert.equal(normalizeDashboardLayout('heatmap'), 'matrix');
  assert.equal(normalizeDashboardLayout('other'), 'matrix');
});
