import { Hono } from 'hono';
import type { Env, Variables, Area } from '../types';
import { authMiddleware, optionalAuthMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { getISOWeek, getVietnamToday, addDays, daysRemaining } from '../lib/week';
import { calculateMonthlyScore, isScorePassing, cleanHistoricalScore, getScoreStatus } from '../lib/scoring';
import { normalizeDashboardLayout } from '../lib/theme';

export const reportsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

interface RawRemediationRow {
  id: number;
  area_id: number;
  repeat_level: number;
  status: 'open' | 'fixed' | 'closed' | 'carried';
  due_date: string;
  fixed_at: string | null;
  closed_at: string | null;
  created_at: string;
  audit_date: string;
}

function computeRemediationAnalytics(
  rows: RawRemediationRow[],
  areas: Area[],
  today: string
) {
  const summarizeRows = (list: RawRemediationRow[]) => {
    const total = list.length;
    let resolved = 0;
    let closed = 0;
    let open = 0;
    let overdue = 0;
    let onTime = 0;
    let lateResolved = 0;
    let repeat = 0;
    const durationDaysList: number[] = [];

    for (const r of list) {
      if (r.repeat_level > 1) {
        repeat++;
      }

      const isResolved = r.status === 'fixed' || r.status === 'closed';
      if (r.status === 'closed') closed++;
      if (r.status === 'open') {
        open++;
        if (r.due_date < today) {
          overdue++;
        }
      }

      if (isResolved) {
        resolved++;
        const resolvedTimestamp = r.fixed_at || r.closed_at || '';
        const resolvedDateStr = resolvedTimestamp ? resolvedTimestamp.slice(0, 10) : r.due_date;
        if (resolvedDateStr <= r.due_date) {
          onTime++;
        } else {
          lateResolved++;
        }

        const startDateStr = (r.audit_date || r.created_at || '').slice(0, 10);
        if (startDateStr && resolvedDateStr) {
          const startMs = Date.parse(`${startDateStr}T00:00:00Z`);
          const endMs = Date.parse(`${resolvedDateStr}T00:00:00Z`);
          if (!isNaN(startMs) && !isNaN(endMs)) {
            const diffDays = Math.max(0, (endMs - startMs) / (1000 * 60 * 60 * 24));
            durationDaysList.push(diffDays);
          }
        }
      }
    }

    const evaluatedForOnTime = resolved + overdue;
    const onTimeRatePct =
      evaluatedForOnTime > 0 ? Number(((onTime / evaluatedForOnTime) * 100).toFixed(1)) : null;
    const resolutionRatePct =
      total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : null;
    const repeatRatePct =
      total > 0 ? Number(((repeat / total) * 100).toFixed(1)) : 0;
    const avgRemediationDays =
      durationDaysList.length > 0
        ? Number(
            (
              durationDaysList.reduce((sum, d) => sum + d, 0) / durationDaysList.length
            ).toFixed(1)
          )
        : null;

    return {
      total_findings: total,
      resolved_findings: resolved,
      closed_findings: closed,
      open_findings: open,
      overdue_findings: overdue,
      on_time_findings: onTime,
      late_resolved_findings: lateResolved,
      on_time_rate_pct: onTimeRatePct,
      resolution_rate_pct: resolutionRatePct,
      avg_remediation_days: avgRemediationDays,
      repeat_findings: repeat,
      repeat_rate_pct: repeatRatePct,
    };
  };

  const summary = summarizeRows(rows);

  const rowsByArea = new Map<number, RawRemediationRow[]>();
  for (const r of rows) {
    if (!rowsByArea.has(r.area_id)) {
      rowsByArea.set(r.area_id, []);
    }
    rowsByArea.get(r.area_id)!.push(r);
  }

  const byArea = areas.map((area) => {
    const areaRows = rowsByArea.get(area.id) || [];
    const stats = summarizeRows(areaRows);
    return {
      area_id: area.id,
      area_code: area.code,
      area_name: area.name,
      ...stats,
    };
  });

  return { summary, by_area: byArea };
}

// Public read access for TV / shop-floor display on /dashboard, /weekly, /monthly
// (no authMiddleware required to view summary reports)

// Helper to get all Monday dates (weeks) belonging to a month (YYYY-MM)
function getWeeksForMonth(monthStr: string): { isoYear: number; isoWeek: number; weekStart: string }[] {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);

  const weeks: { isoYear: number; isoWeek: number; weekStart: string }[] = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `${monthStr}-${dayStr}`;
    const date = new Date(Date.UTC(year, month - 1, d));
    // Check if this date is Monday (day 1)
    if (date.getUTCDay() === 1) {
      const info = getISOWeek(dateStr);
      weeks.push({
        isoYear: info.isoYear,
        isoWeek: info.isoWeek,
        weekStart: info.weekStart,
      });
    }
  }

  return weeks;
}

