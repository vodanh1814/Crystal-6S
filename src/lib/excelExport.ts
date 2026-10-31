/**
 * Lazy Excel export using SheetJS (xlsx).
 * Imports xlsx only when the user clicks export.
 */

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
  const header = ['Area Code', 'Area Name', ...months.map((m) => `M${m}`), 'Year Avg (%)', 'Result'];
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
