import type { ColorMode, UiThemeId, DashboardLayoutId } from '../api/types';
import type { TranslationKey } from '../i18n/context';

export function resolveColorMode(
  _activeTheme: UiThemeId,
  _colorModeOverride: ColorMode | null,
  isDashboardRoute: boolean
): ColorMode {
  // Standard Factory Andon: TV Dashboard is dark, Management pages are light
  return isDashboardRoute ? 'dark' : 'light';
}

export interface DashboardLayoutMeta {
  id: DashboardLayoutId;
  icon: string;
  nameKey: TranslationKey;
  descKey: TranslationKey;
}

export const DASHBOARD_LAYOUT_CATALOG: DashboardLayoutMeta[] = [
  {
    id: 'matrix',
    icon: '⊞',
    nameKey: 'dashboard_layout_matrix_name',
    descKey: 'dashboard_layout_matrix_desc',
  },
  {
    id: 'zone',
    icon: '☷',
    nameKey: 'dashboard_layout_zone_name',
    descKey: 'dashboard_layout_zone_desc',
  },
  {
    id: 'bento',
    icon: '▦',
    nameKey: 'dashboard_layout_bento_name',
    descKey: 'dashboard_layout_bento_desc',
  },
  {
    id: 'hud',
    icon: '◈',
    nameKey: 'dashboard_layout_hud_name',
    descKey: 'dashboard_layout_hud_desc',
  },
];

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
];
