/**
 * Utilities for exporting templates and parsing Excel files for Historical 5S Monthly Scores.
 * Uses lazy dynamic import of SheetJS (xlsx) to optimize bundle size.
 */

export interface AreaInfo {
  id: number;
  code: string;
  name: string;
}

export interface HistoricalScoreEntry {
  area_id: number;
  month: string; // '01' - '12'
  score: number;
}

export interface ParsedHistoricalResult {
  entries: HistoricalScoreEntry[];
  matchedAreas: {
    id: number;
    code: string;
    name: string;
    matchedLabel: string;
  }[];
  unmatchedLabels: string[];
  monthsFound: string[];
  totalScoresFound: number;
}

const MONTH_NAMES = [
  { num: '01', en: 'Jan', vi: 'Tháng 01', shortVi: 'T1' },
  { num: '02', en: 'Feb', vi: 'Tháng 02', shortVi: 'T2' },
  { num: '03', en: 'Mar', vi: 'Tháng 03', shortVi: 'T3' },
  { num: '04', en: 'Apr', vi: 'Tháng 04', shortVi: 'T4' },
  { num: '05', en: 'May', vi: 'Tháng 05', shortVi: 'T5' },
  { num: '06', en: 'Jun', vi: 'Tháng 06', shortVi: 'T6' },
  { num: '07', en: 'Jul', vi: 'Tháng 07', shortVi: 'T7' },
  { num: '08', en: 'Aug', vi: 'Tháng 08', shortVi: 'T8' },
  { num: '09', en: 'Sep', vi: 'Tháng 09', shortVi: 'T9' },
  { num: '10', en: 'Oct', vi: 'Tháng 10', shortVi: 'T10' },
  { num: '11', en: 'Nov', vi: 'Tháng 11', shortVi: 'T11' },
  { num: '12', en: 'Dec', vi: 'Tháng 12', shortVi: 'T12' },
];

const MONTH_ALIASES: Record<string, string> = {
  jan: '01', january: '01', 'tháng 1': '01', 'tháng 01': '01', t1: '01', t01: '01', '1': '01', '01': '01',
  feb: '02', february: '02', 'tháng 2': '02', 'tháng 02': '02', t2: '02', t02: '02', '2': '02', '02': '02',
  mar: '03', march: '03', 'tháng 3': '03', 'tháng 03': '03', t3: '03', t03: '03', '3': '03', '03': '03',
  apr: '04', april: '04', 'tháng 4': '04', 'tháng 04': '04', t4: '04', t04: '04', '4': '04', '04': '04',
  may: '05', 'tháng 5': '05', 'tháng 05': '05', t5: '05', t05: '05', '5': '05', '05': '05',
  jun: '06', june: '06', 'tháng 6': '06', 'tháng 06': '06', t6: '06', t06: '06', '6': '06', '06': '06',
  jul: '07', july: '07', 'tháng 7': '07', 'tháng 07': '07', t7: '07', t07: '07', '7': '07', '07': '07',
  aug: '08', august: '08', 'tháng 8': '08', 'tháng 08': '08', t8: '08', t08: '08', '8': '08', '08': '08',
  sep: '09', september: '09', sept: '09', 'tháng 9': '09', 'tháng 09': '09', t9: '09', t09: '09', '9': '09', '09': '09',
  oct: '10', october: '10', 'tháng 10': '10', t10: '10', '10': '10',
  nov: '11', november: '11', 'tháng 11': '11', t11: '11', '11': '11',
  dec: '12', december: '12', 'tháng 12': '12', t12: '12', '12': '12',
};

function normalizeStr(str: any): string {
  return String(str || '').trim().toLowerCase();
}

export function matchMonth(val: any): string | null {
  if (val === null || val === undefined) return null;
  const raw = String(val).trim();
  if (!raw) return null;
  const norm = normalizeStr(raw)
    .replace(/^thg\s*/i, 'tháng ')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
  return MONTH_ALIASES[norm] || null;
}

