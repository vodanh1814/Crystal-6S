export type UiThemeId = 'classic' | 'crystal-glass' | 'crystal-hybrid';

export const VALID_UI_THEMES: readonly UiThemeId[] = [
  'classic',
  'crystal-glass',
  'crystal-hybrid',
] as const;

export const DEFAULT_UI_THEME: UiThemeId = 'classic';

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
 * safely falling back to 'classic' (current default theme).
 */
export function normalizeUiTheme(value: unknown): UiThemeId {
  if (typeof value !== 'string') return DEFAULT_UI_THEME;
  const trimmed = value.trim();
  return isValidUiTheme(trimmed) ? trimmed : DEFAULT_UI_THEME;
}
