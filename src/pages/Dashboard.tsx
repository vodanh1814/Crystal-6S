import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Loader2,
  Calendar,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { getMonthShortName, formatMonthYear } from '../lib/date';
import { formatScore, formatDelta } from '../lib/format';
import { resolveColorMode } from '../lib/theme';
import { AreaTrendModal } from '../components/dashboard/AreaTrendModal';

const SHORT_CRITERIA_LABELS: Record<string, { vi: string; en: string }> = {
  'S1.1': { vi: 'Vật dụng cá nhân / không cần thiết', en: 'Unnecessary / personal items in work area' },
  'S1.2': { vi: 'Vật dụng nguy hiểm / bị cấm', en: 'Dangerous or prohibited items' },
  'S1.3': { vi: 'Vật dụng hỏng / biểu mẫu hết hạn', en: 'Broken items or expired forms' },
  'S2.1': { vi: 'Vị trí lưu trữ & vạch kẻ layout', en: 'Storage locations & floor markings' },
  'S2.2': { vi: 'Nhãn / mã nhận diện khu vực lưu trữ', en: 'Storage location labels & codes' },
  'S2.3': { vi: 'Sắp xếp vật tư & bảng biểu ngay ngắn', en: 'Materials & signs placed neatly' },
  'S2.4': { vi: 'Tag quản lý vật dụng sắc nhọn (kéo)', en: 'Control tags on sharp tools' },
  'S2.5': { vi: 'Che phủ xe vải / không để sợi xuống sàn', en: 'Fabric trolley cover / off-floor yarn' },
  'S2.6': { vi: 'Hàng hóa lưu trữ quá thời gian quy định', en: 'Shop-floor storage time exceeded' },
  'S2.7': { vi: 'Chiều cao xe vải / pallet vượt quy định', en: 'Trolley / pallet height exceeded' },
  'S3.1': { vi: 'Vệ sinh sàn, tường, lối đi & khu lưu trữ', en: 'Floor, walls & aisles cleanliness' },
  'S3.2': { vi: 'Vệ sinh máy móc, tủ điện & dây dẫn', en: 'Machine, panel & cable cleanliness' },
  'S3.3': { vi: 'Dụng cụ vệ sinh sạch & để đúng nơi', en: 'Cleaning tools washed & stored' },
  'S3.4': { vi: 'Bảng phân công & checklist vệ sinh ngày', en: 'Daily cleaning checklist sign-off' },
  'S3.5': { vi: 'Xử lý nguồn gây bẩn / rò rỉ dầu bụi', en: 'Contamination & oil leak control' },
  'S3.6': { vi: 'Vệ sinh kệ, pallet, xe đẩy, xe vải', en: 'Racks, pallets & carts cleanliness' },
  'S3.7': { vi: 'Lối đi xung quanh xưởng thông thoáng', en: 'Walkways around factory clear' },
  'S3.9': { vi: 'Khu vực chờ thanh lý gọn & có bảng tên', en: 'Disposal waiting area neat & labeled' },
  'S4.1': { vi: 'Tiêu chuẩn 5S & bảng phân công khu vực', en: '5S standards & area assignment board' },
  'S4.2': { vi: 'Thực hiện kiểm tra 5S định kỳ', en: 'Periodic 5S inspection compliance' },
  'S4.3': { vi: 'Khắc phục lỗi tuần trước đúng hạn', en: 'Prior week findings fixed on time' },
  'S5.1': { vi: 'Tuân thủ quy định & kỷ luật 5S', en: '5S discipline & attire compliance' },
  'S5.2': { vi: 'Lỗi đánh giá từ BOD / Khách hàng', en: 'BOD / Customer audit findings' },
  'S5.3': { vi: 'Lỗi đánh giá từ bộ phận IE', en: 'IE department audit findings' },
};

function getShortCriterionText(itemCode: string, fullText: string, lang: 'vi' | 'en'): string {
  const mapped = SHORT_CRITERIA_LABELS[itemCode];
  if (mapped) {
    return lang === 'en' ? mapped.en : mapped.vi;
  }
  const withoutParens = String(fullText || '').replace(/\s*\([^)]*\)/g, '').trim();
  return withoutParens.length > 55 ? withoutParens.slice(0, 52) + '...' : withoutParens;
}

