import { Hono } from 'hono';
import type { Env, Variables, Area } from '../types';
import { authMiddleware, optionalAuthMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { getISOWeek, getVietnamToday, addDays, daysRemaining } from '../lib/week';
import { calculateMonthlyScore, isScorePassing } from '../lib/scoring';

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
    .prepare('SELECT target FROM yearly_targets WHERE year <= ? ORDER BY year DESC LIMIT 1')
    .bind(year)
    .first<{ target: number }>();
  const target = targetRow ? targetRow.target : 95;

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
    .prepare('SELECT target FROM yearly_targets WHERE year <= ? ORDER BY year DESC LIMIT 1')
    .bind(year)
    .first<{ target: number }>();
  const target = targetRow ? targetRow.target : 95;

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

    if (
      entry.score === null ||
      entry.score === undefined ||
      String(entry.score).trim() === '' ||
      isNaN(Number(entry.score))
    ) {
      await c.env.DB
        .prepare('DELETE FROM historical_monthly_scores WHERE year = ? AND month = ? AND area_id = ?')
        .bind(year, month, areaId)
        .run();
      deletedCount++;
    } else {
      let rawScore = Number(entry.score);
      // Auto-convert ratio (e.g. 0.965 from Excel percentage copy -> 96.5)
      if (rawScore > 0 && rawScore <= 1) {
        rawScore = rawScore * 100;
      }
      const score = Math.max(0, Math.min(100, Math.round(rawScore * 100) / 100));

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

  // 1. Target for current year
  const targetRow = await c.env.DB
    .prepare('SELECT target FROM yearly_targets WHERE year <= ? ORDER BY year DESC LIMIT 1')
    .bind(currentYear)
    .first<{ target: number }>();
  const target = targetRow ? targetRow.target : 95;

  // 2. Active areas
  const areasRes = await c.env.DB
    .prepare('SELECT id, code, name, sort_order FROM areas WHERE active = 1 ORDER BY sort_order ASC, code ASC')
    .all<Area>();
  const areas = areasRes.results || [];

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

  // 4. Current month ranking (AVG score of submitted audits in current month)
  const monthAuditsRes = await c.env.DB
    .prepare(`
      SELECT aas.area_id, aas.score
      FROM audit_area_scores aas
      JOIN audits a ON a.id = aas.audit_id
      JOIN areas ar ON ar.id = aas.area_id AND ar.active = 1
      WHERE a.month = ? AND a.status = 'submitted' AND aas.score IS NOT NULL
    `)
    .bind(currentMonth)
    .all<{ area_id: number; score: number }>();

  const monthScoresByArea = new Map<number, number[]>();
  for (const a of monthAuditsRes.results || []) {
    if (!monthScoresByArea.has(a.area_id)) {
      monthScoresByArea.set(a.area_id, []);
    }
    monthScoresByArea.get(a.area_id)!.push(a.score);
  }

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

  const currentWeekStatus = areas.map((area) => {
    const audit = currentWeekAuditMap.get(area.id);
    const mScores = monthScoresByArea.get(area.id) || [];
    const mAvg = calculateMonthlyScore(mScores);
    const fCounts = areaFindingsMap.get(area.id) || {
      open_count: 0,
      fixed_count: 0,
      overdue_count: 0,
      repeat_count: 0,
    };

    return {
      area_id: area.id,
      area_code: area.code,
      area_name: area.name,
      audit_id: audit ? audit.id : null,
      status: audit ? audit.status : 'none', // 'submitted', 'draft', or 'none'
      score: audit ? audit.score : null,
      total_penalty: audit ? audit.total_penalty : null,
      passed: audit && audit.score !== null ? isScorePassing(audit.score, target) : null,
      month_avg: mAvg,
      open_count: fCounts.open_count,
      fixed_count: fCounts.fixed_count,
      overdue_count: fCounts.overdue_count,
      repeat_count: fCounts.repeat_count,
    };
  });

  const ranking = areas
    .map((area) => {
      const scores = monthScoresByArea.get(area.id) || [];
      const avg = calculateMonthlyScore(scores);
      return {
        area_id: area.id,
        area_code: area.code,
        area_name: area.name,
        month_avg: avg,
        audit_count: scores.length,
        passed: avg !== null ? isScorePassing(avg, target) : null,
      };
    })
    .sort((a, b) => {
      if (a.month_avg === null && b.month_avg === null) return 0;
      if (a.month_avg === null) return 1;
      if (b.month_avg === null) return -1;
      return b.month_avg - a.month_avg;
    });

  // 5. 12-week trend of average score (single query instead of 12)
  const trendWeeks: { label: string; isoYear: number; isoWeek: number }[] = [];
  let curDate = today;
  for (let i = 0; i < 12; i++) {
    const wInfo = getISOWeek(curDate);
    const label = `W${wInfo.isoWeek < 10 ? '0' + wInfo.isoWeek : wInfo.isoWeek}`;
    trendWeeks.unshift({ label, isoYear: wInfo.isoYear, isoWeek: wInfo.isoWeek });
    curDate = addDays(wInfo.weekStart, -7);
  }

  const conditions = trendWeeks.map(() => '(iso_year = ? AND iso_week = ?)').join(' OR ');
  const trendParams: number[] = [];
  for (const tw of trendWeeks) {
    trendParams.push(tw.isoYear, tw.isoWeek);
  }

  const allWeeksRes = await c.env.DB
    .prepare(`
      SELECT iso_year, iso_week, score FROM audits
      WHERE status = 'submitted' AND score IS NOT NULL AND (${conditions})
    `)
    .bind(...trendParams)
    .all<{ iso_year: number; iso_week: number; score: number }>();

  const scoresByYearWeek = new Map<string, number[]>();
  for (const r of allWeeksRes.results || []) {
    const key = `${r.iso_year}_${r.iso_week}`;
    if (!scoresByYearWeek.has(key)) {
      scoresByYearWeek.set(key, []);
    }
    scoresByYearWeek.get(key)!.push(r.score);
  }

  const trendData = trendWeeks.map((tw) => {
    const scores = scoresByYearWeek.get(`${tw.isoYear}_${tw.isoWeek}`) || [];
    return {
      week: tw.label,
      avg_score: calculateMonthlyScore(scores),
      target,
    };
  });

  // 6. Findings count & penalty by S group this month
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
    .bind(currentMonth)
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

  // 7. Alarm and finding count summary
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

  // 8. KPI Aggregates for TV Strip
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

  const monthlySubmittedScores = (monthAuditsRes.results || []).map((a: any) => a.score);
  const monthlyAvgOverall = calculateMonthlyScore(monthlySubmittedScores);

  const passedAreasCount = isCurrentWeekSubmitted
    ? (currentWeekAreaScores.results || [])
        .filter((a: any) => a.score !== null && a.score >= target).length
    : 0;
  const auditedAreasCount = isCurrentWeekSubmitted ? areas.length : 0;
  const failingAreasCount = isCurrentWeekSubmitted
    ? (currentWeekAreaScores.results || [])
        .filter((a: any) => a.score !== null && a.score < target).length
    : 0;
  const pendingAuditsCount = areas.length - auditedAreasCount;

  // Week-over-week delta vs previous week
  const prevWeekAvg = trendData.length >= 2 ? trendData[trendData.length - 2].avg_score : null;
  const weeklyDelta =
    weeklyAvg !== null && prevWeekAvg !== null ? Number((weeklyAvg - prevWeekAvg).toFixed(1)) : null;

  // Top & bottom areas for Leaderboard card
  const rankedValid = ranking.filter((r) => r.month_avg !== null);
  const topAreas = rankedValid.slice(0, 3);
  const bottomAreas = [...rankedValid].reverse().slice(0, 3);

  // 9. Top Urgent Alarms for Right 4 Cols on Dashboard
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
      LIMIT 6
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

  // 10. Remediation Effectiveness Summary (On-Time Closure Rate, Avg Remediation Time, Repeat Rate)
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
    target,
    kpi: {
      weekly_avg: weeklyAvg,
      weekly_delta: weeklyDelta,
      prev_week_avg: prevWeekAvg,
      monthly_avg_overall: monthlyAvgOverall,
      passed_areas_count: passedAreasCount,
      audited_areas_count: auditedAreasCount,
      failing_areas_count: failingAreasCount,
      pending_audits_count: pendingAuditsCount,
      total_areas_count: areas.length,
    },
    remediation: remediationAnalytics.summary,
    current_week_status: currentWeekStatus,
    monthly_ranking: ranking,
    top_areas: topAreas,
    bottom_areas: bottomAreas,
    trend_12_weeks: trendData,
    s_group_breakdown: sGroups,
    urgent_alarms: urgentAlarms,
    counts: {
      open: openCountRes?.cnt || 0,
      overdue: overdueCountRes?.cnt || 0,
      not_improved: notImprovedCountRes?.cnt || 0,
      waiting_verify: waitingVerifyCountRes?.cnt || 0,
    },
  });
});
