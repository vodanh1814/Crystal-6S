import React from 'react';
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
    top_areas = [],
    bottom_areas = [],
    month_info,
    remediation,
    counts = { open: 0, overdue: 0, not_improved: 0, waiting_verify: 0 },
  } = data;

  const totalOverdue = counts.overdue || 0;
  const overallScore = kpi?.monthly_avg_overall ?? kpi?.weekly_avg ?? 0;
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

  // Group 16 areas into 4 production clusters
  const clusters = [
    {
      id: 'cluster_dyeing_knitting',
      title: t('workshop_cluster_dyeing_knitting'),
      match: ['knit', 'dye', 'greige', 'lab', 'det', 'nhuom'],
      accent: 'border-l-sky-500',
      badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    },
    {
      id: 'cluster_finishing',
      title: t('workshop_cluster_finishing'),
      match: ['set', 'vap', 'mtn', 'util', 'dien', 'hoan tat'],
      accent: 'border-l-indigo-500',
      badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
    },
    {
      id: 'cluster_logistics',
      title: t('workshop_cluster_logistics'),
      match: ['ware', 'kho', 'batch', 'final', 'tsc', 'kiem pham'],
      accent: 'border-l-amber-500',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    },
    {
      id: 'cluster_office',
      title: t('workshop_cluster_office'),
      match: ['adm', 'fm', 'cfd', 'van phong', 'facility'],
      accent: 'border-l-emerald-500',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    },
  ];

  const assigned = new Set<number>();
  const clusterGroups = clusters.map((c) => {
    const areasInCluster = current_week_status.filter((a: any) => {
      if (assigned.has(a.area_id)) return false;
      const haystack = `${a.area_code} ${a.area_name}`.toLowerCase();
      const matched = c.match.some((m) => haystack.includes(m));
      if (matched) assigned.add(a.area_id);
      return matched;
    });
    return { ...c, areas: areasInCluster };
  });

  // Assign any remaining areas to cluster 4
  const remaining = current_week_status.filter((a: any) => !assigned.has(a.area_id));
  if (remaining.length > 0 && clusterGroups[3]) {
    clusterGroups[3].areas.push(...remaining);
  }

  // Calculate cluster scores
  const clustersWithScores = clusterGroups.map((c) => {
    const validScores = c.areas
      .map((a: any) => (a.status === 'submitted' && a.score !== null ? a.score : a.month_avg))
      .filter((s: any) => s !== null && s !== undefined && !isNaN(s));
    const avg = validScores.length > 0
      ? Number((validScores.reduce((acc: number, val: number) => acc + Number(val), 0) / validScores.length).toFixed(1))
      : null;
    const totalOpen = c.areas.reduce((acc: number, a: any) => acc + (a.open_count || 0), 0);
    const totalOverdue = c.areas.reduce((acc: number, a: any) => acc + (a.overdue_count || 0), 0);
    return { ...c, clusterAvg: avg, totalOpen, totalOverdue };
  });

  const maxGroupFindings = Math.max(1, ...s_group_breakdown.map((g: any) => g.count || 0));

  return (
    <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 lg:gap-3.5">
      {/* LEFT COLUMN: 35% COMMAND COLUMN */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
        {/* HERO CIRCULAR GAUGE CARD */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3.5 sm:p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {t('overall_factory_compliance')}
              </span>
              <div className="text-xs font-bold text-slate-200">
                {t('monthly_avg_kpi', {
                  month: formatMonthYear(month_info?.display_month || current_week.month),
                })}
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
          <div className="my-3 flex items-center justify-center gap-4">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-800"
                  strokeWidth="9"
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
                  strokeWidth="9"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * Math.min(100, Math.max(0, overallScore))) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black font-mono leading-none text-white">
                  {formatScore(overallScore, lang)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ≥{target}%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs min-w-0">
              <div className="flex items-center justify-between gap-3 text-slate-300">
                <span className="text-[11px] text-slate-400">{t('weekly_avg_kpi', { week: `W${current_week.iso_week}` })}:</span>
                <strong className={`font-mono font-bold ${kpi?.weekly_avg >= target ? passTextCls : kpi?.weekly_avg >= warningTarget ? warnTextCls : failTextCls}`}>
                  {kpi?.weekly_avg !== null ? formatScore(kpi?.weekly_avg, lang) : t('waiting_audit_badge')}
                </strong>
              </div>
              {kpi?.weekly_delta !== null && (
                <div className="flex items-center justify-between gap-3 text-slate-300">
                  <span className="text-[11px] text-slate-400">{t('score')}:</span>
                  <span className={`text-[11px] font-bold ${kpi.weekly_delta >= 0 ? passTextCls : failTextCls}`}>
                    {formatDelta(kpi.weekly_delta, lang)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 text-slate-300">
                <span className="text-[11px] text-slate-400">{t('areas_meeting_target')}:</span>
                <span className="font-bold text-sky-400 font-mono text-[11px]">
                  {kpi?.passed_areas_count || 0} / {kpi?.audited_areas_count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5S PILLARS BREAKDOWN */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t('breakdown_title', {
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            <span className="text-[10px] text-slate-400">
              {t('total_findings_count', { n: s_group_breakdown.reduce((sum: number, g: any) => sum + (g.count || 0), 0) })}
            </span>
          </div>

          <div className="flex flex-col gap-2 py-1">
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
                <div key={group.s_group} className="grid grid-cols-12 items-center gap-2 text-xs">
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
        </div>

        {/* URGENT OPERATIONAL ALARMS WIDGET */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span>🚨</span>
              <span>{t('alarm_board_title')}</span>
            </span>
            <Link to="/reports" className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition">
              {t('remediation_report')} →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mt-1">
            <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/40 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-semibold">{t('alarm_7_days')}</span>
              <span className={`text-base font-black font-mono mt-1 ${failTextCls}`}>{totalOverdue}</span>
            </div>
            <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/40 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-semibold">{t('repeat_findings_kpi')}</span>
              <span className="text-base font-black font-mono mt-1 text-purple-300">{counts.not_improved}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-semibold">{t('on_time')}</span>
              <span className={`text-base font-black font-mono mt-1 ${passTextCls}`}>
                {formatScore(remediation?.on_time_rate_pct, lang)}
              </span>
            </div>
          </div>
        </div>

        {/* TOP & BOTTOM LEADERBOARD */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t('leaderboard_title', {
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            <span className="text-[10px] text-slate-400">{t('top_bottom_label')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mt-1">
            {top_areas.slice(0, 2).map((a: any, idx: number) => (
              <div key={a.area_id} className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between min-w-0">
                <span className="font-bold text-[11px] truncate text-emerald-300" title={a.area_name}>
                  {idx === 0 ? '🏆' : '🥈'} {a.area_name || a.area_code}
                </span>
                <span className={`font-mono font-black text-xs shrink-0 ml-1.5 ${passTextCls}`}>
                  {formatScore(a.month_avg, lang)}
                </span>
              </div>
            ))}
            {bottom_areas.slice(0, 2).map((a: any) => (
              <div key={a.area_id} className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-center justify-between min-w-0">
                <span className="font-bold text-[11px] truncate text-rose-300" title={a.area_name}>
                  ⚠️ {a.area_name || a.area_code}
                </span>
                <span className={`font-mono font-black text-xs shrink-0 ml-1.5 ${failTextCls}`}>
                  {formatScore(a.month_avg, lang)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: 65% PRODUCTION WORKSHOP CLUSTERS & MULTI-LINE TREND */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">
        {/* 4 WORKSHOP CLUSTERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clustersWithScores.map((cluster) => {
            const isClusterPass = cluster.clusterAvg !== null && cluster.clusterAvg >= target;
            const isClusterWarn = cluster.clusterAvg !== null && cluster.clusterAvg >= warningTarget && cluster.clusterAvg < target;
            const clusterScoreCls = isClusterPass ? passTextCls : isClusterWarn ? warnTextCls : failTextCls;

            return (
              <div
                key={cluster.id}
                className={`rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 flex flex-col justify-between shadow-lg border-l-4 ${cluster.accent}`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="min-w-0">
                    <span className="font-black text-xs uppercase tracking-wide truncate text-slate-100 block">
                      {cluster.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {cluster.areas.length} {t('areas_failing_target', { n: cluster.areas.length, target: 0 }).replace(/^[0-9]+\s*/, '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                        {t('cluster_avg_score')}
                      </span>
                      <span className={`text-base font-black font-mono leading-none ${clusterScoreCls}`}>
                        {cluster.clusterAvg !== null ? formatScore(cluster.clusterAvg, lang) : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-areas cards in cluster */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2.5">
                  {cluster.areas.map((area: any) => {
                    const isSubmitted = area.status === 'submitted' && area.score !== null;
                    const displayScore = isSubmitted ? area.score : area.month_avg;
                    const isPass = displayScore !== null && displayScore >= target;
                    const isWarn = displayScore !== null && displayScore >= warningTarget && displayScore < target;
                    const isFail = displayScore !== null && displayScore < warningTarget;
                    const isOverdue = area.overdue_count > 0;

                    const cardBorder = isOverdue
                      ? 'border-rose-500/80 bg-rose-950/25 ring-1 ring-rose-500/30'
                      : isPass
                      ? 'border-emerald-500/30 bg-emerald-950/20'
                      : isWarn
                      ? 'border-amber-500/35 bg-amber-950/20'
                      : isFail
                      ? 'border-rose-500/50 bg-rose-950/20'
                      : 'border-slate-700 bg-slate-800/40 opacity-75';

                    const scoreColor = isPass ? passTextCls : isWarn ? warnTextCls : isFail ? failTextCls : mutedTextCls;

                    return (
                      <Link
                        key={area.area_id}
                        to={is_authenticated ? `/findings?area_id=${area.area_id}` : '/login'}
                        className={`rounded-lg border p-2 flex flex-col justify-between min-h-[68px] ${cardBorder} hover:border-sky-400 transition cursor-pointer group`}
                      >
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className="font-bold text-[11px] truncate text-slate-200 group-hover:text-sky-300" title={area.area_name}>
                            {area.area_code}
                          </span>
                          {isOverdue ? (
                            <span className="px-1 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold shrink-0">
                              !
                            </span>
                          ) : isPass ? (
                            <span className="text-[10px] font-bold text-emerald-400 shrink-0">PASS</span>
                          ) : isWarn ? (
                            <span className="text-[10px] font-bold text-amber-400 shrink-0">WARN</span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-400 shrink-0">FAIL</span>
                          )}
                        </div>

                        <div className="flex items-baseline justify-between gap-1 my-0.5">
                          <span className={`text-sm font-black font-mono leading-none ${scoreColor}`}>
                            {displayScore !== null ? formatScore(displayScore, lang) : '-'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {t('open_short')}: <strong className={area.open_count > 0 ? warnTextCls : 'text-slate-300'}>{area.open_count}</strong>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* MULTI-LINE 12-WEEK TREND COMPARISON */}
        <div className="flex-1 rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 flex flex-col justify-between shadow-lg min-h-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-100">
              {t('trend_title')}
            </span>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className={`font-semibold ${passTextCls}`}>
                {t('target_reference_label', { target: `${target}.0` })}
              </span>
              <span className={`font-semibold ${warnTextCls}`}>
                {t('warning_reference_label', { target: `${warningTarget}.0` })}
              </span>
            </div>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend_12_weeks} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`${formatScore(val, lang)}`, t('score')]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }}
                />
                <ReferenceLine y={target} stroke="#10b981" strokeDasharray="5 4" strokeWidth={1.5} />
                <ReferenceLine y={warningTarget} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.2} />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  connectNulls
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#38bdf8' }}
                  activeDot={{ r: 4.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