// GET /api/reports/weekly?month=YYYY-MM
reportsRouter.get('/weekly', async (c) => {
  const today = getVietnamToday();
  const currentMonth = getISOWeek(today).month;
  const month = c.req.query('month') || currentMonth;
  const year = parseInt(month.split('-')[0], 10);

  // Target for year
  const targetRow = await c.env.DB
    .prepare('SELECT target, COALESCE(warning_target, 90) as warning_target FROM yearly_targets WHERE year <= ? ORDER BY year DESC LIMIT 1')
    .bind(year)
    .first<{ target: number; warning_target?: number }>();
  const target = targetRow ? targetRow.target : 95;
  const warningTarget = targetRow ? (targetRow.warning_target ?? 90) : 90;

  // Active areas
  const areasRes = await c.env.DB
    .prepare('SELECT id, code, name, sort_order FROM areas WHERE active = 1 ORDER BY sort_order ASC, code ASC')
    .all<Area>();
  const areas = areasRes.results || [];

  // Weeks for this month
  const weeks = getWeeksForMonth(month);

  // Audits in this month
  const auditsRes = await c.env.DB
    .prepare(`
      SELECT a.id, aas.area_id, a.iso_year, a.iso_week, a.week_start,
             aas.score, a.status, aas.total_penalty,
             aas.finding_penalty, aas.bod_count, aas.customer_count, aas.ie_count, aas.external_penalty
      FROM audit_area_scores aas
      JOIN audits a ON a.id = aas.audit_id
      JOIN areas ar ON ar.id = aas.area_id AND ar.active = 1
      WHERE a.month = ? AND a.status = 'submitted'
    `)
    .bind(month)
    .all<any>();

  const auditMap = new Map<string, any>(); // key: `${area_id}_${iso_year}_${iso_week}`
  for (const a of auditsRes.results || []) {
    auditMap.set(`${a.area_id}_${a.iso_year}_${a.iso_week}`, a);
  }

  // Build matrix
  const matrix = areas.map((area) => {
    const weekScores: { [weekKey: string]: { score: number | null; total_penalty: number | null; audit_id: number | null } } = {};
    const scoresForAvg: number[] = [];

    for (const w of weeks) {
      const key = `${w.isoYear}-W${w.isoWeek < 10 ? '0' + w.isoWeek : w.isoWeek}`;
      const audit = auditMap.get(`${area.id}_${w.isoYear}_${w.isoWeek}`);

      if (audit && audit.score !== null) {
        weekScores[key] = {
          score: audit.score,
          total_penalty: audit.total_penalty,
          audit_id: audit.id,
        };
        scoresForAvg.push(audit.score);
      } else {
        weekScores[key] = {
          score: null,
          total_penalty: null,
          audit_id: null,
        };
      }
    }

    const monthAvg = calculateMonthlyScore(scoresForAvg);
    const passed = monthAvg !== null ? isScorePassing(monthAvg, target) : null;

    return {
      area_id: area.id,
      area_code: area.code,
      area_name: area.name,
      weeks: weekScores,
      month_avg: monthAvg,
      passed,
    };
  });

  return c.json({
    month,
    target,
    warning_target: warningTarget,
    weeks: weeks.map((w) => ({
      iso_year: w.isoYear,
      iso_week: w.isoWeek,
      week_start: w.weekStart,
      label: `${w.isoYear}-W${w.isoWeek < 10 ? '0' + w.isoWeek : w.isoWeek}`,
    })),
    matrix,
  });
});

// GET /api/reports/monthly?year=YYYY
reportsRouter.get('/monthly', async (c) => {
  const today = getVietnamToday();
  const currentYear = parseInt(today.slice(0, 4), 10);
  const yearQuery = c.req.query('year');
  const year = yearQuery ? parseInt(yearQuery, 10) : currentYear;

  // Target for year
  const targetRow = await c.env.DB
    .prepare('SELECT target, COALESCE(warning_target, 90) as warning_target FROM yearly_targets WHERE year <= ? ORDER BY year DESC LIMIT 1')
    .bind(year)
    .first<{ target: number; warning_target?: number }>();
  const target = targetRow ? targetRow.target : 95;
  const warningTarget = targetRow ? (targetRow.warning_target ?? 90) : 90;

  // Active areas
  const areasRes = await c.env.DB
    .prepare('SELECT id, code, name, sort_order FROM areas WHERE active = 1 ORDER BY sort_order ASC, code ASC')
    .all<Area>();
  const areas = areasRes.results || [];

  // Audits for this year (submitted)
  const auditsRes = await c.env.DB
    .prepare(`
      SELECT aas.area_id, a.month, aas.score
      FROM audit_area_scores aas
      JOIN audits a ON a.id = aas.audit_id
      JOIN areas ar ON ar.id = aas.area_id AND ar.active = 1
      WHERE a.month LIKE ? AND a.status = 'submitted' AND aas.score IS NOT NULL
    `)
    .bind(`${year}-%`)
    .all<{ area_id: number; month: string; score: number }>();

  // Map by area_id and month (01..12) from submitted weekly audits
  const scoresByAreaMonth = new Map<string, number[]>();
  for (const a of auditsRes.results || []) {
    const monthNum = a.month.slice(5, 7); // '01'..'12'
    const key = `${a.area_id}_${monthNum}`;
    if (!scoresByAreaMonth.has(key)) {
      scoresByAreaMonth.set(key, []);
    }
    scoresByAreaMonth.get(key)!.push(a.score);
  }

  // Historical scores for this year
  const historicalRes = await c.env.DB
    .prepare('SELECT year, month, area_id, score FROM historical_monthly_scores WHERE year = ?')
    .bind(year)
    .all<{ year: number; month: string; area_id: number; score: number }>();

  const historicalMap = new Map<string, number>();
  const historicalEntries: { [key: string]: number } = {};
  for (const h of historicalRes.results || []) {
    const mStr = String(h.month).padStart(2, '0');
    const key = `${h.area_id}_${mStr}`;
    historicalMap.set(key, h.score);
    historicalEntries[key] = h.score;
  }

  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  const matrix = areas.map((area) => {
    const monthlyAvgs: { [month: string]: number | null } = {};
    const monthlySources: { [month: string]: 'audited' | 'historical' | null } = {};
    const allMonthsValuesForYearAvg: number[] = [];

    for (const m of months) {
      const scores = scoresByAreaMonth.get(`${area.id}_${m}`) || [];
      const hasAudits = scores.length > 0;
      const histScore = historicalMap.get(`${area.id}_${m}`);

      let avg: number | null = null;
      let source: 'audited' | 'historical' | null = null;

      if (hasAudits) {
        avg = calculateMonthlyScore(scores);
        source = 'audited';
      } else if (histScore !== undefined && histScore !== null) {
        avg = Math.round(histScore * 100) / 100;
        source = 'historical';
      }

      monthlyAvgs[m] = avg;
      monthlySources[m] = source;
      if (avg !== null) {
        allMonthsValuesForYearAvg.push(avg);
      }
    }

    const yearAvg = calculateMonthlyScore(allMonthsValuesForYearAvg);
    const passed = yearAvg !== null ? isScorePassing(yearAvg, target) : null;

    return {
      area_id: area.id,
      area_code: area.code,
      area_name: area.name,
      months: monthlyAvgs,
      sources: monthlySources,
      year_avg: yearAvg,
      passed,
    };
  });

  return c.json({
    year,
    target,
    warning_target: warningTarget,
    months,
    matrix,
    historical_scores: historicalEntries,
  });
});

