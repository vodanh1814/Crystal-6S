export type UiThemeId = 'classic';

export const VALID_UI_THEMES: readonly UiThemeId[] = ['classic'] as const;

export const DEFAULT_UI_THEME: UiThemeId = 'classic';

export type DashboardLayoutId = 'matrix' | 'zone' | 'heatmap';

export const VALID_DASHBOARD_LAYOUTS: readonly DashboardLayoutId[] = [
  'matrix',
  'zone',
  'heatmap',
] as const;

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutId = 'matrix';

/**
 * Checks whether an unknown input is a valid supported UI theme ID.
 */
export function isValidUiTheme(value: unknown): value is UiThemeId {
  return (
    typeof value === 'string' &&
    (VALID_UI_THEMES as readonly string[]).includes(value.trim())
  );
}

/**
 * Normalizes any database/request value into a valid UiThemeId,
 * safely falling back to 'classic' (standard factory theme).
 */
export function normalizeUiTheme(value: unknown): UiThemeId {
  if (typeof value !== 'string') return DEFAULT_UI_THEME;
  const trimmed = value.trim();
  return isValidUiTheme(trimmed) ? trimmed : DEFAULT_UI_THEME;
}

/**
 * Checks whether an unknown input is a valid supported Dashboard layout ID.
 */
export function isValidDashboardLayout(value: unknown): value is DashboardLayoutId {
  return (
    typeof value === 'string' &&
    (VALID_DASHBOARD_LAYOUTS as readonly string[]).includes(value.trim())
  );
}

/**
 * Normalizes any database/request value into a valid DashboardLayoutId,
 * safely falling back to 'matrix' (standard 3-row matrix layout).
 */
export function normalizeDashboardLayout(value: unknown): DashboardLayoutId {
  if (typeof value !== 'string') return DEFAULT_DASHBOARD_LAYOUT;
  const trimmed = value.trim();
  return isValidDashboardLayout(trimmed) ? trimmed : DEFAULT_DASHBOARD_LAYOUT;
}
