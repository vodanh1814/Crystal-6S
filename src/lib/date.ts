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