// PUT /api/reports/historical-monthly - Admin saves historical monthly scores
reportsRouter.put('/historical-monthly', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const year = parseInt(body.year, 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return c.json({ error: 'Invalid year' }, 400);
  }

  const entries: { area_id: number; month: string; score: number | null | string }[] = Array.isArray(body.entries)
    ? body.entries
    : [];

  let savedCount = 0;
  let deletedCount = 0;

  for (const entry of entries) {
    const areaId = parseInt(String(entry.area_id), 10);
    const month = String(entry.month || '').padStart(2, '0');
    if (isNaN(areaId) || !['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].includes(month)) {
      continue;
    }

    const cleaned = cleanHistoricalScore(entry.score);
    if (cleaned === null) {
      await c.env.DB
        .prepare('DELETE FROM historical_monthly_scores WHERE year = ? AND month = ? AND area_id = ?')
        .bind(year, month, areaId)
        .run();
      deletedCount++;
    } else {
      const score = cleaned;

      await c.env.DB
        .prepare(`
          INSERT INTO historical_monthly_scores (year, month, area_id, score, updated_by, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT (year, month, area_id) DO UPDATE SET
            score = excluded.score,
            updated_by = excluded.updated_by,
            updated_at = excluded.updated_at
        `)
        .bind(year, month, areaId, score, user.id)
        .run();
      savedCount++;
    }
  }

  return c.json({ ok: true, saved: savedCount, deleted: deletedCount });
});

// GET /api/reports/remediation?year=2026&month=2026-11
reportsRouter.get('/remediation', async (c) => {
  const today = getVietnamToday();
  const currentWeekInfo = getISOWeek(today);
  const yearParam = parseInt(c.req.query('year') || '', 10);
  const year = !isNaN(yearParam) ? yearParam : currentWeekInfo.isoYear;
  const monthParam = (c.req.query('month') || '').trim(); // optional YYYY-MM

  const areasRes = await c.env.DB
    .prepare('SELECT id, code, name, sort_order FROM areas WHERE active = 1 ORDER BY sort_order ASC, code ASC')
    .all<Area>();
  const areas = areasRes.results || [];

  let sql = `
    SELECT f.id, f.area_id, f.repeat_level, f.status, f.due_date,
           f.fixed_at, f.closed_at, f.created_at, a.audit_date
    FROM findings f
    JOIN audits a ON a.id = f.audit_id
    WHERE a.status = 'submitted'
  `;
  const params: (string | number)[] = [];

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    sql += ' AND a.month = ?';
    params.push(monthParam);
  } else {
    sql += ' AND a.iso_year = ?';
    params.push(year);
  }

  const findingsRes = await c.env.DB
    .prepare(sql)
    .bind(...params)
    .all<RawRemediationRow>();

  const analytics = computeRemediationAnalytics(findingsRes.results || [], areas, today);

  return c.json({
    year,
    month: monthParam || null,
    today,
    ...analytics,
  });
});

