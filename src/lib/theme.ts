import type { ColorMode, UiThemeId } from '../api/types';
import type { TranslationKey } from '../i18n/context';

/**
 * Resolves the effective Light / Dark surface mode for the current route and theme.
 * - 'classic': TV Dashboard is always dark, Management pages are always light (original v2.6 behavior).
 * - 'crystal-glass' / 'crystal-hybrid': Uses user's colorModeOverride if set,
 *   otherwise defaults to Dark on TV Dashboard (/) and Light on Management routes.
 */
export function resolveColorMode(
  activeTheme: UiThemeId,
  colorModeOverride: ColorMode | null,
  isDashboardRoute: boolean
): ColorMode {
  if (activeTheme === 'classic') {
    return isDashboardRoute ? 'dark' : 'light';
  }
  if (colorModeOverride === 'light' || colorModeOverride === 'dark') {
    return colorModeOverride;
  }
  return isDashboardRoute ? 'dark' : 'light';
}

export interface ThemeMeta {
  id: UiThemeId;
  accentHex: string;
  secondaryHex: string;
  badgeKey: TranslationKey;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}

export const UI_THEME_CATALOG: ThemeMeta[] = [
  {
    id: 'classic',
    accentHex: '#10b981',
    secondaryHex: '#0f172a',
    badgeKey: 'theme_badge_default',
    titleKey: 'theme_classic_title',
    descKey: 'theme_classic_desc',
  },
  {
    id: 'crystal-glass',
    accentHex: '#2563eb',
    secondaryHex: '#eff6ff',
    badgeKey: 'theme_badge_sample2',
    titleKey: 'theme_glass_title',
    descKey: 'theme_glass_desc',
  },
  {
    id: 'crystal-hybrid',
    accentHex: '#0ea5e9',
    secondaryHex: '#090d16',
    badgeKey: 'theme_badge_sample4',
    titleKey: 'theme_hybrid_title',
    descKey: 'theme_hybrid_desc',
  },
];