export function matchArea(val: any, areas: AreaInfo[]): AreaInfo | null {
  if (!val) return null;
  const raw = String(val).trim();
  if (!raw) return null;
  const norm = normalizeStr(raw);

  // 1. Direct match on code or name
  for (const a of areas) {
    if (normalizeStr(a.code) === norm || normalizeStr(a.name) === norm) {
      return a;
    }
  }

  // 2. Normalized match replacing underscores, slashes, hyphens with space
  const simplify = (s: string) =>
    normalizeStr(s).replace(/[_\-\/\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
  const normSimplified = simplify(raw);

  for (const a of areas) {
    if (simplify(a.code) === normSimplified || simplify(a.name) === normSimplified) {
      return a;
    }
  }

  // 3. Substring match or "CODE - NAME" format
  for (const a of areas) {
    const codeNorm = normalizeStr(a.code);
    const nameNorm = normalizeStr(a.name);
    if (
      norm.startsWith(codeNorm + ' ') ||
      norm.startsWith(codeNorm + '-') ||
      norm.includes(nameNorm)
    ) {
      return a;
    }
  }

  // 4. Common industrial synonyms in textile/factory environments
  const SYNONYMS: Record<string, string> = {
    knitting: 'kni',
    warehouse: 'wh',
    greige_pp: 'bat',
    'greige pp': 'bat',
    batching: 'bat',
    'qc-final': 'fqc',
    'qc final': 'fqc',
    'qc-greige': 'gqc',
    'qc greige': 'gqc',
    dyeing: 'dye',
    setting: 'set',
    vap: 'vap',
    mtn: 'mtn',
    maintenance: 'mtn',
    utility: 'uti',
    tsc: 'tsc',
    'fm/cfd': 'fm/cfd',
    'fm cfd': 'fm/cfd',
    'lab dip': 'l-dip',
    labdip: 'l-dip',
    'lab test': 'l-tes',
    labtest: 'l-tes',
    adm: 'adm',
    admin: 'adm',
  };

  const synonymCode = SYNONYMS[normSimplified];
  if (synonymCode) {
    const found = areas.find((a) => normalizeStr(a.code) === synonymCode);
    if (found) return found;
  }

  return null;
}

export function cleanScoreValue(val: any): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().replace(/%/g, '').replace(/,/g, '.');
  if (!str) return null;
  const num = Number(str);
  if (isNaN(num)) return null;
  let score = num;
  // If in range (0, 1] e.g. 0.9, 0.88, 1.0 (from Excel percentage cell), scale to 0..100
  if (num > 0 && num <= 1) {
    score = num * 100;
  }
  score = Math.max(0, Math.min(100, Math.round(score * 100) / 100));
  return score;
}

/**
 * Downloads a ready-to-fill Excel template for historical monthly scores.
 * Default format: Months as Rows (matching factory 5S standard), Areas as Columns.
 */
export async function downloadHistoricalTemplate(
  areas: AreaInfo[],
  year: number,
  existingScores?: Record<string, number>
): Promise<void> {
  const XLSX = await import('xlsx');

  // Header row
  const header = ['Tháng / Month', ...areas.map((a) => `${a.code} - ${a.name}`)];
  const rows: any[][] = [header];

  for (const m of MONTH_NAMES) {
    const row: any[] = [`${m.vi} (${m.en})`];
    for (const a of areas) {
      const key = `${a.id}_${m.num}`;
      const score = existingScores?.[key];
      row.push(score !== undefined && score !== null ? score : '');
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 18 },
    ...areas.map(() => ({ wch: 16 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Historical_${year}`);

  XLSX.writeFile(wb, `Crystal_5S_Historical_Scores_${year}.xlsx`);
}

/**
 * Parses an uploaded Excel file (.xlsx, .xls) containing historical 5S scores.
 * Automatically detects whether months are in rows or columns, matches area names/codes,
 * cleans percentages/ratios, and extracts scores.
 */
export async function parseHistoricalExcelFile(
  file: File,
  areas: AreaInfo[]
): Promise<ParsedHistoricalResult> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('File Excel không có sheet nào hợp lệ.');
  }

  // Use the first sheet with data
  let targetWs = wb.Sheets[wb.SheetNames[0]];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (data.length > 1) {
      targetWs = ws;
      break;
    }
  }

  if (!targetWs) {
    throw new Error('File Excel không có dữ liệu bảng tính hợp lệ.');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(targetWs, {
    header: 1,
    defval: '',
  });

  // Filter completely empty rows
  const cleanRows = rawRows.filter((r) =>
    r.some((c) => c !== null && c !== undefined && String(c).trim() !== '')
  );

  if (cleanRows.length < 2) {
    throw new Error('File Excel không có đủ dữ liệu (cần ít nhất 1 hàng tiêu đề và 1 hàng dữ liệu).');
  }

  // 1. Detect orientation
  // Check row 0 for month names
  let row0MonthMatches = 0;
  for (let c = 1; c < cleanRows[0].length; c++) {
    if (matchMonth(cleanRows[0][c])) {
      row0MonthMatches++;
    }
  }

  // Check column 0 for month names
  let col0MonthMatches = 0;
  for (let r = 1; r < cleanRows.length; r++) {
    if (matchMonth(cleanRows[r][0])) {
      col0MonthMatches++;
    }
  }

  const entries: HistoricalScoreEntry[] = [];
  const matchedAreasMap = new Map<number, { id: number; code: string; name: string; matchedLabel: string }>();
  const unmatchedSet = new Set<string>();
  const monthsFoundSet = new Set<string>();

  if (col0MonthMatches >= row0MonthMatches) {
    // ── Orientation A: Months in ROWS (Col 0), Areas in COLUMNS (Row 0) ── (Matches 5S.xlsx)
    const headerRow = cleanRows[0];
    const colToAreaMap: (AreaInfo | null)[] = [];

    for (let c = 1; c < headerRow.length; c++) {
      const label = String(headerRow[c] || '').trim();
      if (!label) {
        colToAreaMap.push(null);
        continue;
      }
      const matched = matchArea(label, areas);
      if (matched) {
        colToAreaMap.push(matched);
        matchedAreasMap.set(matched.id, {
          id: matched.id,
          code: matched.code,
          name: matched.name,
          matchedLabel: label,
        });
      } else {
        colToAreaMap.push(null);
        unmatchedSet.add(label);
      }
    }

    for (let r = 1; r < cleanRows.length; r++) {
      const monthRaw = cleanRows[r][0];
      const month = matchMonth(monthRaw);
      if (!month) continue;
      monthsFoundSet.add(month);

      for (let c = 1; c < cleanRows[r].length; c++) {
        const area = colToAreaMap[c - 1];
        if (!area) continue;
        const score = cleanScoreValue(cleanRows[r][c]);
        if (score !== null) {
          entries.push({
            area_id: area.id,
            month,
            score,
          });
        }
      }
    }
  } else {
    // ── Orientation B: Areas in ROWS (Col 0), Months in COLUMNS (Row 0) ──
    const headerRow = cleanRows[0];
    const colToMonthMap: (string | null)[] = [];

    for (let c = 1; c < headerRow.length; c++) {
      const m = matchMonth(headerRow[c]);
      colToMonthMap.push(m);
      if (m) monthsFoundSet.add(m);
    }

    for (let r = 1; r < cleanRows.length; r++) {
      const areaLabel = String(cleanRows[r][0] || '').trim();
      if (!areaLabel) continue;
      const matched = matchArea(areaLabel, areas);
      if (matched) {
        matchedAreasMap.set(matched.id, {
          id: matched.id,
          code: matched.code,
          name: matched.name,
          matchedLabel: areaLabel,
        });

        for (let c = 1; c < cleanRows[r].length; c++) {
          const month = colToMonthMap[c - 1];
          if (!month) continue;
          const score = cleanScoreValue(cleanRows[r][c]);
          if (score !== null) {
            entries.push({
              area_id: matched.id,
              month,
              score,
            });
          }
        }
      } else {
        unmatchedSet.add(areaLabel);
      }
    }
  }

  return {
    entries,
    matchedAreas: Array.from(matchedAreasMap.values()),
    unmatchedLabels: Array.from(unmatchedSet),
    monthsFound: Array.from(monthsFoundSet).sort(),
    totalScoresFound: entries.length,
  };
}
