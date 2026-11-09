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

export const DashboardHud: React.FC<Props> = ({
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
    urgent_alarms = [],
    counts,
  } = data;

  const totalOverdue = counts?.overdue || 0;
  const unit = t('pts_unit');

  // Categorize 16 areas into 2 Operational Divisions
  const productionCodes = ['KNIT', 'DYE', 'BATCH', 'SET', 'VAP', 'G_QC', 'F_QC', 'LAB_D', 'LAB_T', 'UNT'];

  const prodAreas = current_week_status.filter((a: any) =>
    productionCodes.includes(a.area_code) || a.area_id <= 10
  );
  const suppAreas = current_week_status.filter((a: any) =>
    !productionCodes.includes(a.area_code) && a.area_id > 10
  );

  const currentScore = kpi?.monthly_avg ?? kpi?.latest_completed_avg ?? 0;
  const isPass = currentScore >= target;
  const isWarn = currentScore >= warningTarget && currentScore < target;

  return (
    <div className="theme-tv-canvas w-full px-2 sm:px-3 lg:px-4 py-2 select-none overflow-y-auto overflow-x-hidden space-y-2 sm:space-y-2.5 bg-[#060a12] text-slate-100 font-mono">
      {/* ── TOP TACTICAL HUD TELEMETRY BAR ── */}
      <div className="rounded-xl bg-[#090f1d] border border-cyan-500/35 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-[0_0_15px_rgba(6,182,212,0.12)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/40 text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>5S HUD SYSTEM ONLINE</span>
          </div>
          <span className="text-xs font-black text-slate-200 tracking-wide font-sans">
            CETVN · SMART FACTORY ANDON TELEMETRY
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">{t('monthly_avg_kpi', { month: formatMonthYear(month_info?.display_month || current_week?.month) })}:</span>
            <span className={`text-base font-black ${isPass ? 'text-emerald-400' : isWarn ? 'text-amber-400' : 'text-rose-400'}`}>
              {formatScore(currentScore, lang)}%
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">{t('target')}:</span>
            <span className="text-emerald-400 font-bold">{target}%</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">{t('alarm_7_days')}:</span>
            <span className={`font-bold ${totalOverdue > 0 ? 'text-rose-400 alarm-pulse' : 'text-slate-300'}`}>
              {totalOverdue}
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN TACTICAL FLANKS (LEFT: PRODUCTION 10, CENTER: ALARMS HUD, RIGHT: SUPPORT 6) ── */}
      <div className="grid grid-cols-12 gap-2 sm:gap-2.5">
        {/* Left Flank: Production Division (10 Workshops) */}
        <div className="col-span-12 lg:col-span-4 rounded-xl bg-[#090f1d]/90 border border-emerald-500/30 p-2.5 sm:p-3 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                {t('workshop_group_production')}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">10 {t('areas')}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 flex-1">
            {prodAreas.map((area: any) => {
              const displayScore = area.score !== null ? area.score : area.prev_month_score;
              const areaPass = displayScore !== null && Number(displayScore) >= target;
              const areaWarn = displayScore !== null && Number(displayScore) >= warningTarget && Number(displayScore) < target;
              const areaFail = displayScore !== null && Number(displayScore) < warningTarget;
              const isOverdue = area.overdue_count > 0;

              return (
                <Link
                  key={area.area_id}
                  to={`/findings?area_id=${area.area_id}`}
                  className={`rounded-lg p-1.5 border flex flex-col justify-between min-h-[52px] sm:min-h-[58px] transition-all hover:border-cyan-400 ${
                    isOverdue
                      ? 'border-rose-500/70 bg-rose-950/20'
                      : areaPass
                      ? 'border-emerald-500/30 bg-emerald-950/15'
                      : areaWarn
                      ? 'border-amber-500/30 bg-amber-950/15'
                      : areaFail
                      ? 'border-rose-500/30 bg-rose-950/15'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span className="font-bold text-[10px] sm:text-[11px] truncate text-slate-200">
                      {area.area_name || area.area_code}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      areaPass ? 'bg-emerald-400' : areaWarn ? 'bg-amber-400' : areaFail ? 'bg-rose-500' : 'bg-slate-600'
                    }`} />
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xs sm:text-sm font-black text-slate-100">
                      {formatScore(displayScore, lang)}
                    </span>
                    <span className="text-[9px] text-slate-400">
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
                </Link>
              );
            })}
          </div>
        </div>

        {/* Center Flank: Real-time Alarms & Remediation Command Core */}
        <div className="col-span-12 lg:col-span-4 rounded-xl bg-[#090f1d]/90 border border-cyan-500/35 p-2.5 sm:p-3 shadow-md flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                {t('alarm_7_days')}
              </span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">
              {remediation?.on_time_rate != null ? `${remediation.on_time_rate}% ON-TIME` : '100% ON-TIME'}
            </span>
          </div>

          {/* Alarm Cards Stream */}
          <div className="space-y-1.5 flex-1 overflow-hidden">
            {urgent_alarms.length > 0 ? (
              urgent_alarms.slice(0, 3).map((f: any) => (
                <Link
                  key={f.id}
                  to={`/findings/${f.id}`}
                  className="block p-1.5 sm:p-2 rounded-lg bg-rose-950/20 border border-rose-500/40 hover:border-rose-400 transition"
                >
                  <div className="flex items-center justify-between text-[10px] gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="px-1.5 rounded bg-rose-600 text-white font-bold text-[9px]">
                        {f.area_code}
                      </span>
                      <span className="text-slate-200 font-bold">{f.item_code}</span>
                      <span className="text-rose-400">-{f.applied_penalty}{unit}</span>
                    </div>
                    <span className="text-rose-300 font-bold shrink-0">
                      {f.days_remaining < 0
                        ? t('alarm_overdue', { n: Math.abs(f.days_remaining) })
                        : `${f.days_remaining}d left`}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 truncate mt-0.5">
                    {lang === 'en' ? f.content_en || f.content_vi : f.content_vi}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 text-center text-xs text-emerald-400 flex flex-col items-center justify-center h-full">
                <span>🛡️ {t('no_findings_clean')}</span>
                <span className="text-[10px] text-slate-500 mt-1">ALL AREAS VERIFIED</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>{t('open_findings_kpi')}: <strong className="text-amber-400">{counts?.open || 0}</strong></span>
            <span>{`${t('repeat_findings_kpi')}: ${counts?.not_improved || 0}`}</span>
          </div>
        </div>

        {/* Right Flank: Support & Utility Division (6 Areas) */}
        <div className="col-span-12 lg:col-span-4 rounded-xl bg-[#090f1d]/90 border border-amber-500/30 p-2.5 sm:p-3 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                {t('workshop_group_support')}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">6 {t('areas')}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 flex-1">
            {suppAreas.map((area: any) => {
              const displayScore = area.score !== null ? area.score : area.prev_month_score;
              const areaPass = displayScore !== null && Number(displayScore) >= target;
              const areaWarn = displayScore !== null && Number(displayScore) >= warningTarget && Number(displayScore) < target;
              const areaFail = displayScore !== null && Number(displayScore) < warningTarget;
              const isOverdue = area.overdue_count > 0;

              return (
                <Link
                  key={area.area_id}
                  to={`/findings?area_id=${area.area_id}`}
                  className={`rounded-lg p-1.5 border flex flex-col justify-between min-h-[52px] sm:min-h-[58px] transition-all hover:border-amber-400 ${
                    isOverdue
                      ? 'border-rose-500/70 bg-rose-950/20'
                      : areaPass
                      ? 'border-emerald-500/30 bg-emerald-950/15'
                      : areaWarn
                      ? 'border-amber-500/30 bg-amber-950/15'
                      : areaFail
                      ? 'border-rose-500/30 bg-rose-950/15'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span className="font-bold text-[10px] sm:text-[11px] truncate text-slate-200">
                      {area.area_name || area.area_code}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      areaPass ? 'bg-emerald-400' : areaWarn ? 'bg-amber-400' : areaFail ? 'bg-rose-500' : 'bg-slate-600'
                    }`} />
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xs sm:text-sm font-black text-slate-100">
                      {formatScore(displayScore, lang)}
                    </span>
                    <span className="text-[9px] text-slate-400">
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
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM TACTICAL TELEMETRY STRIP (COMPARATIVE TREND & 5S PILLARS) ── */}
      <div className="grid grid-cols-12 gap-2 sm:gap-2.5">
        {/* Trend Curve (8 Cols) */}
        <div className="col-span-12 lg:col-span-8 rounded-xl bg-[#090f1d]/90 border border-slate-800 p-2.5 sm:p-3 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
              {t('score_trend_12_weeks')} (TELEMETRY SPLINE)
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-cyan-400 font-bold">● {t('weekly_score_col')}</span>
              <span className="text-emerald-400">-- {target}%</span>
              <span className="text-amber-400">-- {warningTarget}%</span>
            </div>
          </div>

          <div className="h-32 sm:h-36 w-full min-h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend_12_weeks} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#172554" />
                <XAxis dataKey="week" stroke="#475569" tick={{ fontSize: 10 }} />
                <YAxis domain={[85, 100]} stroke="#475569" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#030712',
                    borderColor: '#06b6d4',
                    borderRadius: '6px',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [`${val}%`, t('score')]}
                />
                <ReferenceLine y={target} stroke="#10b981" strokeDasharray="3 3" />
                <ReferenceLine y={warningTarget} stroke="#f59e0b" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#06b6d4' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5S Pillar Deductions (4 Cols) */}
        <div className="col-span-12 lg:col-span-4 rounded-xl bg-[#090f1d]/90 border border-slate-800 p-2.5 sm:p-3 shadow-md flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              {t('findings_by_s_group')}
            </span>
          </div>

          <div className="space-y-1 flex-1 justify-center flex flex-col">
            {s_group_breakdown.map((group: any) => (
              <div key={group.group} className="flex items-center justify-between text-[11px] p-1 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="font-bold text-slate-300">
                  {group.group} · {t(group.nameKey)}
                </span>
                <span className="text-rose-400 font-bold">
                  -{group.penalty}{unit} ({group.count} {t('findings_unit')})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
