/**
 * Pure ISO 8601 week and Vietnam timezone (UTC+7) calculations.
 * No external imports.
 */

export interface ISOWeekInfo {
  isoYear: number;
  isoWeek: number;
  weekStart: string; // YYYY-MM-DD of Monday
  month: string;     // YYYY-MM of weekStart
}

export function getISOWeek(dateStr: string): ISOWeekInfo {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }

  const date = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();

  // Monday of this week (weekStart)
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (dayOfWeek - 1));
  const weekStart = monday.toISOString().slice(0, 10);
  const month = weekStart.slice(0, 7);

  // Thursday of this week determines the ISO year
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + (4 - dayOfWeek));
  const isoYear = thursday.getUTCFullYear();

  // First Thursday of that ISO year (Jan 4 is always in week 1)
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const ftDay = firstThursday.getUTCDay() === 0 ? 7 : firstThursday.getUTCDay();
  firstThursday.setUTCDate(firstThursday.getUTCDate() + (4 - ftDay));

  const diffMs = thursday.getTime() - firstThursday.getTime();
  const isoWeek = 1 + Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

  return {
    isoYear,
    isoWeek,
    weekStart,
    month,
  };
}

export function getVietnamToday(now: Date = new Date()): string {
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function daysRemaining(dueDateStr: string, todayStr: string): number {
  const [y1, m1, d1] = dueDateStr.split('-').map(Number);
  const [y2, m2, d2] = todayStr.split('-').map(Number);
  const ms = Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function isSameISOWeek(dateStr1: string, dateStr2: string): boolean {
  const w1 = getISOWeek(dateStr1);
  const w2 = getISOWeek(dateStr2);
  return w1.isoYear === w2.isoYear && w1.isoWeek === w2.isoWeek;
}

export function isWeekLater(year1: number, week1: number, year2: number, week2: number): boolean {
  return year1 > year2 || (year1 === year2 && week1 > week2);
}
