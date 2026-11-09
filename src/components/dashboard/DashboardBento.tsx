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
import { formatScore } from '../../lib/format';
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

export const DashboardBento: React.FC<Props> = ({
  data,
  lang,
  t,
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
    counts,
  } = data;

  const totalOverdue = counts?.overdue || 0;
  const unit = t('pts_unit');

  // Compute 5S Pillar Radar Points for Hero Gauge
  const maxGroupFindings = Math.max(
    1,
    ...s_group_breakdown.map((g: any) => g.count || 0)
  );

  // Radar points polygon calculation for 5 axes (S1 to S5)
  // Center (50, 50), Radius 36
  const radarAxes = [
    { label: 'S1', angle: -90 },
    { label: 'S2', angle: -18 },
    { label: 'S3', angle: 54 },
    { label: 'S4', angle: 126 },
    { label: 'S5', angle: 198 },
  ];

  const radarPoints = radarAxes
    .map((axis, i) => {
      const g = s_group_breakdown[i] || { penalty: 0 };
      // Higher penalty = smaller radius (inverted for health score 0.35 to 1.0)
      const penaltyRatio = Math.min(1, (g.penalty || 0) / 10);
      const scoreRatio = Math.max(0.35, 1 - penaltyRatio * 0.65);
      const rad = (axis.angle * Math.PI) / 180;
      const r = 36 * scoreRatio;
      const x = 50 + r * Math.cos(rad);
      const y = 50 + r * Math.sin(rad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const currentScore = kpi?.monthly_avg ?? kpi?.latest_completed_avg ?? 0;
  const isPass = currentScore >= target;
  const isWarn = currentScore >= warningTarget && currentScore < target;

  return (
    <div className="theme-tv-canvas w-full px-2 sm:px-3 lg:px-4 py-2 select-none overflow-y-auto overflow-x-hidden space-y-2 sm:space-y-2.5">
      {/* ── ROW 1: TOP BENTO TELEMETRY KPI STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
        {/* KPI 1: Weekly Score */}
        <div className="rounded-xl bg-[#0b111e]/90 border border-sky-400/20 p-2 flex flex-col justify-between min-h-[56px] shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="truncate">W{current_week?.iso_week || '--'} {t('weekly_score_col')}</span>
            <span className="text-[10px] text-sky-400 font-mono">
              {kpi?.latest_completed_week || '--'}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-mono font-black text-sky-300">
              {formatScore(kpi?.weekly_avg ?? kpi?.latest_completed_avg, lang)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {kpi?.is_pending_week ? t('tag_pending') : unit}
            </span>
          </div>
        </div>

        {/* KPI 2: Monthly Factory Score */}
        <div className="rounded-xl bg-[#0b111e]/90 border border-emerald-500/30 p-2 flex flex-col justify-between min-h-[56px] shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="truncate">{formatMonthYear(month_info?.display_month || current_week?.month)}</span>
            <span className="text-[10px] text-emerald-400 font-bold font-mono">
              {t('target_standard', { target })}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-lg sm:text-xl font-mono font-black ${isPass ? 'text-emerald-400' : isWarn ? 'text-amber-400' : 'text-rose-400'}`}>
              {formatScore(currentScore, lang)}
            </span>
            <span className="text-[10px] font-bold text-emerald-400/90 font-mono">
              {kpi?.mom_delta ? (kpi.mom_delta >= 0 ? `▲+${kpi.mom_delta}${unit}` : `▼${kpi.mom_delta}${unit}`) : '—'}
            </span>
          </div>
        </div>

        {/* KPI 3: Audited Plant Areas */}
        <div className="rounded-xl bg-[#0b111e]/90 border border-slate-700/60 p-2 flex flex-col justify-between min-h-[56px] shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="truncate">{t('areas_meeting_target')}</span>
            <span className="text-[10px] text-emerald-400 font-bold">
              {kpi?.passed_areas_count || 0} {t('tag_pass')}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-mono font-black text-slate-100">
              {kpi?.audited_areas_count || 0}
              <span className="text-xs text-slate-500 font-normal">/{kpi?.total_areas_count || 15}</span>
            </span>
            <span className="text-[10px] text-amber-400 font-bold">
              {kpi?.warning_areas_count || 0} {t('tag_warning')}
            </span>
          </div>
        </div>

        {/* KPI 4: Open Findings */}
        <div className="rounded-xl bg-[#0b111e]/90 border border-amber-400/30 p-2 flex flex-col justify-between min-h-[56px] shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="truncate">{t('open_findings_kpi')}</span>
            <span className="text-[10px] text-amber-400 font-bold">{t('waiting_mng')}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-mono font-black text-amber-400">
              {counts?.open || 0}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {t('waiting_verify_count', { n: counts?.waiting_verify || 0 })}
            </span>
          </div>
        </div>

        {/* KPI 5: 7-Day Overdue Alarms */}
        <div className={`rounded-xl p-2 flex flex-col justify-between min-h-[56px] transition-all shadow-sm ${
          totalOverdue > 0 ? 'bg-rose-950/40 border-2 border-rose-500 alarm-pulse' : 'bg-[#0b111e]/90 border border-slate-700/60'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-400">
            <span className="truncate">{t('alarm_7_days')}</span>
            {totalOverdue > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black">
                {t('alarm_badge')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-mono font-black text-rose-400">
              {totalOverdue}
            </span>
            <span className="text-[10px] text-rose-300 font-semibold truncate max-w-[110px]">
              {totalOverdue > 0 ? t('tag_overdue', { n: totalOverdue }) : t('no_findings_clean')}
            </span>
          </div>
        </div>

        {/* KPI 6: Repeated Findings */}
        <div className="rounded-xl bg-[#0b111e]/90 border border-purple-500/30 p-2 flex flex-col justify-between min-h-[56px] shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold text-purple-300">
            <span className="truncate">{t('repeat_findings_kpi')}</span>
            <span className="text-[10px] font-mono px-1 rounded bg-purple-500/20 text-purple-300">
              {t('repeat_step_badge')}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-mono font-black text-purple-300">
              {counts?.not_improved || 0}
            </span>
            <span className="text-[10px] text-purple-400 font-semibold truncate max-w-[110px]">
              {counts?.not_improved ? `${counts.not_improved} ${t('findings_unit')}` : t('no_findings_clean')}
            </span>
          </div>
        </div>
      </div>

      {/* ── ROW 2: BENTO CORE (38% TELEMETRY HERO + 62% 16-AREA BENTO GRID) ── */}
      <div className="grid grid-cols-12 gap-2 sm:gap-2.5">
        {/* Left Bento Flank (38% on lg): Telemetry Dial & Kaizen Spotlight */}
        <div className="col-span-12 lg:col-span-4 space-y-2 sm:space-y-2.5 flex flex-col justify-between">
          {/* Card 1: 5S Circular Radar Telemetry Card */}
          <div className="rounded-2xl bg-[#0b111e]/90 border border-sky-400/20 p-3 sm:p-3.5 flex flex-col justify-between flex-1 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  {t('overall_factory_compliance')}
                </span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
                isPass ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {isPass ? t('tag_pass') : t('tag_warning')}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 my-2 sm:my-3">
              {/* Circular Gauge Score */}
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-mono font-black text-slate-100 tracking-tight">
                  {formatScore(currentScore, lang)}
                  <span className="text-sm font-sans font-normal text-slate-400 ml-1">/100</span>
                </div>
                <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <span>{t('target')}: {target}%</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-400 font-mono">
                    {kpi?.mom_delta ? (kpi.mom_delta >= 0 ? `▲+${kpi.mom_delta}${unit}` : `▼${kpi.mom_delta}${unit}`) : '—'}
                  </span>
                </div>
              </div>

              {/* SVG 5S Pentagonal Radar Telemetry Chart */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 relative shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                  {/* Outer & Inner Pentagonal Grid Lines */}
                  <polygon
                    points="50,14 84,39 71,79 29,79 16,39"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <polygon
                    points="50,26 73,43 64,70 36,70 27,43"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />
                  {/* Target 95% Reference polygon */}
                  <polygon
                    points="50,16 82,40 70,77 30,77 18,40"
                    fill="rgba(56, 189, 248, 0.04)"
                    stroke="rgba(56, 189, 248, 0.3)"
                    strokeWidth="1"
                  />
                  {/* Actual Factory 5S Telemetry Area */}
                  <polygon
                    points={radarPoints}
                    fill="rgba(16, 185, 129, 0.25)"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {/* Axis Vertex Labels */}
                  <text x="50" y="8" fill="#94a3b8" fontSize="6.5" fontWeight="bold" textAnchor="middle">S1</text>
                  <text x="92" y="42" fill="#94a3b8" fontSize="6.5" fontWeight="bold" textAnchor="middle">S2</text>
                  <text x="76" y="90" fill="#94a3b8" fontSize="6.5" fontWeight="bold" textAnchor="middle">S3</text>
                  <text x="24" y="90" fill="#94a3b8" fontSize="6.5" fontWeight="bold" textAnchor="middle">S4</text>
                  <text x="8" y="42" fill="#94a3b8" fontSize="6.5" fontWeight="bold" textAnchor="middle">S5</text>
                </svg>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
              <span>{t('on_time_closure_rate')}:</span>
              <strong className="text-emerald-400 font-mono font-bold">
                {remediation?.on_time_rate != null ? `${remediation.on_time_rate}%` : '100%'}
              </strong>
            </div>
          </div>

          {/* Card 2: Kaizen MoM Spotlight (Top Improvers vs Stagnant) */}
          <div className="rounded-2xl bg-[#0b111e]/90 border border-slate-800 p-3 sm:p-3.5 space-y-2 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                {t('continuous_improvement_title')}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">MoM vs {getMonthShortName(month_info?.prev_month)}</span>
            </div>

            <div className="space-y-1.5">
              {/* Top 2 Improvers */}
              {(improvement_analysis?.top_improvers || []).slice(0, 2).map((item: any) => (
                <Link
                  key={item.area_id}
                  to={`/findings?area_id=${item.area_id}`}
                  className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/25 flex items-center justify-between hover:border-emerald-400 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200 truncate group-hover:text-emerald-300">
                      {item.area_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-xs font-bold text-slate-200">{formatScore(item.current_score, lang)}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                      ▲+{item.delta}{unit}
                    </span>
                  </div>
                </Link>
              ))}

              {/* Top 2 Lagging/Stagnant */}
              {(improvement_analysis?.stagnant_areas || []).slice(0, 2).map((item: any) => (
                <Link
                  key={item.area_id}
                  to={`/findings?area_id=${item.area_id}`}
                  className="p-1.5 rounded-lg bg-rose-950/25 border border-rose-500/25 flex items-center justify-between hover:border-rose-400 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200 truncate group-hover:text-rose-300">
                      {item.area_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-xs font-bold text-slate-200">{formatScore(item.current_score, lang)}</span>
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.2 rounded">
                      {item.delta != null ? (item.delta < 0 ? `▼${item.delta}${unit}` : `▬ ${item.delta}${unit}`) : '—'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Bento Flank (62% on lg): 4x4 Grid of 16 Plant Areas */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl bg-[#0b111e]/90 border border-slate-800 p-2.5 sm:p-3 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                {t('production_areas_wall', { total: current_week_status.length,
                  week: current_week?.iso_week || '--',
                  month: getMonthShortName(month_info?.display_month || current_week?.month),
                })}
              </span>
              <span className="text-[10px] text-slate-400">({current_week_status.length} {t('areas')})</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold font-mono">
              <span className="text-emerald-400">● ≥95%</span>
              <span className="text-amber-400">● 90-95%</span>
              <span className="text-rose-400">● &lt;90%</span>
            </div>
          </div>

          {/* 4x4 Responsive Bento Area Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 flex-1">
            {current_week_status.map((area: any) => {
              const displayScore = area.score !== null ? area.score : area.prev_month_score;
              const areaPass = displayScore !== null && Number(displayScore) >= target;
              const areaWarn = displayScore !== null && Number(displayScore) >= warningTarget && Number(displayScore) < target;
              const areaFail = displayScore !== null && Number(displayScore) < warningTarget;
              const isOverdue = area.overdue_count > 0;

              const cardBorder = isOverdue
                ? 'border-rose-500/80 bg-rose-950/20'
                : areaPass
                ? 'border-emerald-500/35 bg-emerald-950/15'
                : areaWarn
                ? 'border-amber-500/35 bg-amber-950/15'
                : areaFail
                ? 'border-rose-500/40 bg-rose-950/15'
                : 'border-slate-800 bg-slate-900/60';

              return (
                <Link
                  key={area.area_id}
                  to={`/findings?area_id=${area.area_id}`}
                  className={`rounded-xl border ${cardBorder} p-2 flex flex-col justify-between min-h-[58px] sm:min-h-[64px] hover:border-sky-400/80 transition cursor-pointer group`}
                >
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span
                      className="font-black text-[11px] sm:text-xs truncate max-w-[70%] text-slate-200 group-hover:text-sky-300 transition-colors"
                      title={`${area.area_name} (${area.area_code})`}
                    >
                      {area.area_name || area.area_code}
                    </span>
                    {isOverdue ? (
                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold shrink-0">
                        🚨{area.overdue_count}
                      </span>
                    ) : areaPass ? (
                      <span className="text-[9px] font-bold text-emerald-400 font-mono">PASS</span>
                    ) : areaWarn ? (
                      <span className="text-[9px] font-bold text-amber-300 font-mono">WARN</span>
                    ) : areaFail ? (
                      <span className="text-[9px] font-bold text-rose-400 font-mono">FAIL</span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-500 font-mono">PEND</span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-sm sm:text-base font-mono font-black text-slate-100">
                      {formatScore(displayScore, lang)}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-400">
                      {area.delta_prev_month != null
                        ? area.delta_prev_month > 0
                          ? `▲+${area.delta_prev_month}${unit}`
                          : area.delta_prev_month < 0
                          ? `▼${area.delta_prev_month}${unit}`
                          : `▬ 0${unit}`
                        : area.open_count > 0
                        ? `${area.open_count} ${t('findings_unit')}`
                        : '0'}
                    </span>
                  </div>

                  {/* Micro Progress Line Bar */}
                  <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        areaPass ? 'bg-emerald-500' : areaWarn ? 'bg-amber-400' : areaFail ? 'bg-rose-500' : 'bg-slate-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, Number(displayScore || 0)))}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 3: BENTO BOTTOM STRIP (12-WEEK TREND & 5S PILLAR TELEMETRY) ── */}
      <div className="grid grid-cols-12 gap-2 sm:gap-2.5">
        {/* Left: 12-Week Score Trend Graph (7 Cols) */}
        <div className="col-span-12 lg:col-span-7 rounded-2xl bg-[#0b111e]/90 border border-slate-800 p-2.5 sm:p-3 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              {t('score_trend_12_weeks')}
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-sky-400 font-bold">● {t('weekly_score_col')}</span>
              <span className="text-emerald-400">-- {target}%</span>
              <span className="text-amber-400">-- {warningTarget}%</span>
            </div>
          </div>

          <div className="h-36 sm:h-40 w-full min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend_12_weeks} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[85, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [`${val}%`, t('score')]}
                />
                <ReferenceLine y={target} stroke="#10b981" strokeDasharray="3 3" />
                <ReferenceLine y={warningTarget} stroke="#f59e0b" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#38bdf8' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: 5S Pillar Telemetry Bars & Overdue Action Tracker (5 Cols) */}
        <div className="col-span-12 lg:col-span-5 rounded-2xl bg-[#0b111e]/90 border border-slate-800 p-2.5 sm:p-3 shadow-md flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              {t('findings_by_s_group')}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {t('total_findings_count', { n: counts?.total_in_month || 0 })}
            </span>
          </div>

          {/* 5S Pillar Bars */}
          <div className="space-y-1.5 flex-1 justify-center flex flex-col">
            {s_group_breakdown.map((group: any) => {
              const widthPct = Math.round(((group.count || 0) / maxGroupFindings) * 100);
              const colorMap: Record<string, string> = {
                S1: 'bg-blue-500',
                S2: 'bg-rose-500',
                S3: 'bg-amber-500',
                S4: 'bg-cyan-500',
                S5: 'bg-emerald-500',
              };
              const barColor = colorMap[group.group] || 'bg-slate-500';

              return (
                <div key={group.group} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-slate-300">
                      {group.group} - {t(group.nameKey)}
                    </span>
                    <span className="text-slate-400">
                      {group.count} {t('findings_unit')} (-{group.penalty}{unit})
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${Math.max(4, widthPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>{t('alarm_7_days')}:</span>
            <span className={totalOverdue > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {totalOverdue > 0 ? `${totalOverdue} ${t('count_overdue_findings')}` : t('no_findings_clean')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
