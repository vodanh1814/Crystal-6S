/**
 * Lazy Excel export using SheetJS (xlsx).
 * Imports xlsx only when the user clicks export.
 */

import { getMonthShortName } from './date';

export async function exportWeeklyReportToExcel(
  month: string,
  target: number,
  weeks: { label: string; week_start: string }[],
  matrix: any[]
): Promise<void> {
  const XLSX = await import('xlsx');

  const rows: any[] = [];

  // Header row
  const header = ['Area Code', 'Area Name', ...weeks.map((w) => w.label), 'Month Avg (%)', 'Result'];
  rows.push(header);

  // Data rows
  for (const item of matrix) {
    const row = [
      item.area_code,
      item.area_name,
      ...weeks.map((w) => {
        const val = item.weeks[w.label]?.score;
        return val !== null && val !== undefined ? `${val}%` : '-';
      }),
      item.month_avg !== null ? `${item.month_avg}%` : '-',
      item.passed === true ? 'Pass' : item.passed === false ? 'Fail' : '-',
    ];
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Weekly-${month}`);

  XLSX.writeFile(wb, `Crystal_5S_Weekly_${month}.xlsx`);
}

export async function exportMonthlyReportToExcel(
  year: number,
  target: number,
  months: string[],
  matrix: any[]
): Promise<void> {
  const XLSX = await import('xlsx');

  const rows: any[] = [];

  // Header row
  const header = ['Area Code', 'Area Name', ...months.map((m) => getMonthShortName(m)), 'Year Avg (%)', 'Result'];
  rows.push(header);

  // Data rows
  for (const item of matrix) {
    const row = [
      item.area_code,
      item.area_name,
      ...months.map((m) => {
        const val = item.months[m];
        return val !== null && val !== undefined ? `${val}%` : '-';
      }),
      item.year_avg !== null ? `${item.year_avg}%` : '-',
      item.passed === true ? 'Pass' : item.passed === false ? 'Fail' : '-',
    ];
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Monthly-${year}`);

  XLSX.writeFile(wb, `Crystal_5S_Monthly_${year}.xlsx`);
}

export async function exportRemediationReportToExcel(
  year: number,
  month: string | null,
  summary: any,
  byArea: any[]
): Promise<void> {
  const XLSX = await import('xlsx');

  const rows: any[] = [];
  const periodLabel = month || String(year);

  rows.push([
    'Area Code',
    'Area Name',
    'Total Findings',
    'Resolved Findings',
    'On-Time Findings',
    'On-Time Rate (%)',
    'Overdue Open',
    'Avg Remediation Days (MTTR)',
    'Repeated Findings',
    'Repeat Rate (%)',
  ]);

  for (const item of byArea) {
    rows.push([
      item.area_code,
      item.area_name,
      item.total_findings,
      item.resolved_findings,
      item.on_time_findings,
      item.on_time_rate_pct !== null ? `${item.on_time_rate_pct}%` : '-',
      item.overdue_findings,
      item.avg_remediation_days !== null ? `${item.avg_remediation_days}` : '-',
      item.repeat_findings,
      `${item.repeat_rate_pct}%`,
    ]);
  }

  if (summary) {
    rows.push([
      'PLANT TOTAL',
      `All Active Areas (${periodLabel})`,
      summary.total_findings,
      summary.resolved_findings,
      summary.on_time_findings,
      summary.on_time_rate_pct !== null ? `${summary.on_time_rate_pct}%` : '-',
      summary.overdue_findings,
      summary.avg_remediation_days !== null ? `${summary.avg_remediation_days}` : '-',
      summary.repeat_findings,
      `${summary.repeat_rate_pct}%`,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Remediation-${periodLabel}`);

  XLSX.writeFile(wb, `Crystal_5S_Remediation_${periodLabel}.xlsx`);
}
