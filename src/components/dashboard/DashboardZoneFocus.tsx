import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatScore, formatDelta } from '../../lib/format';
import type { TranslationKey } from '../../i18n/context';
import { AreaSparkline } from './AreaSparkline';
import { AreaTrendModal } from './AreaTrendModal';

interface Props {
  data: any;
  lang: 'vi' | 'en';
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  is_authenticated: boolean;
  target: number;
  warningTarget: number;
  formatMonthYear: (m?: string) => string;
  getMonthShortName: (m?: string) => string;
}

export const DashboardZoneFocus: React.FC<Props> = ({
  data,
  lang,
  t,
  is_authenticated,
  target,
  warningTarget,
  formatMonthYear,
  getMonthShortName,
}) => {
  const {
    kpi,
    current_week,
    current_week_status = [],
    trend_12_weeks = [],
    s_group_breakdown = [],
    month_info,
    remediation,
    improvement_analysis,
    area_s_matrix = {},
    counts = { open: 0, overdue: 0, not_improved: 0, waiting_verify: 0 },
  } = data;

  const [leftTab, setLeftTab] = useState<'improvement' | '5s' | 'leaderboard'>('improvement');
  const [selectedTrendArea, setSelectedTrendArea] = useState<any | null>(null);

  const isCurrentWeekAudited = kpi?.weekly_avg !== null && kpi?.weekly_avg !== undefined;
  const isFallbackWeek = !isCurrentWeekAudited && kpi?.latest_completed_avg !== null && kpi?.latest_completed_avg !== undefined;
  const effectiveWeeklyScore = isCurrentWeekAudited ? kpi.weekly_avg : isFallbackWeek ? kpi.latest_completed_avg : null;
  const effectiveWeeklyWeekName = isCurrentWeekAudited
    ? `W${current_week.iso_week}`
    : isFallbackWeek && kpi.latest_completed_week
    ? kpi.latest_completed_week
    : `W${current_week.iso_week}`;

  const totalOverdue = counts.overdue || 0;
  const overallScore = kpi?.monthly_avg_overall ?? effectiveWeeklyScore ?? 0;
  const isOverallPass = overallScore >= target;
  const isOverallWarn = overallScore >= warningTarget && overallScore < target;

  // Class helpers
  const passBadgeCls = 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  const warnBadgeCls = 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  const failBadgeCls = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';

  const passTextCls = 'text-emerald-400';
  const warnTextCls = 'text-amber-400';
  const failTextCls = 'text-rose-400';
  const mutedTextCls = 'text-slate-400';
  const headingTextCls = 'text-slate-100';

  // Group 16 areas into 2 factory divisions: Production & Support
  const productionKeywords = [
    'knit', 'dye', 'bat', 'set', 'vap', 'gqc', 'fqc', 'l-dip', 'l-tes', 'unt',
    'det', 'nhuom', 'dinh luong', 'cang', 'hap', 'kiem', 'lab',
  ];

  const productionAreas: any[] = [];
  const supportAreas: any[] = [];

  for (const a of current_week_status) {
    const haystack = `${a.area_code} ${a.area_name}`.toLowerCase();
    const isProd = productionKeywords.some((kw) => haystack.includes(kw));
    if (isProd) {
      productionAreas.push(a);
    } else {
      supportAreas.push(a);
    }
  }

  const computeGroupStats = (areasList: any[]) => {
    const validScores = areasList
      .map((a: any) => (a.status === 'submitted' && a.score !== null ? a.score : a.month_avg))
      .filter((s: any) => s !== null && s !== undefined && !isNaN(s));
    const avg = validScores.length > 0
      ? Number((validScores.reduce((acc: number, val: number) => acc + Number(val), 0) / validScores.length).toFixed(1))
      : null;

    const validPrevScores = areasList
      .map((a: any) => a.prev_month_avg)
      .filter((s: any) => s !== null && s !== undefined && !isNaN(s));
    const prevAvg = validPrevScores.length > 0
      ? Number((validPrevScores.reduce((acc: number, val: number) => acc + Number(val), 0) / validPrevScores.length).toFixed(1))
      : null;

    const groupDelta = avg !== null && prevAvg !== null ? Number((avg - prevAvg).toFixed(1)) : null;

    const passedCount = validScores.filter((s) => s >= target).length;
    const warningCount = validScores.filter((s) => s >= warningTarget && s < target).length;
    const failCount = validScores.filter((s) => s < warningTarget).length;
    const totalOpen = areasList.reduce((acc: number, a: any) => acc + (a.open_count || 0), 0);
    const totalOverdue = areasList.reduce((acc: number, a: any) => acc + (a.overdue_count || 0), 0);

    return { avg, prevAvg, groupDelta, passedCount, warningCount, failCount, totalOpen, totalOverdue };
  };

  const prodStats = computeGroupStats(productionAreas);
  const suppStats = computeGroupStats(supportAreas);

  const maxGroupFindings = Math.max(1, ...s_group_breakdown.map((g: any) => g.count || 0));

  // Improvement metrics from improvement_analysis
  const topImprovers = improvement_analysis?.top_improvers || [];
  const stagnantAreas = improvement_analysis?.stagnant_areas || [];

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col lg:flex-row gap-2.5 sm:gap-3 overflow-y-auto overflow-x-hidden pb-2 select-none">
      {/* LEFT COLUMN: 32% COMMAND & KAISEN INSIGHTS */}
      <div className="w-full lg:w-[32%] shrink-0 flex flex-col gap-2.5 h-full">
        {/* HERO CIRCULAR GAUGE CARD */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-2.5 sm:p-3 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {t('overall_factory_compliance')}
              </span>
              <div className="text-xs font-bold text-slate-200">
                {formatMonthYear(month_info?.display_month || current_week.month)}
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-black ${
                isOverallPass ? passBadgeCls : isOverallWarn ? warnBadgeCls : failBadgeCls
              }`}
            >
              {isOverallPass ? t('tag_pass') : isOverallWarn ? t('tag_warning') : t('tag_fail')}
            </span>
          </div>

          {/* Radial Circular Progress Gauge */}
          <div className="my-1.5 flex items-center justify-center gap-3">
            <div className="relative w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={
                    isOverallPass
                      ? 'stroke-emerald-500'
                      : isOverallWarn
                      ? 'stroke-amber-400'
                      : 'stroke-rose-500'
                  }
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 40 * (1 - Math.min(100, Math.max(0, overallScore)) / 100)
                  }`}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl sm:text-2xl font-black font-mono leading-none ${isOverallPass ? passTextCls : isOverallWarn ? warnTextCls : failTextCls}`}>
                  {formatScore(overallScore, lang)}
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">
                  {t('target')}: ≥{target}%
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-1 text-xs">
              <div className="flex items-center justify-between gap-2 text-slate-300">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>{t('weekly_avg_kpi', { week: effectiveWeeklyWeekName })}:</span>
                  {isFallbackWeek && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {t('latest_week_badge')}
                    </span>
                  )}
                </span>
                <strong className={`font-mono font-bold ${
                  effectiveWeeklyScore === null
                    ? 'text-slate-400'
                    : effectiveWeeklyScore >= target
                    ? passTextCls
                    : effectiveWeeklyScore >= warningTarget
                    ? warnTextCls
                    : failTextCls
                }`}>
                  {effectiveWeeklyScore !== null ? formatScore(effectiveWeeklyScore, lang) : t('waiting_audit_badge')}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-300">
                <span className="text-[11px] text-slate-400">
                  {t('vs_prev_week')}{isFallbackWeek ? ` (${t('pending_audit_week', { week: current_week.iso_week })}):` : ':'}
                </span>
                <span className={`text-[11px] font-mono font-bold ${
                  (kpi?.weekly_delta ?? 0) >= 0 ? passTextCls : failTextCls
                }`}>
                  {kpi?.weekly_delta !== null && kpi?.weekly_delta !== undefined
                    ? formatDelta(kpi.weekly_delta, lang)
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-300">
                <span className="text-[11px] text-slate-400">{t('areas_meeting_target')}:</span>
                <span className="font-bold text-sky-400 font-mono text-[11px]">
                  {kpi?.passed_areas_count || 0} / {kpi?.audited_areas_count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TABBED KAISEN & 5S INSIGHTS CARD */}
        <div className="flex-1 rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 flex flex-col gap-2 shadow-lg min-h-[220px]">
          {/* Tab Selector Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-1">
            <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setLeftTab('improvement')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  leftTab === 'improvement'
                    ? 'bg-sky-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('continuous_improvement_title')}
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('5s')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  leftTab === '5s'
                    ? 'bg-sky-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                5S Pillars
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('leaderboard')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  leftTab === 'leaderboard'
                    ? 'bg-sky-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Top / Bottom
              </button>
            </div>
            <Link to="/reports" className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition">
              {t('reports')} →
            </Link>
          </div>

          {/* TAB 1: CONTINUOUS IMPROVEMENT (MoM DELTA & STAGNANT TRACKER) */}
          {leftTab === 'improvement' && (
            <div className="flex-1 flex flex-col justify-between gap-2 py-1">
              {/* Top Improvers */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between pb-1">
                  <span>{t('top_improvers_title')}</span>
                  <span className="text-slate-500 text-[9px]">{t('vs_prev_month')}</span>
                </div>
                {topImprovers.length > 0 ? (
                  <div className="space-y-1">
                    {topImprovers.slice(0, 3).map((item: any) => (
                      <div
                        key={item.area_id}
                        className="px-2 py-1 rounded bg-emerald-950/30 border border-emerald-500/25 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-[11px] truncate text-emerald-200" title={item.area_name}>
                          {item.area_name || item.area_code}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] text-slate-300">
                            {formatScore(item.current_score, lang)}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                            ▲ +{item.delta}{t('pts_unit')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs italic text-slate-500 py-1">{t('no_improvers')}</div>
                )}
              </div>

              {/* Stagnant / Needs Kaizen Attention */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between pb-1">
                  <span>{t('stagnant_areas_title')}</span>
                  <span className="text-slate-500 text-[9px]">&lt;{target}%</span>
                </div>
                {stagnantAreas.length > 0 ? (
                  <div className="space-y-1">
                    {stagnantAreas.slice(0, 3).map((item: any) => (
                      <div
                        key={item.area_id}
                        className="px-2 py-1 rounded bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-[11px] truncate text-rose-200" title={item.area_name}>
                          {item.area_name || item.area_code}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-[11px] text-rose-300">
                            {formatScore(item.current_score, lang)}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                            item.delta !== null && item.delta < 0
                              ? 'bg-rose-500/25 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {item.delta !== null && item.delta < 0
                              ? `▼ ${item.delta}${t('pts_unit')}`
                              : item.delta !== null && item.delta > 0
                              ? `▲ +${item.delta}${t('pts_unit')}`
                              : `▬ 0.0${t('pts_unit')}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs italic text-slate-500 py-1">{t('no_stagnant')}</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 5S PILLARS BREAKDOWN */}
          {leftTab === '5s' && (
            <div className="flex-1 flex flex-col justify-around py-1">
              {s_group_breakdown.map((group: any) => {
                const widthPct = Math.round(((group.count || 0) / maxGroupFindings) * 100);
                const barColor =
                  group.s_group === 2
                    ? 'bg-rose-500'
                    : group.s_group === 3
                    ? 'bg-amber-500'
                    : group.s_group === 1
                    ? 'bg-blue-500'
                    : group.s_group === 4
                    ? 'bg-indigo-500'
                    : 'bg-emerald-500';

                const sNames: Record<number, string> = {
                  1: 'S1 · Sort',
                  2: 'S2 · Set in order',
                  3: 'S3 · Shine',
                  4: 'S4 · Standardize',
                  5: 'S5 · Sustain',
                };

                return (
                  <div key={group.s_group} className="grid grid-cols-12 items-center gap-2 text-xs py-0.5">
                    <span className="col-span-4 font-semibold truncate text-[11px] text-slate-300">
                      {sNames[group.s_group] || `S${group.s_group}`}
                    </span>
                    <div className="col-span-4 h-2 rounded-full overflow-hidden bg-slate-800">
                      <div className={`h-full ${barColor}`} style={{ width: `${Math.max(4, widthPct)}%` }} />
                    </div>
                    <span className={`col-span-4 text-right font-mono font-bold text-[10px] whitespace-nowrap ${failTextCls}`}>
                      {group.count} {t('findings_unit')} (-{group.penalty}{t('pts_unit')})
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: TOP & BOTTOM LEADERBOARD */}
          {leftTab === 'leaderboard' && (
            <div className="flex-1 flex flex-col justify-around py-1 gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block pb-1">
                  Top 2 Điểm cao
                </span>
                <div className="space-y-1">
                  {current_week_status
                    .slice()
                    .filter((a: any) => a.month_avg !== null)
                    .sort((a: any, b: any) => (b.month_avg || 0) - (a.month_avg || 0))
                    .slice(0, 2)
                    .map((a: any, idx: number) => (
                      <div key={a.area_id} className="p-1.5 rounded bg-emerald-950/30 border border-emerald-500/25 flex items-center justify-between">
                        <span className="font-bold text-[11px] truncate text-emerald-200">
                          {idx === 0 ? '🏆 1.' : '🥈 2.'} {a.area_name || a.area_code}
                        </span>
                        <span className="font-mono font-black text-xs text-emerald-400">
                          {formatScore(a.month_avg, lang)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block pb-1">
                  Top 2 Điểm thấp
                </span>
                <div className="space-y-1">
                  {current_week_status
                    .slice()
                    .filter((a: any) => a.month_avg !== null)
                    .sort((a: any, b: any) => (a.month_avg || 0) - (b.month_avg || 0))
                    .slice(0, 2)
                    .map((a: any) => (
                      <div key={a.area_id} className="p-1.5 rounded bg-rose-950/30 border border-rose-500/30 flex items-center justify-between">
                        <span className="font-bold text-[11px] truncate text-rose-200">
                          ⚠️ {a.area_name || a.area_code}
                        </span>
                        <span className="font-mono font-black text-xs text-rose-400">
                          {formatScore(a.month_avg, lang)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* URGENT OPERATIONAL ALARMS MINI STRIP */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>🚨</span>
            <span className="font-bold">{t('alarm_7_days')}:</span>
            <span className={`font-mono font-black ${totalOverdue > 0 ? failTextCls : passTextCls}`}>
              {totalOverdue}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>⚠️</span>
            <span className="font-bold">{t('repeat_findings_label')}:</span>
            <span className="font-mono font-black text-purple-300">
              {counts.not_improved || 0}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>⚡</span>
            <span className="font-bold">{t('on_time')}:</span>
            <span className={`font-mono font-black ${passTextCls}`}>
              {formatScore(remediation?.on_time_rate_pct, lang)}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: 68% PRODUCTION & SUPPORT DIVISIONS */}
      <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-3 h-full">
        {/* DIVISION 1: KHỐI SẢN XUẤT (PRODUCTION) */}
        <div className="flex-[1.4] min-h-[260px] rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 shadow-lg flex flex-col justify-between gap-2.5">
          {/* Division Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🏭</span>
              <div>
                <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                  <span>{t('workshop_group_production')}</span>
                  <span className="px-2 py-0.2 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] font-mono font-bold">
                    {productionAreas.length} {t('areas')}
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[11px]">{t('group_avg_score')}:</span>
                <span className={`font-mono font-black text-sm ${
                  prodStats.avg !== null && prodStats.avg >= target
                    ? passTextCls
                    : prodStats.avg !== null && prodStats.avg >= warningTarget
                    ? warnTextCls
                    : failTextCls
                }`}>
                  {formatScore(prodStats.avg, lang)}
                </span>
                {prodStats.groupDelta !== null && (
                  <span className={`text-[10px] font-mono font-bold ${prodStats.groupDelta >= 0 ? passTextCls : failTextCls}`}>
                    ({prodStats.groupDelta >= 0 ? `▲+${prodStats.groupDelta}` : `▼${prodStats.groupDelta}`}{t('pts_unit')})
                  </span>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {prodStats.passedCount} PASS
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {prodStats.warningCount} WARN
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  {prodStats.failCount} FAIL
                </span>
              </div>
            </div>
          </div>

          {/* Area Cards Grid: 2 cols on mobile, 5 cols on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {productionAreas.map((area) => {
              const isSubmitted = area.status === 'submitted' && area.score !== null;
              const isPass = area.score !== null && area.score >= target;
              const isWarning = area.score !== null && area.score >= warningTarget && area.score < target;
              const isFail = area.score !== null && area.score < warningTarget;
              const isOverdue = area.overdue_count > 0;
              const delta = area.delta_prev_month;

              const cardBorder = isOverdue
                ? 'border-rose-500/80 bg-rose-950/25 ring-1 ring-rose-500/30'
                : isPass
                ? 'border-emerald-500/35 bg-emerald-950/15'
                : isWarning
                ? 'border-amber-500/40 bg-amber-950/20'
                : isFail
                ? 'border-rose-500/60 bg-rose-950/20'
                : 'border-slate-800 bg-slate-900/60';

              return (
                <div
                  key={area.area_id}
                  onClick={() => setSelectedTrendArea(area)}
                  className={`rounded-lg border ${cardBorder} p-1.5 sm:p-2 flex flex-col justify-between hover:border-sky-400 transition cursor-pointer group min-h-0 overflow-hidden`}
                  title={t('click_to_inspect_area')}
                >
                  {/* Row 1: Area Name & Sparkline */}
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span
                      className="font-bold text-xs truncate group-hover:text-sky-300 transition text-slate-100 max-w-[58%]"
                      title={`${area.area_name} (${area.area_code})`}
                    >
                      {area.area_name || area.area_code}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {delta !== null && delta > 0 ? (
                        <span className="text-emerald-400 font-bold text-[10px]">↗</span>
                      ) : delta !== null && delta < 0 ? (
                        <span className="text-rose-400 font-bold text-[10px]">↘</span>
                      ) : (
                        <span className="text-slate-500 font-bold text-[10px]">➔</span>
                      )}
                      <AreaSparkline
                        data={area.sparkline_6 || []}
                        target={target}
                        warningTarget={warningTarget}
                        width={44}
                        height={12}
                      />
                    </div>
                  </div>

                  {/* Row 2: Dual Telemetry Baseline */}
                  <div className="flex items-baseline justify-between gap-1 my-0.5 min-w-0">
                    <div className="flex items-baseline gap-1 min-w-0 truncate">
                      <span className="text-[9px] uppercase font-bold text-slate-400 shrink-0">
                        {`W${current_week.iso_week}`}:
                      </span>
                      <span className={`text-xs sm:text-[13px] font-black font-mono leading-none ${
                        isSubmitted ? (isPass ? passTextCls : isWarning ? warnTextCls : failTextCls) : 'text-slate-400 text-[10px] font-bold'
                      }`}>
                        {isSubmitted ? formatScore(area.score, lang) : t('tag_pending')}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 justify-end min-w-0 truncate text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 shrink-0">
                        {getMonthShortName(month_info?.display_month || current_week.month)}:
                      </span>
                      <span className={`text-xs sm:text-[13px] font-black font-mono leading-none ${
                        area.month_avg !== null ? (area.month_avg >= target ? passTextCls : area.month_avg >= warningTarget ? warnTextCls : failTextCls) : 'text-slate-400'
                      }`}>
                        {formatScore(area.month_avg, lang)}
                      </span>
                      {delta !== null && (
                        <span className={`text-[9px] font-mono font-bold shrink-0 ${delta > 0 ? passTextCls : delta < 0 ? failTextCls : mutedTextCls}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Status Badge & Footer */}
                  <div className="flex items-center justify-between text-[10px] border-t border-slate-800/80 pt-0.5 text-slate-400">
                    <div className="shrink-0">
                      {isOverdue ? (
                        <span className="px-1 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold shrink-0">
                          🚨{area.overdue_count}
                        </span>
                      ) : isSubmitted ? (
                        isPass ? (
                          <span className="text-[10px] font-bold text-emerald-400 shrink-0">PASS</span>
                        ) : isWarning ? (
                          <span className="text-[10px] font-bold text-amber-400 shrink-0">WARN</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 shrink-0">FAIL</span>
                        )
                      ) : (
                        <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                          {t('badge_pending_week', { week: current_week.iso_week })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] shrink-0 font-mono">
                      <span>
                        {t('open_short')}: <strong className={area.open_count > 0 ? 'text-amber-400' : 'text-slate-300'}>{area.open_count}</strong>
                      </span>
                      <span>
                        {t('verify_short')}: <strong className="text-slate-300">{area.fixed_count}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DIVISION 2: KHỐI PHỤ TRỢ (SUPPORT & UTILITY) */}
        <div className="flex-1 min-h-[200px] rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 shadow-lg flex flex-col justify-between gap-2.5">
          {/* Division Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <div>
                <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                  <span>{t('workshop_group_support')}</span>
                  <span className="px-2 py-0.2 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-mono font-bold">
                    {supportAreas.length} {t('areas')}
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[11px]">{t('group_avg_score')}:</span>
                <span className={`font-mono font-black text-sm ${
                  suppStats.avg !== null && suppStats.avg >= target
                    ? passTextCls
                    : suppStats.avg !== null && suppStats.avg >= warningTarget
                    ? warnTextCls
                    : failTextCls
                }`}>
                  {formatScore(suppStats.avg, lang)}
                </span>
                {suppStats.groupDelta !== null && (
                  <span className={`text-[10px] font-mono font-bold ${suppStats.groupDelta >= 0 ? passTextCls : failTextCls}`}>
                    ({suppStats.groupDelta >= 0 ? `▲+${suppStats.groupDelta}` : `▼${suppStats.groupDelta}`}{t('pts_unit')})
                  </span>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {suppStats.passedCount} PASS
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {suppStats.warningCount} WARN
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  {suppStats.failCount} FAIL
                </span>
              </div>
            </div>
          </div>

          {/* Area Cards Grid: 2 cols on mobile, 3/6 cols on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {supportAreas.map((area) => {
              const isSubmitted = area.status === 'submitted' && area.score !== null;
              const isPass = area.score !== null && area.score >= target;
              const isWarning = area.score !== null && area.score >= warningTarget && area.score < target;
              const isFail = area.score !== null && area.score < warningTarget;
              const isOverdue = area.overdue_count > 0;
              const delta = area.delta_prev_month;

              const cardBorder = isOverdue
                ? 'border-rose-500/80 bg-rose-950/25 ring-1 ring-rose-500/30'
                : isPass
                ? 'border-emerald-500/35 bg-emerald-950/15'
                : isWarning
                ? 'border-amber-500/40 bg-amber-950/20'
                : isFail
                ? 'border-rose-500/60 bg-rose-950/20'
                : 'border-slate-800 bg-slate-900/60';

              return (
                <div
                  key={area.area_id}
                  onClick={() => setSelectedTrendArea(area)}
                  className={`rounded-lg border ${cardBorder} p-1.5 sm:p-2 flex flex-col justify-between hover:border-amber-400 transition cursor-pointer group min-h-0 overflow-hidden`}
                  title={t('click_to_inspect_area')}
                >
                  {/* Row 1: Area Name & Sparkline */}
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span
                      className="font-bold text-xs truncate group-hover:text-amber-300 transition text-slate-100 max-w-[58%]"
                      title={`${area.area_name} (${area.area_code})`}
                    >
                      {area.area_name || area.area_code}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {delta !== null && delta > 0 ? (
                        <span className="text-emerald-400 font-bold text-[10px]">↗</span>
                      ) : delta !== null && delta < 0 ? (
                        <span className="text-rose-400 font-bold text-[10px]">↘</span>
                      ) : (
                        <span className="text-slate-500 font-bold text-[10px]">➔</span>
                      )}
                      <AreaSparkline
                        data={area.sparkline_6 || []}
                        target={target}
                        warningTarget={warningTarget}
                        width={44}
                        height={12}
                      />
                    </div>
                  </div>

                  {/* Row 2: Dual Telemetry Baseline */}
                  <div className="flex items-baseline justify-between gap-1 my-0.5 min-w-0">
                    <div className="flex items-baseline gap-1 min-w-0 truncate">
                      <span className="text-[9px] uppercase font-bold text-slate-400 shrink-0">
                        {`W${current_week.iso_week}`}:
                      </span>
                      <span className={`text-xs sm:text-[13px] font-black font-mono leading-none ${
                        isSubmitted ? (isPass ? passTextCls : isWarning ? warnTextCls : failTextCls) : 'text-slate-400 text-[10px] font-bold'
                      }`}>
                        {isSubmitted ? formatScore(area.score, lang) : t('tag_pending')}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 justify-end min-w-0 truncate text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 shrink-0">
                        {getMonthShortName(month_info?.display_month || current_week.month)}:
                      </span>
                      <span className={`text-xs sm:text-[13px] font-black font-mono leading-none ${
                        area.month_avg !== null ? (area.month_avg >= target ? passTextCls : area.month_avg >= warningTarget ? warnTextCls : failTextCls) : 'text-slate-400'
                      }`}>
                        {formatScore(area.month_avg, lang)}
                      </span>
                      {delta !== null && (
                        <span className={`text-[9px] font-mono font-bold shrink-0 ${delta > 0 ? passTextCls : delta < 0 ? failTextCls : mutedTextCls}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Status Badge & Footer */}
                  <div className="flex items-center justify-between text-[10px] border-t border-slate-800/80 pt-0.5 text-slate-400">
                    <div className="shrink-0">
                      {isOverdue ? (
                        <span className="px-1 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold shrink-0">
                          🚨{area.overdue_count}
                        </span>
                      ) : isSubmitted ? (
                        isPass ? (
                          <span className="text-[10px] font-bold text-emerald-400 shrink-0">PASS</span>
                        ) : isWarning ? (
                          <span className="text-[10px] font-bold text-amber-400 shrink-0">WARN</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 shrink-0">FAIL</span>
                        )
                      ) : (
                        <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                          {t('badge_pending_week', { week: current_week.iso_week })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] shrink-0 font-mono">
                      <span>
                        {t('open_short')}: <strong className={area.open_count > 0 ? 'text-amber-400' : 'text-slate-300'}>{area.open_count}</strong>
                      </span>
                      <span>
                        {t('verify_short')}: <strong className="text-slate-300">{area.fixed_count}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 12-WEEK TREND LINE */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-lg flex flex-col gap-1.5 h-44 sm:h-48">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t('trend_title')}
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-emerald-400 font-bold">{t('target')}: ≥{target}%</span>
              <span className="text-amber-400 font-bold">{t('tag_warning')}: {warningTarget}%</span>
            </div>
          </div>

          <div className="flex-1 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend_12_weeks} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: any) => [`${formatScore(val, lang)}`, t('score')]}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                />
                <ReferenceLine y={target} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine y={warningTarget} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.2} />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  connectNulls
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#38bdf8' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Area Trend Inspector Modal */}
      <AreaTrendModal
        isOpen={!!selectedTrendArea}
        onClose={() => setSelectedTrendArea(null)}
        area={selectedTrendArea}
        target={target}
        warningTarget={warningTarget}
        currentWeek={current_week}
        monthInfo={month_info}
        areaSMatrix={area_s_matrix}
        lang={lang}
        t={t}
      />
    </div>
  );
};
