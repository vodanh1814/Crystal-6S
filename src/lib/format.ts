/**
 * Central number and score formatting utilities for Crystal 5S Audit.
 * Provides consistent 1-decimal formatting (e.g. 95,3% in VI, 95.3% in EN).
 */

export type SupportedLang = 'vi' | 'en';

export interface FormatScoreOptions {
  /**
   * Whether to append '%' suffix.
   * @default true
   */
  showPercent?: boolean;
  /**
   * String to return when score is null, undefined, or NaN.
   * @default '-'
   */
  fallback?: string;
}

/**
 * Formats a 5S audit score with exactly 1 decimal place.
 * Uses comma `,` for Vietnamese (`lang === 'vi'`) and dot `.` for English (`lang === 'en'`).
 *
 * @example
 * formatScore(95.333, 'vi') // "95,3%"
 * formatScore(95, 'vi')      // "95,0%"
 * formatScore(95.333, 'en') // "95.3%"
 * formatScore(null)         // "-"
 */
export function formatScore(
  score: number | null | undefined,
  lang: SupportedLang = 'vi',
  options?: FormatScoreOptions
): string {
  const fallback = options?.fallback ?? '-';
  const showPercent = options?.showPercent ?? true;

  if (score === null || score === undefined) {
    return fallback;
  }

  const num = typeof score === 'number' ? score : Number(score);
  if (isNaN(num)) {
    return fallback;
  }

  const fixed = num.toFixed(1);
  const localized = lang === 'en' ? fixed : fixed.replace('.', ',');

  return showPercent ? `${localized}%` : localized;
}

/**
 * Formats a score delta (change between weeks) with +/- sign, 1 decimal place, and indicator arrow.
 *
 * @example
 * formatDelta(1.5, 'vi')  // "▲ +1,5%"
 * formatDelta(-2.3, 'vi') // "▼ -2,3%"
 * formatDelta(0, 'vi')    // "▲ +0,0%"
 */
export function formatDelta(
  delta: number | null | undefined,
  lang: SupportedLang = 'vi'
): string {
  if (delta === null || delta === undefined) {
    return '-';
  }

  const num = typeof delta === 'number' ? delta : Number(delta);
  if (isNaN(num)) {
    return '-';
  }

  const absFixed = Math.abs(num).toFixed(1);
  const localized = lang === 'en' ? absFixed : absFixed.replace('.', ',');

  if (num >= 0) {
    return `▲ +${localized}%`;
  }
  return `▼ -${localized}%`;
}
