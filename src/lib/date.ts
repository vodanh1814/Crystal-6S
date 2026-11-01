/**
 * Client-side Vietnam time (UTC+7) date helpers.
 */

export function getVietnamToday(now: Date = new Date()): string {
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

export function getVietnamCurrentMonth(now: Date = new Date()): string {
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 7);
}

export function getVietnamCurrentYear(now: Date = new Date()): number {
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.getUTCFullYear();
}

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Converts a month number (1..12), a 2-digit string ('01'..'12'),
 * or a 'YYYY-MM' string ('2026-10') into its English short month name ('Jan'..'Dec').
 */
export function getMonthShortName(monthInput: number | string | null | undefined): string {
  if (monthInput === null || monthInput === undefined) return '';
  let mNum: number;
  if (typeof monthInput === 'number') {
    mNum = monthInput;
  } else {
    const str = String(monthInput).trim();
    const parts = str.split('-');
    mNum = parseInt(parts[parts.length - 1], 10);
  }
  if (isNaN(mNum) || mNum < 1 || mNum > 12) return String(monthInput);
  return MONTH_SHORT_NAMES[mNum - 1];
}

/**
 * Formats 'YYYY-MM' into 'Jan 2026', 'Feb 2026', etc.
 */
export function formatMonthYear(monthInput: string | null | undefined): string {
  if (!monthInput) return '';
  const str = String(monthInput).trim();
  const match = str.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    const year = match[1];
    const mNum = parseInt(match[2], 10);
    if (mNum >= 1 && mNum <= 12) {
      return `${MONTH_SHORT_NAMES[mNum - 1]} ${year}`;
    }
  }
  return getMonthShortName(str);
}
