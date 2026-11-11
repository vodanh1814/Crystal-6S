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
import { X, TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert, ExternalLink, Calendar, UserCheck } from 'lucide-react';
import { formatScore, formatDelta } from '../../lib/format';
import type { TranslationKey } from '../../i18n/context';

export interface AreaTrendModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: any | null;
  target?: number;
  warningTarget?: number;
  currentWeek: { iso_week: number; iso_year: number };
  monthInfo?: any;
  areaSMatrix?: Record<string, { count: number; penalty: number }>;
  lang?: 'vi' | 'en';
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const S_PILLARS = [
  { group: 1, code: 'S1', name_vi: 'Sàng lọc (Sort)', name_en: 'Sort' },
  { group: 2, code: 'S2', name_vi: 'Sắp xếp (Set in order)', name_en: 'Set in Order' },
  { group: 3, code: 'S3', name_vi: 'Sạch sẽ (Shine)', name_en: 'Shine' },
  { group: 4, code: 'S4', name_vi: 'Săn sóc (Standardize)', name_en: 'Standardize' },
  { group: 5, code: 'S5', name_vi: 'Sẵn sàng (Sustain)', name_en: 'Sustain' },
];

export const AreaTrendModal: React.FC<AreaTrendModalProps> = ({
  isOpen,
  onClose,
  area,
  target = 95,
  warningTarget = 90,
  currentWeek,
  monthInfo,
  areaSMatrix = {},
  lang = 'vi',
  t,
}) => {
  if (!isOpen || !area) return null;

  const isSubmitted = area.status === 'submitted' && area.score !== null;
  const isPass = area.score !== null && area.score >= target;
  const isWarning = area.score !== null && area.score >= warningTarget && area.score < target;
  const isFail = area.score !== null && area.score < warningTarget;

  const isMonthPass = area.month_avg !== null && area.month_avg >= target;
  const isMonthWarn = area.month_avg !== null && area.month_avg >= warningTarget && area.month_avg < target;

  const passTextCls = 'text-emerald-400';
  const warnTextCls = 'text-amber-400';
  const failTextCls = 'text-rose-400';
  const mutedTextCls = 'text-slate-400';

  // 12-week chart data
  const rawTrend = area.trend_12_weeks || [];
  const chartData = rawTrend.map((p: any) => ({
    week: p.week,
    score: p.score !== null && p.score !== undefined ? Number(p.score) : null,
  }));

  const hasAuditedPoints = chartData.some((p: any) => p.score !== null);

  // 5S breakdown for this area
  const pillarsData = S_PILLARS.map((p) => {
    const key = `${area.area_id}_${p.group}`;
    const item = areaSMatrix[key] || { count: 0, penalty: 0 };
    return {
      ...p,
      count: item.count,
      penalty: item.penalty,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                {area.area_code}
              </span>
              <h2 className="text-base sm:text-lg font-black truncate text-white">
                {area.area_name || area.area_code}
              </h2>
              {isSubmitted ? (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  isPass
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {isPass ? t('tag_pass') : isWarning ? t('tag_warning') : t('tag_fail')}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {t('badge_pending_week', { week: currentWeek.iso_week })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
              {area.manager_name && (
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t('area_manager_label')}: <strong className="text-slate-300">{area.manager_name}</strong></span>
                </span>
              )}
              {area.auditor_name && (
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t('area_auditor_label')}: <strong className="text-slate-300">{area.auditor_name}</strong></span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Row 1: KPI Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Week Score */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">
                {t('col_week_label', { week: `W${currentWeek.iso_week}` })}
              </span>
              <div className="my-1">
                <span className={`text-xl sm:text-2xl font-black font-mono leading-none ${
                  isSubmitted
                    ? (isPass ? passTextCls : isWarning ? warnTextCls : failTextCls)
                    : 'text-amber-400 text-sm sm:text-base'
                }`}>
                  {isSubmitted ? formatScore(area.score, lang) : t('waiting_audit_badge')}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                {isSubmitted ? t('week_status_submitted') : t('week_status_pending')}
              </span>
            </div>

            {/* Month Score */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">
                {t('monthly_avg_kpi', { month: monthInfo?.display_month || '' })}
              </span>
              <div className="my-1 flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl font-black font-mono leading-none ${
                  isMonthPass ? passTextCls : isMonthWarn ? warnTextCls : failTextCls
                }`}>
                  {formatScore(area.month_avg, lang)}
                </span>
                {area.delta_prev_month !== null && (
                  <span className={`text-xs font-mono font-bold ${area.delta_prev_month >= 0 ? passTextCls : failTextCls}`}>
                    {area.delta_prev_month >= 0 ? `▲+${area.delta_prev_month}` : `▼${area.delta_prev_month}`}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                {t('mom_delta_label')}
              </span>
            </div>

            {/* Week-over-Week Delta */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">
                {t('wow_delta_label')}
              </span>
              <div className="my-1">
                <span className={`text-xl sm:text-2xl font-black font-mono leading-none ${
                  area.delta_prev_week !== null && area.delta_prev_week >= 0
                    ? passTextCls
                    : area.delta_prev_week !== null && area.delta_prev_week < 0
                    ? failTextCls
                    : mutedTextCls
                }`}>
                  {area.delta_prev_week !== null
                    ? (area.delta_prev_week >= 0 ? `▲+${area.delta_prev_week}%` : `▼${area.delta_prev_week}%`)
                    : '—'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                {t('vs_prev_week')}
              </span>
            </div>

            {/* Findings Status */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">
                {t('open_findings_kpi')}
              </span>
              <div className="my-1 flex items-baseline gap-2">
                <span className={`text-xl sm:text-2xl font-black font-mono leading-none ${
                  area.overdue_count > 0 ? failTextCls : area.open_count > 0 ? warnTextCls : passTextCls
                }`}>
                  {area.open_count || 0}
                </span>
                {area.overdue_count > 0 && (
                  <span className="text-xs font-bold text-rose-400">
                    ({area.overdue_count} {t('alarm_badge')})
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                {area.fixed_count || 0} {t('waiting_verify_count', { n: '' }).trim()}
              </span>
            </div>
          </div>

          {/* Row 2: 12-Week Score Trend LineChart */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-200">
                  {t('area_trend_12_weeks_title')}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-emerald-400 inline-block"></span> ≥{target}%
                </span>
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-amber-400 inline-block"></span> ≥{warningTarget}%
                </span>
              </div>
            </div>

            {hasAuditedPoints ? (
              <div className="h-44 sm:h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[70, 100]}
                      ticks={[70, 80, 90, 95, 100]}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#f8fafc',
                      }}
                      formatter={(val: any) => [`${val}%`, lang === 'en' ? '5S Score' : 'Điểm 5S']}
                    />
                    <ReferenceLine y={target} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.2} />
                    <ReferenceLine y={warningTarget} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#38bdf8"
                      strokeWidth={2.4}
                      dot={{ fill: '#38bdf8', r: 3 }}
                      activeDot={{ r: 5, fill: '#0284c7' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-36 flex items-center justify-center text-xs text-slate-500 font-mono">
                {t('no_trend_data')}
              </div>
            )}
          </div>

          {/* Row 3: 5S Pillars Breakdown for this Area */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 sm:p-4">
            <h3 className="font-bold text-xs sm:text-sm text-slate-200 mb-2.5">
              {t('area_s_breakdown_title', { month: monthInfo?.display_month || '' })}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {pillarsData.map((p) => {
                const hasViolations = p.count > 0;
                return (
                  <div
                    key={p.group}
                    className={`rounded-lg border p-2 flex flex-col justify-between ${
                      hasViolations
                        ? 'border-rose-500/30 bg-rose-950/20'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-sky-400">{p.code}</span>
                      {hasViolations ? (
                        <span className="text-[10px] font-bold text-rose-400">-{p.penalty}{t('pts_unit')}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400">0{t('pts_unit')}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate mt-1">
                      {lang === 'en' ? p.name_en : p.name_vi}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {p.count} {t('open_findings_kpi').toLowerCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 sm:px-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <Link
            to={`/findings?area_id=${area.area_id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 text-xs font-bold transition"
          >
            <span>{t('area_view_findings_btn', { n: area.open_count || 0 })}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            {t('area_close_btn')}
          </button>
        </div>

      </div>
    </div>
  );
};