export const Dashboard: React.FC = () => {
  const { lang, t } = useI18n();
  const { activeTheme, colorModeOverride } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedMonth = searchParams.get('month') || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [row3Tab, setRow3Tab] = useState<'improvement' | 'leaderboard'>('improvement');
  const [expandedAlarmId, setExpandedAlarmId] = useState<number | null>(null);
  const [selectedTrendArea, setSelectedTrendArea] = useState<any | null>(null);

  const isClassic = true;
  const isGlass = false;
  const isHybrid = false;
  const resolvedMode = 'dark';
  const isLightTv = false;

  const fetchDashboard = useCallback(async () => {
    try {
      const endpoint = selectedMonth
        ? `/reports/dashboard?month=${encodeURIComponent(selectedMonth)}`
        : '/reports/dashboard';
      const res = await api.get<any>(endpoint);
      setData(res);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const handleMonthChange = (newMonth: string) => {
    setLoading(true);
    if (newMonth) {
      setSearchParams({ month: newMonth });
    } else {
      setSearchParams({});
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 60 seconds for factory TV
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading || !data) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12">
        <Loader2
          className={`w-8 h-8 animate-spin ${
            isClassic ? 'text-emerald-500' : isGlass ? 'text-blue-500' : 'text-sky-500'
          }`}
        />
      </div>
    );
  }

  const {
    target = 95,
    warning_target: warningTarget = 90,
    current_week,
    month_info,
    kpi,
    remediation,
    is_authenticated,
    current_week_status,
    top_areas,
    bottom_areas,
    trend_12_weeks,
    s_group_breakdown = [],
    urgent_alarms,
    improvement_analysis,
    area_s_matrix = {},
    counts,
  } = data;

  const isCurrentWeekAudited = kpi?.weekly_avg !== null && kpi?.weekly_avg !== undefined;
  const isFallbackWeek = !isCurrentWeekAudited && kpi?.latest_completed_avg !== null && kpi?.latest_completed_avg !== undefined;
  const effectiveWeeklyScore = isCurrentWeekAudited ? kpi.weekly_avg : isFallbackWeek ? kpi.latest_completed_avg : null;
  const effectiveWeeklyWeekName = isCurrentWeekAudited
    ? `W${current_week.iso_week}`
    : isFallbackWeek && kpi.latest_completed_week
    ? kpi.latest_completed_week
    : `W${current_week.iso_week}`;

  const totalOverdue = counts.overdue || 0;
  const overdueAreasList = (current_week_status || [])
    .filter((a: any) => a.overdue_count > 0)
    .map((a: any) => `${a.area_name || a.area_code} (${a.overdue_count})`)
    .slice(0, 3)
    .join(' · ');

  const repeatAreasList = (current_week_status || [])
    .filter((a: any) => a.repeat_count > 0)
    .map((a: any) => a.area_name || a.area_code)
    .slice(0, 3)
    .join(' · ');

  // Total findings and max penalty for 5S horizontal bars
  const totalFindingsInMonth = (s_group_breakdown || []).reduce(
    (sum: number, g: any) => sum + (g.count || 0),
    0
  );
  const totalPenaltiesInMonth = (s_group_breakdown || []).reduce(
    (sum: number, g: any) => sum + (Number(g.penalty) || 0),
    0
  );
  const maxGroupFindings = Math.max(
    1,
    ...(s_group_breakdown || []).map((g: any) => g.count || 0)
  );
  const topViolationGroup = [...(s_group_breakdown || [])].sort(
    (a: any, b: any) => (b.count || 0) - (a.count || 0)
  )[0];
  const topViolationGroupName =
    topViolationGroup && topViolationGroup.count > 0
      ? `S${topViolationGroup.s_group} (${topViolationGroup.count} ${t('findings_unit')})`
      : '—';

  // ── Theme-specific TV Board Tokens (Classic 100% unchanged) ──
  const panelCls = isClassic
    ? 'rounded-lg bg-slate-900 border border-slate-800'
    : isGlass
    ? isLightTv
      ? 'rounded-2xl bg-white/82 backdrop-blur-md border border-slate-200/80 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.08)]'
      : 'rounded-2xl bg-[#0c172e]/76 backdrop-blur-md border border-sky-300/15 shadow-[0_12px_36px_-10px_rgba(2,6,23,0.7)]'
    : isLightTv
    ? 'rounded-2xl bg-white border border-slate-200/90 shadow-[0_6px_24px_-8px_rgba(15,23,42,0.07)]'
    : 'rounded-2xl bg-[#0f1624] border border-white/[0.08] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.6)]';

  const toolbarPillCls = isClassic
    ? 'bg-slate-900 border-slate-800 text-slate-300'
    : isGlass
    ? isLightTv
      ? 'bg-white/85 backdrop-blur-md border-slate-200/80 text-slate-700 shadow-xs'
      : 'bg-[#0c172e]/80 backdrop-blur-md border-sky-300/20 text-slate-200'
    : isLightTv
    ? 'bg-white border-slate-200 text-slate-700 shadow-xs'
    : 'bg-[#0f1624] border-white/10 text-slate-200';

  const optionBgCls = isLightTv ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-200';
  const accentTextCls = isClassic
    ? 'text-emerald-400'
    : isGlass
    ? isLightTv
      ? 'text-blue-600'
      : 'text-sky-400'
    : isLightTv
    ? 'text-sky-600'
    : 'text-sky-400';

  const headingTextCls = isLightTv ? 'text-slate-900' : 'text-white';
  const subTextCls = isLightTv ? 'text-slate-700' : 'text-slate-200';
  const mutedTextCls = isLightTv ? 'text-slate-500' : 'text-slate-400';
  const subtleDividerCls = isClassic
    ? 'border-slate-800'
    : isLightTv
    ? 'border-slate-200/80'
    : 'border-white/10';
  const innerRowDividerCls = isLightTv ? 'border-slate-200/70' : 'border-white/5';

  // Status semantic colors adapted safely for Light TV vs Dark TV
  const passTextCls = isLightTv ? 'text-emerald-700' : 'text-emerald-400';
  const passBadgeCls = isLightTv
    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    : 'bg-emerald-500/20 text-emerald-400';
  const warnTextCls = isLightTv ? 'text-amber-700' : 'text-amber-300';
  const warnBadgeCls = isLightTv
    ? 'bg-amber-100 text-amber-800 border border-amber-200'
    : 'bg-amber-500/20 text-amber-300';
  const failTextCls = isLightTv ? 'text-rose-700' : 'text-rose-400';
  const failBadgeCls = isLightTv
    ? 'bg-rose-100 text-rose-800 border border-rose-200'
    : 'bg-rose-500/20 text-rose-400';
  const blueStatTextCls = isLightTv ? 'text-blue-700' : 'text-blue-400';
  const purpleTextCls = isLightTv ? 'text-purple-700' : 'text-purple-300';
  const purpleValTextCls = isLightTv ? 'text-purple-700' : 'text-purple-400';

  const kpiOverdueCardCls = isClassic
    ? `rounded-lg bg-rose-950/30 p-2.5 sm:px-3 sm:py-2 flex flex-col justify-between min-h-[64px] transition-all ${
        totalOverdue > 0 ? 'border-2 border-rose-500/90 alarm-pulse' : 'border border-slate-800'
      }`
    : isLightTv
    ? `rounded-2xl bg-rose-50/90 p-2.5 sm:px-3 sm:py-2 flex flex-col justify-between min-h-[64px] transition-all ${
        isHybrid ? 'border-l-4 border-l-rose-500 ' : ''
      }${totalOverdue > 0 ? 'border-2 border-rose-500 alarm-pulse' : 'border border-rose-200'}`
    : `${isGlass ? 'rounded-2xl bg-rose-950/35 backdrop-blur-md' : 'rounded-2xl bg-rose-950/30'} p-2.5 sm:px-3 sm:py-2 flex flex-col justify-between min-h-[64px] transition-all ${
        isHybrid ? 'border-l-4 border-l-rose-500 ' : ''
      }${totalOverdue > 0 ? 'border-2 border-rose-500/90 alarm-pulse' : 'border border-white/10'}`;

  const kpiRepeatCardCls = isClassic
    ? 'rounded-lg bg-slate-900 border border-purple-500/40'
    : isLightTv
    ? `rounded-2xl bg-white border border-purple-200 shadow-xs ${
        isHybrid ? 'border-l-4 border-l-purple-500' : ''
      }`
    : `${isGlass ? 'rounded-2xl bg-[#0c172e]/76 backdrop-blur-md' : 'rounded-2xl bg-[#0f1624]'} border border-purple-500/35 ${
        isHybrid ? 'border-l-4 border-l-purple-500' : ''
      }`;

  const remedMiniCardCls = isClassic
    ? 'rounded bg-slate-950/90 border border-slate-800'
    : isLightTv
    ? 'rounded-lg bg-slate-100/80 border border-slate-200/80'
    : isGlass
    ? 'rounded-lg bg-[#081022]/75 border border-sky-300/15'
    : 'rounded-lg bg-[#090e18] border border-white/[0.08]';

  const remedBtnCls = isClassic
    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
    : isLightTv
    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
    : isGlass
    ? 'bg-blue-500/20 hover:bg-blue-500/30 text-sky-300 border border-sky-400/25'
    : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/25';

  const barTrackCls = isLightTv ? 'bg-slate-200' : 'bg-slate-800';
  const chartLineStroke = isClassic
    ? '#10b981'
    : isGlass
    ? isLightTv
      ? '#2563eb'
      : '#38bdf8'
    : isLightTv
    ? '#0284c7'
    : '#0ea5e9';
  const chartGridStroke = isLightTv ? '#cbd5e1' : isClassic ? '#334155' : 'rgba(148, 163, 184, 0.16)';
  const chartTickColor = isLightTv ? '#475569' : '#94a3b8';
  const chartTooltipStyle = isLightTv
    ? {
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        color: '#0f172a',
        borderRadius: '10px',
        fontSize: '11px',
        boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
      }
    : {
        backgroundColor: isClassic ? '#0f172a' : '#0b111e',
        border: isClassic ? '1px solid #334155' : '1px solid rgba(56, 189, 248, 0.25)',
        color: '#fff',
        borderRadius: '10px',
        fontSize: '11px',
      };

  const hybridKpiAccent = (tierColor: string) =>
    isHybrid ? `border-l-4 ${tierColor}` : '';

  return (
    <div className="flex-1 w-full min-h-0 p-2.5 sm:p-3.5 flex flex-col gap-2 2xl:gap-3 select-none fit:h-full fit:overflow-hidden fit:p-2 fit:2xl:p-3.5">
      {/* TOOLBAR: Month Selector & Status */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${toolbarPillCls}`}>
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${accentTextCls}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider hidden sm:inline ${mutedTextCls}`}>
              {t('dashboard_month_filter')}:
            </span>
            <select
              value={selectedMonth || ''}
              onChange={(e) => handleMonthChange(e.target.value)}
              className={`bg-transparent font-bold text-xs focus:outline-none cursor-pointer pr-1 ${accentTextCls}`}
            >
              <option value="" className={optionBgCls}>
                {t('current_month_option')} ({formatMonthYear(current_week.month)})
              </option>
              {(month_info?.available_months || [])
                .filter((m: string) => m !== current_week.month)
                .map((m: string) => (
                  <option key={m} value={m} className={optionBgCls}>
                    {formatMonthYear(m)} ({getMonthShortName(m)})
                  </option>
                ))}
            </select>
          </div>

          {selectedMonth && (
            <button
              onClick={() => handleMonthChange('')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                isClassic
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                  : isLightTv
                  ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                  : 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/30 text-sky-300'
              }`}
              title={t('back_to_current_month')}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('back_to_current_month')}</span>
            </button>
          )}

          {month_info?.is_custom_selection && (
            <span
              className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isLightTv
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}
            >
              {t('all_data_for_month', { month: formatMonthYear(month_info.display_month) })}
            </span>
          )}
        </div>

        {/* Target Indicator */}
        <div className={`text-[11px] font-mono hidden sm:flex items-center gap-1.5 shrink-0 ${mutedTextCls}`}>
          <span>{t('target')}:</span>
          <span className={`font-bold font-mono ${passTextCls}`}>≥{target}%</span>
          <span className={isLightTv ? 'text-slate-300' : 'text-slate-600'}>|</span>
          <span className={`font-mono ${warnTextCls}`}>{warningTarget}-{target}%</span>
        </div>
      </div>

      {/* ROW 1: 6 COMPACT KPI STRIP CARDS */}
          <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {/* KPI 1: Weekly Average Score */}
        <div
          className={`${panelCls} ${hybridKpiAccent(
            effectiveWeeklyScore === null
              ? 'border-l-amber-400'
              : effectiveWeeklyScore >= target
              ? 'border-l-emerald-500'
              : effectiveWeeklyScore >= warningTarget
              ? 'border-l-amber-400'
              : 'border-l-rose-500'
          )} p-1.5 sm:px-2.5 sm:py-1.5 flex flex-col justify-between min-h-[56px] sm:min-h-[62px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[11px] sm:text-xs">
              {t('weekly_avg_kpi', { week: effectiveWeeklyWeekName })}
            </span>
            {isCurrentWeekAudited ? (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                  effectiveWeeklyScore >= target
                    ? passBadgeCls
                    : effectiveWeeklyScore >= warningTarget
                    ? warnBadgeCls
                    : failBadgeCls
                }`}
              >
                {effectiveWeeklyScore >= target
                  ? t('tag_pass')
                  : effectiveWeeklyScore >= warningTarget
                  ? t('tag_warning')
                  : t('tag_fail')}
              </span>
            ) : isFallbackWeek ? (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${warnBadgeCls}`}
                title={t('pending_audit_week', { week: current_week.iso_week })}
              >
                {t('latest_week_badge')}
              </span>
            ) : (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${warnBadgeCls}`}>
                {t('tag_pending')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1 flex-nowrap">
            <span
              className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap ${
                effectiveWeeklyScore === null
                  ? `${mutedTextCls} text-sm sm:text-base font-bold`
                  : effectiveWeeklyScore >= target
                  ? passTextCls
                  : effectiveWeeklyScore >= warningTarget
                  ? warnTextCls
                  : failTextCls
              }`}
            >
              {effectiveWeeklyScore !== null ? formatScore(effectiveWeeklyScore, lang) : t('waiting_audit_badge')}
            </span>
            <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
              {kpi?.weekly_delta !== null && kpi?.weekly_delta !== undefined ? (
                <span
                  className={`text-xs font-semibold shrink-0 whitespace-nowrap ${
                    kpi.weekly_delta >= 0 ? passTextCls : failTextCls
                  }`}
                >
                  {formatDelta(kpi.weekly_delta, lang)}
                </span>
              ) : null}
              {isFallbackWeek && (
                <span className={`text-[10px] font-mono truncate shrink-0 ${mutedTextCls}`}>
                  ({t('pending_audit_week', { week: current_week.iso_week })})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Monthly Average Score */}
        <div
          className={`${panelCls} ${hybridKpiAccent(
            isHybrid ? 'border-l-sky-500' : ''
          )} p-1.5 sm:px-2.5 sm:py-1.5 flex flex-col justify-between min-h-[56px] sm:min-h-[62px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[11px] sm:text-xs">
              {t('monthly_avg_kpi', {
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            {month_info?.is_fallback ? (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${warnBadgeCls}`}>
                {t('latest_month_badge')}
              </span>
            ) : (
              <span className={`font-mono text-[10px] shrink-0 ${mutedTextCls}`}>
                {t('target_standard', { target })}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap ${headingTextCls}`}>
              {formatScore(kpi?.monthly_avg_overall, lang)}
            </span>
            <span className={`text-xs font-mono truncate shrink-0 ${mutedTextCls}`}>
              {month_info?.is_fallback
                ? t('historical_data_badge')
                : `W${current_week.iso_week} (${current_week.iso_year})`}
            </span>
          </div>
        </div>

        {/* KPI 3: Areas Meeting Target */}
        <div
          className={`${panelCls} ${hybridKpiAccent(
            isHybrid ? 'border-l-blue-500' : ''
          )} p-1.5 sm:px-2.5 sm:py-1.5 flex flex-col justify-between min-h-[56px] sm:min-h-[62px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[11px] sm:text-xs">{t('areas_meeting_target')}</span>
            <span className={`text-[10px] font-bold shrink-0 ${blueStatTextCls}`}>
              {month_info?.is_fallback
                ? t('display_month_short', { month: getMonthShortName(month_info.display_month) })
                : t('audited_areas_status', {
                    audited: kpi?.audited_areas_count || 0,
                    total: kpi?.total_areas_count || 0,
                  })}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap shrink-0 ${blueStatTextCls}`}>
              {kpi?.passed_areas_count || 0}{' '}
              <span className={`text-xs font-normal ${mutedTextCls}`}>
                {t('area_count_slash', { n: kpi?.audited_areas_count || 0 })}
              </span>
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0">
              {(kpi?.warning_areas_count || 0) > 0 && (
                <span className={warnTextCls}>
                  {kpi?.warning_areas_count} {t('tag_warning')}
                </span>
              )}
              <span className={failTextCls}>
                {t('areas_failing_target', { n: kpi?.failing_areas_count || 0, target })}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Open Findings */}
        <div
          className={`${panelCls} ${hybridKpiAccent(
            isHybrid ? 'border-l-amber-400' : ''
          )} p-1.5 sm:px-2.5 sm:py-1.5 flex flex-col justify-between min-h-[56px] sm:min-h-[62px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[11px] sm:text-xs">{t('open_findings_kpi')}</span>
            <span className={`text-[10px] font-bold shrink-0 ${isLightTv ? 'text-amber-700' : 'text-amber-400'}`}>
              {t('waiting_mng')}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap ${isLightTv ? 'text-amber-700' : 'text-amber-400'}`}>
              {counts.open}
            </span>
            <span className={`text-xs truncate shrink-0 ${mutedTextCls}`}>
              {t('waiting_verify_count', { n: counts.waiting_verify })}
            </span>
          </div>
        </div>

        {/* KPI 5: 7-Day Overdue Alarm */}
        <div className={`${kpiOverdueCardCls} p-1.5 sm:px-2.5 sm:py-1.5 flex flex-col justify-between min-h-[56px] sm:min-h-[62px]`}>
          <div className={`flex items-center justify-between gap-1 text-xs font-bold min-w-0 ${failTextCls}`}>
            <span className="truncate text-[11px] sm:text-xs">{t('alarm_7_days')}</span>
            {totalOverdue > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-black shrink-0">
                {t('alarm_badge')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap ${failTextCls}`}>{totalOverdue}</span>
            <span className={`text-[11px] font-semibold truncate shrink-0 max-w-[140px] ${isLightTv ? 'text-rose-700' : 'text-rose-300'}`}>
              {overdueAreasList || t('no_findings_clean')}
            </span>
          </div>
        </div>

        {/* KPI 6: Repeat Findings Escalation */}
        <div className={`${kpiRepeatCardCls} p-1.5 sm:px-2.5 sm:py-1.5 flex flex-col justify-between min-h-[56px] sm:min-h-[62px]`}>
          <div className={`flex items-center justify-between gap-1 text-xs font-semibold min-w-0 ${purpleTextCls}`}>
            <span className="truncate text-[11px] sm:text-xs">{t('repeat_findings_kpi')}</span>
            <span
              className={`px-1.5 rounded text-[10px] font-bold shrink-0 ${
                isLightTv ? 'bg-purple-100 text-purple-800' : 'bg-purple-500/20 text-purple-300'
              }`}
            >
              {t('repeat_step_badge')}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap ${purpleValTextCls}`}>
              {counts.not_improved}
            </span>
            <span className={`text-[11px] font-semibold truncate shrink-0 max-w-[140px] ${purpleTextCls}`}>
              {repeatAreasList || t('no_findings_clean')}
            </span>
          </div>
        </div>
      </div>

      {/* ROW 2: MIDDLE MAIN WORKSPACE */}
      <div className="grid grid-cols-12 gap-2 2xl:gap-3 fit:flex-[3] fit:min-h-0 fit:grid-rows-[minmax(0,1fr)]">
        {/* 16 AREAS STATUS MATRIX WALL */}
        <div className={`col-span-12 lg:col-span-8 ${panelCls} p-3 sm:p-3.5 fit:p-2 fit:2xl:p-3.5 flex flex-col justify-between fit:min-h-0 fit:overflow-hidden`}>
          <div className={`shrink-0 flex items-center justify-between pb-2 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs tracking-wide uppercase truncate ${headingTextCls}`}>
              {t('production_areas_wall', {
                total: current_week_status?.length || 16,
                week: `W${current_week.iso_week}`,
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs shrink-0 flex-nowrap overflow-x-auto">
              <span className={`flex items-center gap-1 font-semibold whitespace-nowrap ${passTextCls}`}>
                <span className="w-2 h-2 rounded-xs bg-emerald-500 shrink-0"></span>
                {t('areas_pass_count', { target, n: kpi?.passed_areas_count || 0 })}
              </span>
              <span className={`flex items-center gap-1 font-semibold whitespace-nowrap ${warnTextCls}`}>
                <span className="w-2 h-2 rounded-xs bg-amber-500 shrink-0"></span>
                {t('areas_warning_count', {
                  min: warningTarget,
                  max: target,
                  n: kpi?.warning_areas_count || 0,
                })}
              </span>
              <span className={`flex items-center gap-1 font-semibold whitespace-nowrap ${failTextCls}`}>
                <span className="w-2 h-2 rounded-xs bg-rose-500 shrink-0"></span>
                {t('areas_fail_count', { warning: warningTarget, n: kpi?.failing_areas_count || 0 })}
              </span>
              <span className={`hidden sm:inline-flex items-center gap-1 whitespace-nowrap ${mutedTextCls}`}>
                <span className={`w-2 h-2 rounded-xs shrink-0 ${isLightTv ? 'bg-slate-400' : 'bg-slate-600'}`}></span>
                {t('areas_pending_count', { n: kpi?.pending_audits_count || 0 })}
              </span>
            </div>
          </div>

          {/* Grid of area cards: 1 col on mobile, 2 cols on small tablet, 3 cols on medium, 4 cols on desktop */}
          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5 fit:flex-1 fit:min-h-0 fit:mt-1.5 fit:auto-rows-fr">
            {current_week_status.map((area: any) => {
              const isCurrentWeekAudited = area.status === 'submitted' && area.score !== null;

              // Week score & label: if current week audited, use it. Otherwise fallback to latest completed week!
              const latestCompleted = area.latest_completed_week;
              const weekScore = isCurrentWeekAudited
                ? area.score
                : (latestCompleted?.score ?? null);
              const weekLabel = isCurrentWeekAudited
                ? `W${current_week.iso_week}`
                : (latestCompleted?.week ?? `W${current_week.iso_week}`);
              const isWeekFallback = !isCurrentWeekAudited && latestCompleted?.score !== null && latestCompleted?.score !== undefined;

              // Month score & label: if area.month_avg !== null, use it. Otherwise fallback to prev_month_avg!
              const hasCurrentMonthAvg = area.month_avg !== null && area.month_avg !== undefined;
              const monthScore = hasCurrentMonthAvg
                ? area.month_avg
                : (area.prev_month_avg ?? null);
              const targetMonthStr = hasCurrentMonthAvg
                ? (month_info?.display_month || current_week.month)
                : (area.prev_month_str || current_week.month);
              const monthParts = String(targetMonthStr).split('-');
              const monthNum = parseInt(monthParts[monthParts.length - 1], 10);
              const monthDisplayLabel = lang === 'vi' ? String(monthNum) : getMonthShortName(targetMonthStr);
              const isMonthFallback = !hasCurrentMonthAvg && area.prev_month_avg !== null && area.prev_month_avg !== undefined;

              // Primary score determines overall card state
              const primaryScore = isCurrentWeekAudited ? area.score : (weekScore ?? monthScore);
              const isPass = primaryScore !== null && primaryScore >= target;
              const isWarning = primaryScore !== null && primaryScore >= warningTarget && primaryScore < target;
              const isFail = primaryScore !== null && primaryScore < warningTarget;
              const isOverdue = area.overdue_count > 0;

              const boxCls = isOverdue
                ? 'rounded-xl border border-rose-500/80 bg-rose-950/30 ring-1 ring-rose-500/40'
                : isPass
                ? 'rounded-xl border border-emerald-500/35 bg-emerald-950/20'
                : isWarning
                ? 'rounded-xl border border-amber-500/40 bg-amber-950/25 ring-1 ring-amber-500/20'
                : isFail
                ? 'rounded-xl border border-rose-500/70 bg-rose-950/30'
                : 'rounded-xl border border-slate-700 bg-slate-800/40 opacity-75';

              return (
                <div
                  key={area.area_id}
                  onClick={() => setSelectedTrendArea(area)}
                  className={`${boxCls} p-3 flex flex-col justify-between h-auto min-h-[102px] sm:min-h-[108px] fit:min-h-0 fit:h-full fit:overflow-hidden fit:p-1.5 fit:2xl:p-3 transition-all duration-150 cursor-pointer group hover:border-slate-400`}
                  title={t('click_to_inspect_area')}
                >
                  {/* Tier 1: Header (Area Name on Left, Status Badge on Right) */}
                  <div className="flex items-center justify-between gap-2 min-w-0 pb-1.5 border-b border-slate-800/60">
                    <span
                      className={`font-black text-sm tracking-wide transition-colors truncate max-w-[65%] ${headingTextCls} group-hover:text-emerald-400`}
                      title={`${area.area_name || area.area_code} (${area.area_code})`}
                    >
                      {area.area_name || area.area_code}
                    </span>
                    <div className="shrink-0">
                      {isOverdue ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs shadow-rose-950">
                          🚨 {area.overdue_count}
                        </span>
                      ) : isCurrentWeekAudited ? (
                        isPass ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
                            {t('tag_pass')}
                          </span>
                        ) : isWarning ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/35">
                            {t('tag_warning')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/35">
                            {t('tag_fail')}
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {t('badge_pending_week', { week: current_week.iso_week })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tier 2: Telemetry Body (2 Clean Symmetrical Tiles: Week Score & Month Score) */}
                  <div className="grid grid-cols-2 gap-2 py-2 min-w-0">
                    {/* Left Tile: Week Score */}
                    <div className="flex flex-col items-center justify-center bg-slate-900/70 rounded-lg py-1 px-2 border border-slate-800/80">
                      <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <span>{t('week')}</span>
                        <span className={isWeekFallback ? 'text-amber-400/90 font-mono' : 'font-mono'}>
                          {weekLabel}
                        </span>
                      </div>
                      <span
                        className={`font-black text-sm sm:text-base font-mono tracking-tight leading-tight mt-0.5 ${
                          weekScore !== null
                            ? (weekScore >= target ? passTextCls : weekScore >= warningTarget ? warnTextCls : failTextCls)
                            : mutedTextCls
                        }`}
                      >
                        {weekScore !== null ? formatScore(weekScore, lang) : '-'}
                      </span>
                    </div>

                    {/* Right Tile: Month Score */}
                    <div className="flex flex-col items-center justify-center bg-slate-900/70 rounded-lg py-1 px-2 border border-slate-800/80">
                      <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <span>{t('month')}</span>
                        <span className={isMonthFallback ? 'text-sky-400/90 font-mono' : 'font-mono'}>
                          {monthDisplayLabel}
                        </span>
                      </div>
                      <span
                        className={`font-black text-sm sm:text-base font-mono tracking-tight leading-tight mt-0.5 ${
                          monthScore !== null
                            ? (monthScore >= target ? passTextCls : monthScore >= warningTarget ? warnTextCls : failTextCls)
                            : mutedTextCls
                        }`}
                      >
                        {monthScore !== null ? formatScore(monthScore, lang) : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Tier 3: Action Telemetry Footer */}
                  <div className={`flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80 text-slate-400 font-mono`}>
                    <div className="flex items-center gap-1.5">
                      <span>{t('open_short')}:</span>
                      <strong className={area.open_count > 0 ? 'text-amber-400 font-bold' : subTextCls}>
                        {area.open_count}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {area.repeat_count > 0 ? (
                        <span className={`font-bold shrink-0 ${purpleValTextCls}`}>{t('repeat_short')}</span>
                      ) : (
                        <span className="truncate shrink-0">
                          {t('verify_short')}: <strong className={subTextCls}>{area.fixed_count}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT 4 COLS: 7-DAY ALARM & REMEDIATION EFFECTIVENESS BOARD */}
        <div className={`col-span-12 lg:col-span-4 ${panelCls} p-3 sm:p-3.5 fit:p-2 fit:2xl:p-3.5 flex flex-col min-w-0 justify-between gap-2.5 fit:min-h-0 fit:overflow-hidden`}>
          <div className={`shrink-0 flex items-center justify-between gap-2 pb-1.5 border-b min-w-0 ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${failTextCls}`}>
              {t('alarm_board_title')}
            </span>
            <Link
              to="/reports"
              className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition ${remedBtnCls}`}
            >
              {t('remediation_report')} →
            </Link>
          </div>

          {/* Single-line Compact Remediation Effectiveness Strip */}
          <div className="shrink-0 mt-1.5 grid grid-cols-3 gap-1 sm:gap-1.5 min-w-0">
            <div className={`${remedMiniCardCls} px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center justify-between gap-1 min-w-0`}>
              <span className={`text-[10px] font-semibold truncate ${mutedTextCls}`}>
                {t('on_time')}
              </span>
              <span className={`text-xs font-black font-mono shrink-0 ${passTextCls}`}>
                {formatScore(remediation?.on_time_rate_pct, lang)}
              </span>
            </div>
            <div className={`${remedMiniCardCls} px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center justify-between gap-1 min-w-0`}>
              <span className={`text-[10px] font-semibold truncate ${mutedTextCls}`}>
                {t('avg_remediation_time')}
              </span>
              <span className={`text-xs font-black font-mono shrink-0 ${accentTextCls}`}>
                {remediation?.avg_remediation_days !== null &&
                remediation?.avg_remediation_days !== undefined
                  ? `${remediation.avg_remediation_days}${t('remediation_day_unit')}`
                  : '-'}
              </span>
            </div>
            <div className={`${remedMiniCardCls} px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center justify-between gap-1 min-w-0`}>
              <span className={`text-[10px] font-semibold truncate ${mutedTextCls}`}>
                {t('repeat_findings_label')}
              </span>
              <span className={`text-xs font-black font-mono shrink-0 ${purpleValTextCls}`}>
                {formatScore(remediation?.repeat_rate_pct ?? 0, lang)}
              </span>
            </div>
          </div>

          <div className="mt-1.5 flex-1 flex flex-col gap-1.5 min-w-0 fit:min-h-0 fit:overflow-y-auto">
            {urgent_alarms && urgent_alarms.length > 0 ? (
              urgent_alarms.slice(0, 3).map((f: any) => {
                const isOverdue = f.is_overdue;
                const isFixed = f.status === 'fixed';
                const isRepeat = f.repeat_level > 1;

                const cardBorder = isLightTv
                  ? isOverdue
                    ? 'border-rose-300 bg-rose-50/90'
                    : isRepeat
                    ? 'border-purple-300 bg-purple-50/80'
                    : isFixed
                    ? 'border-blue-300 bg-blue-50/80'
                    : 'border-amber-300 bg-amber-50/80'
                  : isOverdue
                  ? 'border-rose-500/60 bg-rose-950/25'
                  : isRepeat
                  ? 'border-purple-500/40 bg-purple-950/20'
                  : isFixed
                  ? 'border-blue-500/40 bg-blue-950/20'
                  : 'border-amber-500/40 bg-amber-950/20';

                const fullCriterion = lang === 'en' ? f.content_en || f.content_vi : f.content_vi;
                const shortCriterion = getShortCriterionText(f.item_code, fullCriterion, lang);

                const isExpanded = expandedAlarmId === f.id;

                return (
                  <div
                    key={f.id}
                    onClick={() => setExpandedAlarmId(isExpanded ? null : f.id)}
                    className={`w-full min-w-0 rounded-lg border ${cardBorder} px-2 py-1 sm:px-2.5 sm:py-1.5 flex flex-col justify-between ${
                      isLightTv ? 'hover:border-blue-400' : 'hover:border-slate-400'
                    } transition-all cursor-pointer group`}
                  >
                    <div className="flex items-center justify-between gap-1.5 text-xs min-w-0">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <span
                          className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[9px] sm:text-[10px] shrink-0 max-w-[85px] truncate"
                          title={`${f.area_name || f.area_code} (${f.area_code})`}
                        >
                          {f.area_name || f.area_code}
                        </span>
                        <span className={`font-mono font-bold text-[10px] sm:text-[11px] shrink-0 ${headingTextCls}`}>
                          {f.item_code}
                        </span>
                        {isRepeat ? (
                          <span
                            className={`px-1.5 rounded font-semibold text-[9px] sm:text-[10px] shrink-0 ${
                              isLightTv ? 'bg-purple-100 text-purple-800' : 'bg-purple-500/25 text-purple-300'
                            }`}
                          >
                            {t('repeat_level_pts', { w: f.repeat_level, pts: f.applied_penalty })}
                          </span>
                        ) : (
                          <span className={`font-mono text-[9px] sm:text-[10px] shrink-0 ${warnTextCls}`}>
                            -{f.applied_penalty}{t('pts_unit')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] sm:text-[10px] font-bold ${
                            isOverdue
                              ? failTextCls
                              : isFixed
                              ? blueStatTextCls
                              : isLightTv
                              ? 'text-amber-700'
                              : 'text-amber-400'
                          }`}
                        >
                          {isOverdue
                            ? t('days_overdue_text', { n: Math.abs(f.days_remaining) })
                            : isFixed
                            ? t('waiting_auditor_verify')
                            : t('days_remaining_text', {
                                n: f.days_remaining,
                                date: f.due_date.slice(5),
                              })}
                        </span>
                        <span
                          className="p-0.5 rounded text-slate-400 group-hover:text-white transition"
                          title={isExpanded ? t('alarm_details_collapse') : t('alarm_details_expand')}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </div>
                    </div>

                    <div className={`text-[10px] sm:text-[11px] font-medium leading-tight my-0.5 min-w-0 ${
                      isExpanded ? 'whitespace-normal' : 'truncate'
                    } ${isLightTv ? 'text-slate-800' : 'text-slate-100'}`}>
                      {isExpanded ? fullCriterion : shortCriterion}
                    </div>

                    {/* Expandable Accordion Drawer ("dạng xổ xuống để đọc notify") */}
                    {isExpanded && (
                      <div className="pt-1.5 pb-1 mt-1 border-t border-white/10 flex flex-col gap-1 text-[11px] animate-in fade-in duration-150">
                        {f.description && (
                          <div className={`text-[11px] italic p-1.5 rounded ${
                            isLightTv ? 'bg-slate-100 text-slate-700' : 'bg-black/30 text-slate-200'
                          }`}>
                            "{f.description}"
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-400">
                          <span>{t('areas')}: <strong className={subTextCls}>{f.area_name || f.area_code}</strong></span>
                          <span>{t('due_date')}: <strong className={subTextCls}>{f.due_date}</strong></span>
                        </div>
                      </div>
                    )}

                    <div className={`flex items-center justify-between gap-2 text-[9px] sm:text-[10px] border-t pt-0.5 min-w-0 ${mutedTextCls} ${innerRowDividerCls}`}>
                      <span className="truncate min-w-0">
                        {isFixed ? 'Auditor:' : 'MNG:'}{' '}
                        <strong className={subTextCls}>
                          {isFixed
                            ? f.auditor_name || 'Auditor'
                            : f.manager_name || f.fixer_name || 'Area Manager'}
                        </strong>
                      </span>
                      <Link
                        to={`/findings/${f.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`font-semibold shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded transition hover:underline flex items-center gap-0.5 ${
                          isFixed ? blueStatTextCls : passTextCls
                        }`}
                      >
                        <span>{isFixed ? t('verify_close_btn') : t('update_after_btn')}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={`h-full flex items-center justify-center text-xs italic ${mutedTextCls}`}>
                {t('no_alarms')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: BOTTOM ANALYTICS STRIP */}
      <div className="grid grid-cols-12 gap-2 2xl:gap-3 fit:flex-[2] fit:min-h-0 fit:grid-rows-[minmax(0,1fr)]">
        {/* 12-WEEK TREND LINE */}
        <div className={`col-span-12 lg:col-span-5 min-h-[220px] fit:min-h-0 fit:overflow-hidden ${panelCls} p-3 sm:p-3.5 fit:p-2 fit:2xl:p-3.5 flex flex-col justify-between`}>
          <div className={`shrink-0 flex items-center justify-between pb-2 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${headingTextCls}`}>
              {t('trend_title')}
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
              <span className={`font-semibold ${passTextCls}`}>
                {t('target_reference_label', { target: `${target}.0` })}
              </span>
              <span className={`font-semibold ${warnTextCls}`}>
                {t('warning_reference_label', { target: `${warningTarget}.0` })}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-[160px] fit:min-h-0 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend_12_weeks}
                margin={{ top: 8, right: 8, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: chartTickColor }} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 10, fill: chartTickColor }} />
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => {
                    const payload = item?.payload;
                    const sourceLabel =
                      payload?.source === 'historical'
                        ? ` (${t('source_historical')} T${payload.month || ''})`
                        : '';
                    return [`${formatScore(val, lang)}${sourceLabel}`, t('score')];
                  }}
                  contentStyle={chartTooltipStyle}
                />
                <ReferenceLine y={target} stroke="#10b981" strokeDasharray="5 4" strokeWidth={1.5} />
                <ReferenceLine y={warningTarget} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.2} />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  connectNulls
                  stroke={chartLineStroke}
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: chartLineStroke }}
                  activeDot={{ r: 4.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5S GROUP BREAKDOWN */}
        <div className={`col-span-12 md:col-span-6 lg:col-span-4 min-h-[220px] fit:min-h-0 fit:overflow-hidden ${panelCls} p-3 sm:p-3.5 fit:p-2 fit:2xl:p-3.5 flex flex-col justify-between gap-2`}>
          <div className={`shrink-0 flex items-center justify-between pb-2 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${headingTextCls}`}>
              {t('breakdown_title', {
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            <span className={`text-[10px] shrink-0 ${mutedTextCls}`}>
              {t('total_findings_count', { n: totalFindingsInMonth })}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-around py-1 text-xs gap-1 sm:gap-1.5">
            {(s_group_breakdown || []).map((group: any) => {
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
                1: `S1 · ${t('s1_name')}`,
                2: `S2 · ${t('s2_name')}`,
                3: `S3 · ${t('s3_name')}`,
                4: `S4 · ${t('s4_name')}`,
                5: `S5 · ${t('s5_name')}`,
              };

              return (
                <div key={group.s_group} className="flex flex-col gap-1 py-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${barColor} shrink-0`}></span>
                      <span className={`font-semibold truncate text-[11px] sm:text-xs ${subTextCls}`}>
                        {sNames[group.s_group] || `S${group.s_group}`}
                      </span>
                    </div>
                    <span className={`font-mono font-bold text-[10px] sm:text-[11px] whitespace-nowrap shrink-0 ml-1.5 ${
                      group.count > 0 ? failTextCls : mutedTextCls
                    }`}>
                      {group.count} {t('findings_unit')} (-{group.penalty}{t('pts_unit')})
                    </span>
                  </div>
                  <div className={`h-2.5 sm:h-3 rounded-full overflow-hidden ${barTrackCls}`}>
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(group.count > 0 ? 5 : 0, widthPct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Telemetry Summary Footer Strip */}
          <div className={`shrink-0 pt-1.5 border-t ${subtleDividerCls} flex items-center justify-between text-[10px] sm:text-[11px] font-mono ${mutedTextCls}`}>
            <span className="font-semibold text-rose-400">
              {t('total_penalty_month', { n: totalPenaltiesInMonth })}
            </span>
            <span className="truncate ml-2">
              {t('top_violation_group', { group: topViolationGroupName })}
            </span>
          </div>
        </div>

        {/* TOP & BOTTOM MONTHLY LEADERBOARD & CONTINUOUS IMPROVEMENT TRACKER */}
        <div className={`col-span-12 md:col-span-6 lg:col-span-3 min-h-[220px] fit:min-h-0 fit:overflow-hidden ${panelCls} p-3 sm:p-3.5 fit:p-2 fit:2xl:p-3.5 flex flex-col justify-between gap-2`}>
          <div className={`shrink-0 flex items-center justify-between pb-2 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${headingTextCls}`}>
              {row3Tab === 'improvement'
                ? t('continuous_improvement_title')
                : t('leaderboard_title', {
                    month: formatMonthYear(month_info?.display_month || current_week.month),
                  })}
            </span>
            <div className="flex items-center gap-1 rounded bg-slate-800/80 p-0.5 text-[9px] font-bold shrink-0">
              <button
                type="button"
                onClick={() => setRow3Tab('improvement')}
                className={`px-1.5 py-0.2 rounded transition cursor-pointer ${
                  row3Tab === 'improvement'
                    ? 'bg-sky-500 text-slate-950 font-black'
                    : `${mutedTextCls} hover:text-white`
                }`}
                title={t('switch_to_improvement_view')}
              >
                {t('tab_improvement_btn')}
              </button>
              <button
                type="button"
                onClick={() => setRow3Tab('leaderboard')}
                className={`px-1.5 py-0.2 rounded transition cursor-pointer ${
                  row3Tab === 'leaderboard'
                    ? 'bg-sky-500 text-slate-950 font-black'
                    : `${mutedTextCls} hover:text-white`
                }`}
                title={t('switch_to_leaderboard_view')}
              >
                Top
              </button>
            </div>
          </div>

          {row3Tab === 'improvement' ? (
            <div className="flex-1 flex flex-col justify-between text-xs py-0.5 gap-1.5 min-h-0">
              {/* Kaizen Status Micro-Strip */}
              <div className={`shrink-0 grid grid-cols-3 gap-1 p-1 rounded-lg border ${
                isLightTv ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/60 border-white/5'
              } text-[10px] font-mono text-center`}>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-emerald-400 font-bold">▲</span>
                  <span className={`font-semibold ${passTextCls}`}>
                    {t('kaizen_stat_improved', { n: improvement_analysis?.improved_count ?? (improvement_analysis?.top_improvers?.length || 0) })}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 border-x border-white/10">
                  <span className="text-slate-400 font-bold">▬</span>
                  <span className={`font-semibold ${mutedTextCls}`}>
                    {t('kaizen_stat_stable', { n: improvement_analysis?.stagnant_count ?? 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-rose-400 font-bold">▼</span>
                  <span className={`font-semibold ${failTextCls}`}>
                    {t('kaizen_stat_declined', { n: improvement_analysis?.declined_count ?? (improvement_analysis?.stagnant_areas?.length || 0) })}
                  </span>
                </div>
              </div>

              {/* Top Improvers */}
              <div className="flex-1 flex flex-col justify-around gap-1 min-h-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between px-0.5">
                  <span>{t('top_improvers_title')}</span>
                </span>
                {improvement_analysis?.top_improvers && improvement_analysis.top_improvers.length > 0 ? (
                  improvement_analysis.top_improvers.slice(0, 3).map((a: any) => (
                    <div
                      key={a.area_id}
                      className={`flex items-center justify-between px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border min-w-0 transition-all ${
                        isLightTv
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-emerald-500/10 border-emerald-500/25'
                      }`}
                    >
                      <span
                        className={`font-bold truncate text-[11px] min-w-0 ${
                          isLightTv ? 'text-emerald-800' : 'text-emerald-300'
                        }`}
                        title={`${a.area_name || a.area_code} (${a.area_code})`}
                      >
                        🚀 {a.area_name || a.area_code}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                        <span className={`font-mono font-bold text-xs ${passTextCls}`}>
                          {formatScore(a.current_score, lang)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                          ▲+{a.delta}{t('pts_unit')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`text-xs italic py-1 ${mutedTextCls}`}>{t('no_improvers')}</div>
                )}
              </div>

              {/* Stagnant / Needs Kaizen Attention */}
              <div className="flex-1 flex flex-col justify-around gap-1 min-h-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between px-0.5">
                  <span>{t('stagnant_areas_title')}</span>
                </span>
                {improvement_analysis?.stagnant_areas && improvement_analysis.stagnant_areas.length > 0 ? (
                  improvement_analysis.stagnant_areas.slice(0, 3).map((a: any) => (
                    <div
                      key={a.area_id}
                      className={`flex items-center justify-between px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border min-w-0 transition-all ${
                        isLightTv
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-rose-500/15 border-rose-500/35'
                      }`}
                    >
                      <span
                        className={`font-bold truncate text-[11px] min-w-0 ${
                          isLightTv ? 'text-rose-800' : 'text-rose-300'
                        }`}
                        title={`${a.area_name || a.area_code} (${a.area_code})`}
                      >
                        ⚠️ {a.area_name || a.area_code}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                        <span className={`font-mono font-bold text-xs ${failTextCls}`}>
                          {formatScore(a.current_score, lang)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                          a.delta !== null && a.delta < 0
                            ? 'bg-rose-500/25 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {a.delta !== null && a.delta < 0
                            ? `▼${a.delta}${t('pts_unit')}`
                            : a.delta !== null && a.delta > 0
                            ? `▲+${a.delta}${t('pts_unit')}`
                            : `▬ 0${t('pts_unit')}`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`text-xs italic py-1 ${mutedTextCls}`}>{t('no_stagnant')}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between text-xs py-0.5 gap-1.5 min-h-0">
              {/* Top 3 Leaders */}
              <div className="flex-1 flex flex-col justify-around gap-1 min-h-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between px-0.5">
                  <span>{t('top_leaders_title')}</span>
                </span>
                {top_areas && top_areas.length > 0 ? (
                  top_areas.slice(0, 3).map((a: any, idx: number) => (
                    <div
                      key={a.area_id}
                      className={`flex items-center justify-between px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border min-w-0 transition-all ${
                        isLightTv
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-emerald-500/10 border-emerald-500/25'
                      }`}
                    >
                      <span
                        className={`font-bold truncate text-[11px] min-w-0 ${
                          isLightTv ? 'text-emerald-800' : 'text-emerald-300'
                        }`}
                        title={`${a.area_name || a.area_code} (${a.area_code})`}
                      >
                        {idx === 0 ? '🏆 1.' : idx === 1 ? '🥈 2.' : '🥉 3.'} {a.area_name || a.area_code}
                      </span>
                      <span className={`font-mono font-black text-xs shrink-0 ml-1.5 ${passTextCls}`}>
                        {formatScore(a.month_avg, lang)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className={`text-xs italic py-1 ${mutedTextCls}`}>{t('noData')}</div>
                )}
              </div>

              {/* Bottom 3 Needs Improvement */}
              <div className="flex-1 flex flex-col justify-around gap-1 min-h-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between px-0.5">
                  <span>{t('bottom_lagging_title')}</span>
                </span>
                {bottom_areas && bottom_areas.length > 0 ? (
                  bottom_areas.slice(0, 3).map((a: any) => (
                    <div
                      key={a.area_id}
                      className={`flex items-center justify-between px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border min-w-0 transition-all ${
                        isLightTv
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-rose-500/15 border-rose-500/35'
                      }`}
                    >
                      <span
                        className={`font-bold truncate text-[11px] min-w-0 ${
                          isLightTv ? 'text-rose-800' : 'text-rose-300'
                        }`}
                        title={`${a.area_name || a.area_code} (${a.area_code})`}
                      >
                        ⚠️ {a.area_name || a.area_code}
                      </span>
                      <span className={`font-mono font-black text-xs shrink-0 ml-1.5 ${failTextCls}`}>
                        {formatScore(a.month_avg, lang)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className={`text-xs italic py-1 ${mutedTextCls}`}>{t('noData')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Area Trend & 5S Performance Inspector Modal */}
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
