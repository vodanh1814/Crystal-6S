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
import { X, TrendingUp, ExternalLink, UserCheck } from 'lucide-react';
import { formatScore } from '../../lib/format';
import { resolveAppColorMode } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
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
  const { colorModeOverride } = useAuth();
  if (!isOpen || !area) return null;

  const isLight = resolveAppColorMode(colorModeOverride, true) === 'light';
  const isSubmitted = area.status === 'submitted' && area.score !== null;
  const isPass = area.score !== null && area.score >= target;
  const isWarning = area.score !== null && area.score >= warningTarget && area.score < target;

  const isMonthPass = area.month_avg !== null && area.month_avg >= target;
  const isMonthWarn = area.month_avg !== null && area.month_avg >= warningTarget && area.month_avg < target;

  const passTextCls = isLight ? 'text-emerald-700' : 'text-emerald-400';
  const warnTextCls = isLight ? 'text-amber-700' : 'text-amber-400';
  const failTextCls = isLight ? 'text-rose-700' : 'text-rose-400';
  const mutedTextCls = isLight ? 'text-slate-500' : 'text-slate-400';
  const modalBoxCls = isLight
    ? 'bg-white/95 backdrop-blur-xl border-slate-200 text-slate-900'
    : 'bg-[#0b1324]/95 backdrop-blur-xl border-slate-700/80 text-slate-100';
  const modalHeaderCls = isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/70 border-slate-800';
  const tileBoxCls = isLight ? 'border-slate-200 bg-slate-50/80' : 'border-slate-800 bg-slate-950/60';
  const sectionBoxCls = isLight ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800 bg-slate-950/80';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden ${modalBoxCls}`}>
        
        {/* Header */}
        <div className={`px-4 py-3 sm:px-6 sm:py-4 border-b flex items-center justify-between gap-3 shrink-0 ${modalHeaderCls}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              }`}>
                {area.area_code}
              </span>
              <h2 className={`text-base sm:text-lg font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {area.area_name || area.area_code}
              </h2>
              {isSubmitted ? (
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                  isPass
                    ? isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : isWarning
                    ? isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {isPass ? t('tag_pass') : isWarning ? t('tag_warning') : t('tag_fail')}
                </span>
              ) : (
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                  isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {t('badge_pending_week', { week: currentWeek.iso_week })}
                </span>
              )}
            </div>
            <div className={`flex items-center gap-3 text-xs mt-1 flex-wrap ${mutedTextCls}`}>
              {area.manager_name && (
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 opacity-70" />
                  <span>{t('area_manager_label')}: <strong className={isLight ? 'text-slate-700' : 'text-slate-300'}>{area.manager_name}</strong></span>
                </span>
              )}
              {area.auditor_name && (
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 opacity-70" />
                  <span>{t('area_auditor_label')}: <strong className={isLight ? 'text-slate-700' : 'text-slate-300'}>{area.auditor_name}</strong></span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
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
            <div className={`rounded-xl border p-3 flex flex-col justify-between ${tileBoxCls}`}>
              <span className={`text-[10px] sm:text-xs font-bold uppercase ${mutedTextCls}`}>
                {t('col_week_label', { week: `W${currentWeek.iso_week}` })}
              </span>
              <div className="my-1">
                <span className={`text-xl sm:text-2xl font-black font-mono leading-none ${
                  isSubmitted
                    ? (isPass ? passTextCls : isWarning ? warnTextCls : failTextCls)
                    : `${warnTextCls} text-sm sm:text-base`
                }`}>
                  {isSubmitted ? formatScore(area.score, lang) : t('waiting_audit_badge')}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                {isSubmitted ? t('week_status_submitted') : t('week_status_pending')}
              </span>
            </div>

            {/* Month Score */}
            <div className={`rounded-xl border p-3 flex flex-col justify-between ${tileBoxCls}`}>
              <span className={`text-[10px] sm:text-xs font-bold uppercase ${mutedTextCls}`}>
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
            <div className={`rounded-xl border p-3 flex flex-col justify-between ${tileBoxCls}`}>
              <span className={`text-[10px] sm:text-xs font-bold uppercase ${mutedTextCls}`}>
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
            <div className={`rounded-xl border p-3 flex flex-col justify-between ${tileBoxCls}`}>
              <span className={`text-[10px] sm:text-xs font-bold uppercase ${mutedTextCls}`}>
                {t('open_findings_kpi')}
              </span>
              <div className="my-1 flex items-baseline gap-2">
                <span className={`text-xl sm:text-2xl font-black font-mono leading-none ${
                  area.overdue_count > 0 ? failTextCls : area.open_count > 0 ? warnTextCls : passTextCls
                }`}>
                  {area.open_count || 0}
                </span>
                {area.overdue_count > 0 && (
                  <span className={`text-xs font-bold ${failTextCls}`}>
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
          <div className={`rounded-xl border p-3 sm:p-4 ${sectionBoxCls}`}>
            <div className={`flex items-center justify-between pb-2 border-b mb-3 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-500" />
                <h3 className={`font-bold text-xs sm:text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  {t('area_trend_12_weeks_title')}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className={`${passTextCls} flex items-center gap-1`}>
                  <span className="w-2 h-0.5 bg-emerald-500 inline-block"></span> ≥{target}%
                </span>
                <span className={`${warnTextCls} flex items-center gap-1`}>
                  <span className="w-2 h-0.5 bg-amber-500 inline-block"></span> ≥{warningTarget}%
                </span>
              </div>
            </div>

            {hasAuditedPoints ? (
              <div className="h-44 sm:h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#cbd5e1' : 'rgba(148, 163, 184, 0.12)'} />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 10 }}
                      axisLine={{ stroke: isLight ? '#cbd5e1' : '#334155' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[70, 100]}
                      ticks={[70, 80, 90, 95, 100]}
                      tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 10 }}
                      axisLine={{ stroke: isLight ? '#cbd5e1' : '#334155' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={
                        isLight
                          ? { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', color: '#0f172a' }
                          : { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }
                      }
                      formatter={(val: any) => [`${val}%`, lang === 'en' ? '5S Score' : 'Điểm 5S']}
                    />
                    <ReferenceLine y={target} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.2} />
                    <ReferenceLine y={warningTarget} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={isLight ? '#0284c7' : '#38bdf8'}
                      strokeWidth={2.4}
                      dot={{ fill: isLight ? '#0284c7' : '#38bdf8', r: 3 }}
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
          <div className={`rounded-xl border p-3 sm:p-4 ${sectionBoxCls}`}>
            <h3 className={`font-bold text-xs sm:text-sm mb-2.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
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
                        ? isLight ? 'border-rose-200 bg-rose-50' : 'border-rose-500/30 bg-rose-950/20'
                        : isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-sky-500">{p.code}</span>
                      {hasViolations ? (
                        <span className={`text-[10px] font-bold ${failTextCls}`}>-{p.penalty}{t('pts_unit')}</span>
                      ) : (
                        <span className={`text-[10px] font-bold ${passTextCls}`}>0{t('pts_unit')}</span>
                      )}
                    </div>
                    <span className={`text-[10px] truncate mt-1 ${mutedTextCls}`}>
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
        <div className={`px-4 py-3 sm:px-6 border-t flex items-center justify-between gap-3 shrink-0 ${modalHeaderCls}`}>
          <Link
            to={`/findings?area_id=${area.area_id}`}
            onClick={onClose}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
              isLight
                ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-400/30'
            }`}
          >
            <span>{t('area_view_findings_btn', { n: area.open_count || 0 })}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {t('area_close_btn')}
          </button>
        </div>

      </div>
    </div>
  );
};