// GET /api/reports/dashboard
reportsRouter.get('/dashboard', optionalAuthMiddleware, async (c) => {
  const isAuthenticated = Boolean(c.get('user'));
  const today = getVietnamToday();
  const currentWeekInfo = getISOWeek(today);
  const currentMonth = currentWeekInfo.month;
  const currentYear = currentWeekInfo.isoYear;

  const requestedMonthRaw = c.req.query('month')?.trim() || '';
  const isCustomRequested = Boolean(requestedMonthRaw && /^\d{4}-\d{2}$/.test(requestedMonthRaw));
  const effectiveYear = isCustomRequested ? parseInt(requestedMonthRaw.slice(0, 4), 10) : currentYear;

  // 1. Target for effective year
  const targetRow = await c.env.DB
    .prepare('SELECT target, COALESCE(warning_target, 90) as warning_target FROM yearly_targets WHERE year <= ? ORDER BY year DESC LIMIT 1')
    .bind(effectiveYear)
    .first<{ target: number; warning_target?: number }>();
  const target = targetRow ? targetRow.target : 95;
  const warningTarget = targetRow ? (targetRow.warning_target ?? 90) : 90;

  // Plant-wide dashboard layout setting
  const layoutSetting = await c.env.DB
    .prepare("SELECT value FROM app_settings WHERE key = 'dashboard_layout'")
    .first<{ value: string }>();
  const dashboardLayout = normalizeDashboardLayout(layoutSetting?.value);

  // 2. Active areas
  const areasRes = await c.env.DB
    .prepare('SELECT id, code, name, sort_order FROM areas WHERE active = 1 ORDER BY sort_order ASC, code ASC')
    .all<Area>();
  const areas = areasRes.results || [];

  // Query all available months across audits & historical scores for month picker
  const availableMonthsSet = new Set<string>();
  availableMonthsSet.add(currentMonth);

  try {
    const auditMonthsRes = await c.env.DB
      .prepare("SELECT DISTINCT month FROM audits WHERE status = 'submitted' AND month IS NOT NULL")
      .all<{ month: string }>();
    for (const r of auditMonthsRes.results || []) {
      if (r.month && /^\d{4}-\d{2}$/.test(r.month)) {
        availableMonthsSet.add(r.month);
      }
    }

    const histMonthsRes = await c.env.DB
      .prepare('SELECT DISTINCT year, month FROM historical_monthly_scores WHERE score IS NOT NULL')
      .all<{ year: number; month: string }>();
    for (const r of histMonthsRes.results || []) {
      const y = r.year;
      const m = String(r.month).padStart(2, '0');
      if (y && m) {
        availableMonthsSet.add(`${y}-${m}`);
      }
    }
  } catch (err) {
    console.error('Failed to query available months:', err);
  }

  const availableMonths = Array.from(availableMonthsSet).sort((a, b) => b.localeCompare(a));

  // 3. Current week audits
  const currentWeekAreaScores = await c.env.DB
    .prepare(`
      SELECT a.id as audit_id, a.status, aas.area_id, aas.score, aas.total_penalty
      FROM audits a
      JOIN audit_area_scores aas ON aas.audit_id = a.id
      JOIN areas ar ON ar.id = aas.area_id AND ar.active = 1
      WHERE a.iso_year = ? AND a.iso_week = ?
    `)
    .bind(currentWeekInfo.isoYear, currentWeekInfo.isoWeek)
    .all<any>();

  const currentWeekAuditMap = new Map<number, any>();
  for (const a of currentWeekAreaScores.results || []) {
    currentWeekAuditMap.set(a.area_id, a);
  }

  // 4. Query all historical monthly scores for effective year, current year, and previous year
  const historicalRes = await c.env.DB
    .prepare('SELECT year, month, area_id, score FROM historical_monthly_scores WHERE year = ? OR year = ? OR year = ?')
    .bind(effectiveYear, currentYear, effectiveYear - 1)
    .all<{ year: number; month: string; area_id: number; score: number }>();

  // Map: year_month ('2026_01'..'2026_12') -> Map<area_id, score>
  const historicalByYearMonth = new Map<string, Map<number, number>>();
  const historicalScoresListByYearMonth = new Map<string, number[]>();
  for (const h of historicalRes.results || []) {
    const mStr = String(h.month).padStart(2, '0');
    const ymKey = `${h.year}_${mStr}`;
    if (!historicalByYearMonth.has(ymKey)) {
      historicalByYearMonth.set(ymKey, new Map());
      historicalScoresListByYearMonth.set(ymKey, []);
    }
    historicalByYearMonth.get(ymKey)!.set(h.area_id, h.score);
    historicalScoresListByYearMonth.get(ymKey)!.push(h.score);
  }

  // Precompute average historical score for each year_month
  const historicalAvgByYearMonth = new Map<string, number>();
  for (const [ymKey, scores] of historicalScoresListByYearMonth.entries()) {
    const avg = calculateMonthlyScore(scores);
    if (avg !== null) {
      historicalAvgByYearMonth.set(ymKey, avg);
    }
  }

  // 5. Query all submitted audits in effective year, current year, and previous year
  const yearAuditsRes = await c.env.DB
    .prepare(`
      SELECT a.month, a.iso_year, a.iso_week, aas.area_id, aas.score
      FROM audit_area_scores aas
      JOIN audits a ON a.id = aas.audit_id
      JOIN areas ar ON ar.id = aas.area_id AND ar.active = 1
      WHERE (a.iso_year = ? OR a.iso_year = ? OR a.iso_year = ?) AND a.status = 'submitted' AND aas.score IS NOT NULL
    `)
    .bind(effectiveYear, currentYear, effectiveYear - 1)
    .all<{ month: string; iso_year: number; iso_week: number; area_id: number; score: number }>();

  // Map: ymStr ('2026-01'..'2026-12') -> Map<area_id, number[]>
  const auditedByYearMonth = new Map<string, Map<number, number[]>>();
  for (const a of yearAuditsRes.results || []) {
    const ym = a.month;
    if (!auditedByYearMonth.has(ym)) {
      auditedByYearMonth.set(ym, new Map());
    }
    const areaMap = auditedByYearMonth.get(ym)!;
    if (!areaMap.has(a.area_id)) {
      areaMap.set(a.area_id, []);
    }
    areaMap.get(a.area_id)!.push(a.score);
  }

  // 6. Effective Month Selection & Smart Fallback
  let displayMonth = currentMonth;
  let isFallbackMonth = false;

  if (isCustomRequested) {
    displayMonth = requestedMonthRaw;
    isFallbackMonth = false;
  } else {
    const currentMonthAuditsCount = auditedByYearMonth.get(currentMonth)?.size || 0;
    const currentMonthHistCount =
      historicalByYearMonth.get(`${currentYear}_${currentMonth.slice(5, 7)}`)?.size || 0;
    const hasCurrentMonthData = currentMonthAuditsCount > 0 || currentMonthHistCount > 0;

    if (hasCurrentMonthData) {
      displayMonth = currentMonth;
      isFallbackMonth = false;
    } else {
      // Search backward from current month down to 1 for latest month with data
      const currentMonthNum = parseInt(currentMonth.slice(5, 7), 10);
      let foundMonthStr: string | null = null;
      for (let m = currentMonthNum - 1; m >= 1; m--) {
        const mStr = String(m).padStart(2, '0');
        const ym = `${currentYear}-${mStr}`;
        if (
          (auditedByYearMonth.get(ym)?.size || 0) > 0 ||
          (historicalByYearMonth.get(`${currentYear}_${mStr}`)?.size || 0) > 0
        ) {
          foundMonthStr = mStr;
          break;
        }
      }
      if (foundMonthStr) {
        displayMonth = `${currentYear}-${foundMonthStr}`;
        isFallbackMonth = true;
      }
    }
  }

  const [dispY, dispM] = displayMonth.split('-');
  const auditedForDisplayMonth = auditedByYearMonth.get(displayMonth);
  const historicalForDisplayMonth = historicalByYearMonth.get(`${dispY}_${dispM}`);

  // Calculate previous month string for MoM comparison
  const curY = parseInt(dispY, 10);
  const curM = parseInt(dispM, 10);
  let prevY = curY;
  let prevM = curM - 1;
  if (prevM === 0) {
    prevM = 12;
    prevY = curY - 1;
  }
  const prevMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
  const prevMonthHistKey = `${prevY}_${String(prevM).padStart(2, '0')}`;
  const auditedForPrevMonth = auditedByYearMonth.get(prevMonthStr);
  const historicalForPrevMonth = historicalByYearMonth.get(prevMonthHistKey);

  // Map of previous month scores
  const areaPrevMonthScoresMap = new Map<number, number | null>();
  for (const area of areas) {
    const prevAuditedList = auditedForPrevMonth?.get(area.id) || [];
    const prevHistScore = historicalForPrevMonth?.get(area.id);
    let prevScore: number | null = null;
    if (prevAuditedList.length > 0) {
      prevScore = calculateMonthlyScore(prevAuditedList);
    } else if (prevHistScore !== undefined && prevHistScore !== null) {
      prevScore = Math.round(prevHistScore * 100) / 100;
    }
    areaPrevMonthScoresMap.set(area.id, prevScore);
  }

  // Compute each area's score for displayMonth (audited takes precedence over historical)
  const areaMonthScoresMap = new Map<
    number,
    { score: number | null; source: 'audited' | 'historical' | null; audit_count: number }
  >();
  const allDisplayScoresForAvg: number[] = [];

  for (const area of areas) {
    const auditedList = auditedForDisplayMonth?.get(area.id) || [];
    const histScore = historicalForDisplayMonth?.get(area.id);

    let score: number | null = null;
    let source: 'audited' | 'historical' | null = null;

    if (auditedList.length > 0) {
      score = calculateMonthlyScore(auditedList);
      source = 'audited';
    } else if (histScore !== undefined && histScore !== null) {
      score = Math.round(histScore * 100) / 100;
      source = 'historical';
    }

    if (score !== null) {
      allDisplayScoresForAvg.push(score);
    }

    areaMonthScoresMap.set(area.id, {
      score,
      source,
      audit_count: auditedList.length,
    });
  }

  // Overall monthly average for displayMonth
  const monthlyAvgOverall = calculateMonthlyScore(allDisplayScoresForAvg);

  // Findings counts per area (open, fixed, overdue, repeat)
  const areaFindingsRes = await c.env.DB
    .prepare(`
      SELECT f.area_id,
        SUM(CASE WHEN f.status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN f.status = 'fixed' THEN 1 ELSE 0 END) as fixed_count,
        SUM(CASE WHEN f.status = 'open' AND f.due_date < ? THEN 1 ELSE 0 END) as overdue_count,
        SUM(CASE WHEN f.repeat_level > 1 AND f.status IN ('open', 'fixed') THEN 1 ELSE 0 END) as repeat_count
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE a.status = 'submitted'
      GROUP BY f.area_id
    `)
    .bind(today)
    .all<any>();

  const areaFindingsMap = new Map<number, any>();
  for (const af of areaFindingsRes.results || []) {
    areaFindingsMap.set(af.area_id, {
      open_count: Number(af.open_count || 0),
      fixed_count: Number(af.fixed_count || 0),
      overdue_count: Number(af.overdue_count || 0),
      repeat_count: Number(af.repeat_count || 0),
    });
  }

  // Pre-fetch area managers and auditors for area modal
  const userAreasRes = await c.env.DB
    .prepare(`
      SELECT ua.area_id, ua.role, u.full_name
      FROM user_areas ua
      JOIN users u ON u.id = ua.user_id
      WHERE ua.role IN ('manager', 'auditor')
    `)
    .all<{ area_id: number; role: string; full_name: string }>();

  const areaManagersMap = new Map<number, string>();
  const areaAuditorsMap = new Map<number, string>();
  for (const r of userAreasRes.results || []) {
    if (r.role === 'manager' && !areaManagersMap.has(r.area_id)) {
      areaManagersMap.set(r.area_id, r.full_name);
    } else if (r.role === 'auditor' && !areaAuditorsMap.has(r.area_id)) {
      areaAuditorsMap.set(r.area_id, r.full_name);
    }
  }

  // 12-week trend of average score & Area-level weekly scores
  const trendWeeks: { label: string; isoYear: number; isoWeek: number; monthStr: string; ymKey: string }[] = [];
  let curDate = today;
  if (displayMonth !== currentMonth) {
    const [dy, dm] = displayMonth.split('-').map(Number);
    const lastDayOfMonth = new Date(Date.UTC(dy, dm, 0)).toISOString().slice(0, 10);
    curDate = lastDayOfMonth;
  }

  for (let i = 0; i < 12; i++) {
    const wInfo = getISOWeek(curDate);
    const label = `W${wInfo.isoWeek < 10 ? '0' + wInfo.isoWeek : wInfo.isoWeek}`;
    const mStr = wInfo.month.slice(5, 7);
    trendWeeks.unshift({
      label,
      isoYear: wInfo.isoYear,
      isoWeek: wInfo.isoWeek,
      monthStr: mStr,
      ymKey: `${wInfo.isoYear}_${mStr}`,
    });
    curDate = addDays(wInfo.weekStart, -7);
  }

  const conditions = trendWeeks.map(() => '(iso_year = ? AND iso_week = ?)').join(' OR ');
  const trendParams: number[] = [];
  for (const tw of trendWeeks) {
    trendParams.push(tw.isoYear, tw.isoWeek);
  }

  // Plant-wide weekly scores from audits table
  const allWeeksRes = await c.env.DB
    .prepare(`
      SELECT iso_year, iso_week, score FROM audits
      WHERE status = 'submitted' AND score IS NOT NULL AND (${conditions})
    `)
    .bind(...trendParams)
    .all<{ iso_year: number; iso_week: number; score: number }>();

  // Area-level weekly scores from audit_area_scores joined with audits
  const areaConditions = trendWeeks.map(() => '(a.iso_year = ? AND a.iso_week = ?)').join(' OR ');
  const areaWeeksRes = await c.env.DB
    .prepare(`
      SELECT aas.area_id, a.iso_year, a.iso_week, aas.score
      FROM audit_area_scores aas
      JOIN audits a ON a.id = aas.audit_id
      WHERE a.status = 'submitted' AND aas.score IS NOT NULL AND (${areaConditions})
    `)
    .bind(...trendParams)
    .all<{ area_id: number; iso_year: number; iso_week: number; score: number }>();

  const scoresByYearWeek = new Map<string, number[]>();
  for (const r of allWeeksRes.results || []) {
    const key = `${r.iso_year}_${r.iso_week}`;
    if (!scoresByYearWeek.has(key)) {
      scoresByYearWeek.set(key, []);
    }
    scoresByYearWeek.get(key)!.push(r.score);
  }

  const areaScoreByYearWeek = new Map<string, number>();
  for (const r of areaWeeksRes.results || []) {
    areaScoreByYearWeek.set(`${r.area_id}_${r.iso_year}_${r.iso_week}`, r.score);
  }

  const trendData = trendWeeks.map((tw) => {
    const scores = scoresByYearWeek.get(`${tw.isoYear}_${tw.isoWeek}`) || [];

    if (scores.length > 0) {
      return {
        week: tw.label,
        avg_score: calculateMonthlyScore(scores),
        source: 'audited' as const,
        month: tw.monthStr,
        target,
      };
    }

    const histAvg = historicalAvgByYearMonth.get(tw.ymKey);
    if (histAvg !== undefined) {
      return {
        week: tw.label,
        avg_score: histAvg,
        source: 'historical' as const,
        month: tw.monthStr,
        target,
      };
    }

    return {
      week: tw.label,
      avg_score: null,
      source: null,
      month: tw.monthStr,
      target,
    };
  });

  // Area status for current week and matrix wall with MoM delta & trend
  const currentWeekStatus = areas.map((area) => {
    const audit = currentWeekAuditMap.get(area.id);
    const mInfo = areaMonthScoresMap.get(area.id) || { score: null, source: null, audit_count: 0 };
    const prevScore = areaPrevMonthScoresMap.get(area.id) ?? null;
    const currentScore = mInfo.score;
    const deltaPrevMonth =
      currentScore !== null && prevScore !== null
        ? Math.round((currentScore - prevScore) * 10) / 10
        : null;

    let trendStatus: 'improved' | 'declined' | 'stagnant' | 'stable' | 'unknown' = 'unknown';
    if (deltaPrevMonth !== null) {
      if (deltaPrevMonth > 0) trendStatus = 'improved';
      else if (deltaPrevMonth < 0) trendStatus = (currentScore !== null && currentScore < target) ? 'stagnant' : 'declined';
      else trendStatus = (currentScore !== null && currentScore < target) ? 'stagnant' : 'stable';
    } else if (currentScore !== null && currentScore < target) {
      trendStatus = 'stagnant';
    }

    const fCounts = areaFindingsMap.get(area.id) || {
      open_count: 0,
      fixed_count: 0,
      overdue_count: 0,
      repeat_count: 0,
    };

    const areaTrend12 = trendWeeks.map((tw) => {
      const s = areaScoreByYearWeek.get(`${area.id}_${tw.isoYear}_${tw.isoWeek}`);
      if (s !== undefined && s !== null) {
        return {
          week: tw.label,
          iso_year: tw.isoYear,
          iso_week: tw.isoWeek,
          score: Math.round(s * 10) / 10,
          source: 'audited' as const,
        };
      }

      // Fallback to area's historical monthly score for that week's month if available
      const histScore = historicalByYearMonth.get(tw.ymKey)?.get(area.id);
      if (histScore !== undefined && histScore !== null) {
        return {
          week: tw.label,
          iso_year: tw.isoYear,
          iso_week: tw.isoWeek,
          score: Math.round(histScore * 10) / 10,
          source: 'historical' as const,
        };
      }

      return {
        week: tw.label,
        iso_year: tw.isoYear,
        iso_week: tw.isoWeek,
        score: null,
        source: null,
      };
    });
    const sparkline6 = areaTrend12.slice(-6);

    const completedWeeks = areaTrend12.filter((p) => p.score !== null);
    const lastScore = completedWeeks.length > 0 ? completedWeeks[completedWeeks.length - 1].score : null;
    const lastCompletedWeek = completedWeeks.length > 0 ? completedWeeks[completedWeeks.length - 1] : null;
    const prevScoreWeek = completedWeeks.length > 1 ? completedWeeks[completedWeeks.length - 2].score : null;
    const deltaPrevWeek = lastScore !== null && prevScoreWeek !== null
      ? Math.round((lastScore - prevScoreWeek) * 10) / 10
      : null;

    return {
      area_id: area.id,
      area_code: area.code,
      area_name: area.name,
      audit_id: audit ? audit.id : null,
      status: audit ? audit.status : 'none', // 'submitted', 'draft', or 'none'
      score: audit ? audit.score : null,
      total_penalty: audit ? audit.total_penalty : null,
      passed: audit && audit.score !== null ? isScorePassing(audit.score, target) : null,
      month_avg: currentScore,
      month_source: mInfo.source,
      prev_month_avg: prevScore,
      prev_month_str: prevMonthStr,
      latest_completed_week: lastCompletedWeek
        ? {
            week: lastCompletedWeek.week,
            iso_year: lastCompletedWeek.iso_year,
            iso_week: lastCompletedWeek.iso_week,
            score: lastCompletedWeek.score,
            source: lastCompletedWeek.source,
          }
        : null,
      delta_prev_month: deltaPrevMonth,
      delta_prev_week: deltaPrevWeek,
      trend_status: trendStatus,
      trend_12_weeks: areaTrend12,
      sparkline_6: sparkline6,
      manager_name: areaManagersMap.get(area.id) || null,
      auditor_name: areaAuditorsMap.get(area.id) || null,
      open_count: fCounts.open_count,
      fixed_count: fCounts.fixed_count,
      overdue_count: fCounts.overdue_count,
      repeat_count: fCounts.repeat_count,
    };
  });

  // Ranking & Leaderboard based on displayMonth
  const ranking = areas
    .map((area) => {
      const mInfo = areaMonthScoresMap.get(area.id) || { score: null, source: null, audit_count: 0 };
      const prevScore = areaPrevMonthScoresMap.get(area.id) ?? null;
      const currentScore = mInfo.score;
      const deltaPrevMonth =
        currentScore !== null && prevScore !== null
          ? Math.round((currentScore - prevScore) * 10) / 10
          : null;

      let trendStatus: 'improved' | 'declined' | 'stagnant' | 'stable' | 'unknown' = 'unknown';
      if (deltaPrevMonth !== null) {
        if (deltaPrevMonth > 0) trendStatus = 'improved';
        else if (deltaPrevMonth < 0) trendStatus = (currentScore !== null && currentScore < target) ? 'stagnant' : 'declined';
        else trendStatus = (currentScore !== null && currentScore < target) ? 'stagnant' : 'stable';
      } else if (currentScore !== null && currentScore < target) {
        trendStatus = 'stagnant';
      }

      return {
        area_id: area.id,
        area_code: area.code,
        area_name: area.name,
        month_avg: currentScore,
        month_source: mInfo.source,
        prev_month_avg: prevScore,
        delta_prev_month: deltaPrevMonth,
        trend_status: trendStatus,
        audit_count: mInfo.audit_count,
        passed: currentScore !== null ? isScorePassing(currentScore, target) : null,
      };
    })
    .sort((a, b) => {
      if (a.month_avg === null && b.month_avg === null) return 0;
      if (a.month_avg === null) return 1;
      if (b.month_avg === null) return -1;
      return b.month_avg - a.month_avg;
    });

  const rankedValid = ranking.filter((r) => r.month_avg !== null);
  const topAreas = rankedValid.slice(0, 3);
  const bottomAreas = [...rankedValid].reverse().slice(0, 3);

  // Continuous Improvement Analysis (Top Improvers vs Persistent Lagging / Stagnant Areas)
  const improvementTracked = ranking.map((r) => ({
    area_id: r.area_id,
    area_code: r.area_code,
    area_name: r.area_name,
    current_score: r.month_avg,
    prev_score: r.prev_month_avg,
    delta: r.delta_prev_month,
    status: r.trend_status,
  }));

  const topImprovers = improvementTracked
    .filter((a) => a.delta !== null && a.delta > 0)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
    .slice(0, 4);

  const stagnantAreas = improvementTracked
    .filter((a) => a.status === 'stagnant' || (a.current_score !== null && a.current_score < target))
    .sort((a, b) => {
      const dA = a.delta ?? 0;
      const dB = b.delta ?? 0;
      if (dA !== dB) return dA - dB;
      return (a.current_score ?? 0) - (b.current_score ?? 0);
    })
    .slice(0, 4);

  const improvementAnalysis = {
    prev_month: prevMonthStr,
    current_month: displayMonth,
    top_improvers: topImprovers,
    stagnant_areas: stagnantAreas,
    improved_count: improvementTracked.filter((a) => a.status === 'improved').length,
    declined_count: improvementTracked.filter((a) => a.status === 'declined').length,
    stagnant_count: improvementTracked.filter((a) => a.status === 'stagnant').length,
    total_tracked: improvementTracked.length,
  };

  // 8. Findings count & penalty by S group this month
  const sGroupRes = await c.env.DB
    .prepare(`
      SELECT ci.s_group, COUNT(f.id) as count, SUM(f.applied_penalty) as total_penalty
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      JOIN checklist_items ci ON ci.id = f.item_id
      WHERE a.month = ? AND a.status = 'submitted'
      GROUP BY ci.s_group
      ORDER BY ci.s_group ASC
    `)
    .bind(displayMonth)
    .all<{ s_group: number; count: number; total_penalty: number }>();

  const sGroupMap = new Map<number, { count: number; total_penalty: number }>();
  for (const row of sGroupRes.results || []) {
    sGroupMap.set(row.s_group, {
      count: row.count,
      total_penalty: Number((row.total_penalty || 0).toFixed(2)),
    });
  }

  const sGroups = [1, 2, 3, 4, 5].map((g) => ({
    s_group: g,
    label: `S${g}`,
    count: sGroupMap.get(g)?.count || 0,
    penalty: sGroupMap.get(g)?.total_penalty || 0,
  }));

  // 8.1 Findings matrix per area and per S group this month for Heatmap layout
  const areaSGroupRes = await c.env.DB
    .prepare(`
      SELECT f.area_id, ci.s_group, COUNT(f.id) as count, SUM(f.applied_penalty) as total_penalty
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      JOIN checklist_items ci ON ci.id = f.item_id
      WHERE a.month = ? AND a.status = 'submitted'
      GROUP BY f.area_id, ci.s_group
    `)
    .bind(displayMonth)
    .all<{ area_id: number; s_group: number; count: number; total_penalty: number }>();

  const areaSGroupMap: Record<string, { count: number; penalty: number }> = {};
  for (const row of areaSGroupRes.results || []) {
    areaSGroupMap[`${row.area_id}_${row.s_group}`] = {
      count: row.count,
      penalty: Number((row.total_penalty || 0).toFixed(2)),
    };
  }

  // 9. Alarm and finding count summary
  const openCountRes = await c.env.DB
    .prepare(`
      SELECT COUNT(*) as cnt FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.status = 'open' AND a.status = 'submitted'
    `)
    .first<{ cnt: number }>();

  const overdueCountRes = await c.env.DB
    .prepare(`
      SELECT COUNT(*) as cnt FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.status = 'open' AND a.status = 'submitted' AND f.due_date < ?
    `)
    .bind(today)
    .first<{ cnt: number }>();

  const notImprovedCountRes = await c.env.DB
    .prepare(`
      SELECT COUNT(*) as cnt FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.repeat_level > 1 AND f.status IN ('open', 'fixed') AND a.status = 'submitted'
    `)
    .first<{ cnt: number }>();

  const waitingVerifyCountRes = await c.env.DB
    .prepare(`
      SELECT COUNT(*) as cnt FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.status = 'fixed' AND a.status = 'submitted'
    `)
    .first<{ cnt: number }>();

  // 10. KPI Aggregates for TV Strip
  const currentWeekAuditRow = await c.env.DB
    .prepare('SELECT id, status, score, total_penalty FROM audits WHERE iso_year = ? AND iso_week = ?')
    .bind(currentWeekInfo.isoYear, currentWeekInfo.isoWeek)
    .first<{ id: number; status: string; score: number | null; total_penalty: number | null }>();

  const isCurrentWeekSubmitted = currentWeekAuditRow?.status === 'submitted';

  const weeklySubmittedScores = isCurrentWeekSubmitted
    ? (currentWeekAreaScores.results || [])
        .filter((a: any) => a.score !== null)
        .map((a: any) => a.score)
    : [];
  const weeklyAvg = isCurrentWeekSubmitted && currentWeekAuditRow?.score !== null
    ? currentWeekAuditRow.score
    : calculateMonthlyScore(weeklySubmittedScores);

  // Find the latest completed week score in trendData
  const completedTrendPoints = trendData.filter((p, i) =>
    p.avg_score !== null && (i < trendData.length - 1 || isCurrentWeekSubmitted)
  );
  const latestCompletedPoint = completedTrendPoints.length > 0
    ? completedTrendPoints[completedTrendPoints.length - 1]
    : null;
  const prevCompletedPoint = completedTrendPoints.length > 1
    ? completedTrendPoints[completedTrendPoints.length - 2]
    : null;

  // Previous week / previous period average
  const prevWeekAvg = latestCompletedPoint ? latestCompletedPoint.avg_score : null;
  const weeklyDelta =
    weeklyAvg !== null && prevWeekAvg !== null
      ? Number((weeklyAvg - prevWeekAvg).toFixed(1))
      : (latestCompletedPoint?.avg_score != null && prevCompletedPoint?.avg_score != null
          ? Number((latestCompletedPoint.avg_score - prevCompletedPoint.avg_score).toFixed(1))
          : null);

  // Target meeting counts:
  // If current week is submitted, use current week audits;
  // If not submitted yet, fallback to displayMonth scores!
  let passedAreasCount = 0;
  let auditedAreasCount = 0;
  let warningAreasCount = 0;
  let failingAreasCount = 0;
  let pendingAuditsCount = 0;

  if (isCurrentWeekSubmitted) {
    const validScores = (currentWeekAreaScores.results || []).filter((a: any) => a.score !== null);
    auditedAreasCount = validScores.length;
    passedAreasCount = validScores.filter((a: any) => a.score >= target).length;
    warningAreasCount = validScores.filter((a: any) => a.score >= warningTarget && a.score < target).length;
    failingAreasCount = validScores.filter((a: any) => a.score < warningTarget).length;
    pendingAuditsCount = areas.length - auditedAreasCount;
  } else {
    // Fallback to displayMonth scores
    auditedAreasCount = rankedValid.length;
    passedAreasCount = rankedValid.filter((r) => r.month_avg !== null && r.month_avg >= target).length;
    warningAreasCount = rankedValid.filter((r) => r.month_avg !== null && r.month_avg >= warningTarget && r.month_avg < target).length;
    failingAreasCount = rankedValid.filter((r) => r.month_avg !== null && r.month_avg < warningTarget).length;
    pendingAuditsCount = areas.length - auditedAreasCount;
  }

  // 11. Top Urgent Alarms for Right 4 Cols on Dashboard
  const urgentAlarmsRes = await c.env.DB
    .prepare(`
      SELECT f.id, f.area_id, f.repeat_level, f.applied_penalty, f.due_date, f.status,
             f.description, f.fix_note, f.fixed_at,
             ar.code as area_code, ar.name as area_name,
             ci.code as item_code, ci.content_vi, ci.content_en,
             u_fix.full_name as fixer_name,
             (
               SELECT u.full_name FROM users u
               JOIN user_areas ua ON ua.user_id = u.id
               WHERE ua.area_id = f.area_id AND ua.role = 'manager'
               LIMIT 1
             ) as manager_name,
             (
               SELECT u.full_name FROM users u
               JOIN user_areas ua ON ua.user_id = u.id
               WHERE ua.area_id = f.area_id AND ua.role = 'auditor'
               LIMIT 1
             ) as auditor_name
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      JOIN areas ar ON ar.id = f.area_id
      JOIN checklist_items ci ON ci.id = f.item_id
      LEFT JOIN users u_fix ON u_fix.id = f.fixed_by
      WHERE a.status = 'submitted' AND f.status IN ('open', 'fixed')
      ORDER BY
        CASE WHEN f.status = 'open' AND f.due_date < ? THEN 0
             WHEN f.repeat_level > 1 THEN 1
             WHEN f.status = 'fixed' THEN 2
             ELSE 3
        END ASC,
        f.due_date ASC,
        f.id DESC
      LIMIT 15
    `)
    .bind(today)
    .all<any>();

  const urgentAlarms = (urgentAlarmsRes.results || []).map((f: any) => {
    const diff = daysRemaining(f.due_date, today);
    const isOverdue = f.status === 'open' && diff < 0;

    if (!isAuthenticated) {
      // Redact sensitive internal descriptions and individual staff names on Public TV view
      return {
        id: f.id,
        area_id: f.area_id,
        area_code: f.area_code,
        area_name: f.area_name,
        item_code: f.item_code,
        content_vi: f.content_vi,
        content_en: f.content_en,
        repeat_level: f.repeat_level,
        applied_penalty: f.applied_penalty,
        due_date: f.due_date,
        status: f.status,
        description: '',
        fix_note: '',
        fixer_name: null,
        manager_name: f.area_code ? `${f.area_code} MNG` : 'Area MNG',
        auditor_name: '5S Auditor',
        days_remaining: diff,
        is_overdue: isOverdue,
      };
    }

    return {
      ...f,
      days_remaining: diff,
      is_overdue: isOverdue,
    };
  });

  // 12. Remediation Effectiveness Summary (On-Time Closure Rate, Avg Remediation Time, Repeat Rate)
  const remediationRowsRes = await c.env.DB
    .prepare(`
      SELECT f.id, f.area_id, f.repeat_level, f.status, f.due_date,
             f.fixed_at, f.closed_at, f.created_at, a.audit_date
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE a.status = 'submitted' AND a.iso_year = ?
    `)
    .bind(currentYear)
    .all<RawRemediationRow>();

  const remediationAnalytics = computeRemediationAnalytics(
    remediationRowsRes.results || [],
    areas,
    today
  );

  return c.json({
    today,
    is_authenticated: isAuthenticated,
    current_week: {
      iso_year: currentWeekInfo.isoYear,
      iso_week: currentWeekInfo.isoWeek,
      week_start: currentWeekInfo.weekStart,
      month: currentMonth,
    },
    month_info: {
      current_month: currentMonth,
      display_month: displayMonth,
      selected_month: isCustomRequested ? requestedMonthRaw : null,
      is_fallback: isFallbackMonth,
      is_custom_selection: isCustomRequested,
      has_audits: (auditedForDisplayMonth?.size || 0) > 0,
      available_months: availableMonths,
      source: isFallbackMonth
        ? (historicalForDisplayMonth && historicalForDisplayMonth.size > 0 ? 'historical' : 'audited')
        : ((auditedForDisplayMonth?.size || 0) > 0 ? 'audited' : (historicalForDisplayMonth && historicalForDisplayMonth.size > 0 ? 'historical' : 'none')),
    },
    target,
    warning_target: warningTarget,
    kpi: {
      weekly_avg: weeklyAvg,
      weekly_delta: weeklyDelta,
      prev_week_avg: prevWeekAvg,
      latest_completed_week: latestCompletedPoint ? latestCompletedPoint.week : null,
      latest_completed_avg: latestCompletedPoint ? latestCompletedPoint.avg_score : null,
      monthly_avg_overall: monthlyAvgOverall,
      display_month: displayMonth,
      is_fallback_month: isFallbackMonth,
      is_current_week_submitted: isCurrentWeekSubmitted,
      passed_areas_count: passedAreasCount,
      warning_areas_count: warningAreasCount,
      audited_areas_count: auditedAreasCount,
      failing_areas_count: failingAreasCount,
      pending_audits_count: pendingAuditsCount,
      total_areas_count: areas.length,
    },
    remediation: remediationAnalytics.summary,
    current_week_status: currentWeekStatus,
    monthly_ranking: ranking,
    improvement_analysis: improvementAnalysis,
    top_areas: topAreas,
    bottom_areas: bottomAreas,
    trend_12_weeks: trendData,
    s_group_breakdown: sGroups,
    area_s_matrix: areaSGroupMap,
    urgent_alarms: urgentAlarms,
    counts: {
      open: openCountRes?.cnt || 0,
      overdue: overdueCountRes?.cnt || 0,
      not_improved: notImprovedCountRes?.cnt || 0,
      waiting_verify: waitingVerifyCountRes?.cnt || 0,
    },
    dashboard_layout: dashboardLayout,
  });
});
