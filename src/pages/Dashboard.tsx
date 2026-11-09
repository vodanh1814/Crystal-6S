import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Loader2,
  Calendar,
  RotateCcw,
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

  const isClassic = activeTheme === 'classic';
  const isGlass = activeTheme === 'crystal-glass';
  const isHybrid = activeTheme === 'crystal-hybrid';
  const resolvedMode = resolveColorMode(activeTheme, colorModeOverride, true);
  const isLightTv = !isClassic && resolvedMode === 'light';

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
    s_group_breakdown,
    urgent_alarms,
    counts,
  } = data;

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
  const maxGroupFindings = Math.max(
    1,
    ...(s_group_breakdown || []).map((g: any) => g.count || 0)
  );

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
    <div
      className={`flex-1 min-h-0 px-2 pt-2 sm:px-2.5 sm:pt-2.5 flex flex-col gap-3 lg:gap-2.5 select-none ${
        isHybrid ? 'pb-20 md:pb-2.5' : 'pb-2 sm:pb-2.5'
      }`}
    >
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
            kpi?.weekly_avg === null
              ? 'border-l-amber-400'
              : kpi.weekly_avg >= target
              ? 'border-l-emerald-500'
              : kpi.weekly_avg >= warningTarget
              ? 'border-l-amber-400'
              : 'border-l-rose-500'
          )} p-2.5 sm:px-3 sm:py-2 flex flex-col justify-between min-h-[68px] sm:min-h-[72px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[11px] sm:text-xs">
              {t('weekly_avg_kpi', { week: `W${current_week.iso_week}` })}
            </span>
            {kpi?.weekly_avg !== null ? (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                  kpi.weekly_avg >= target
                    ? passBadgeCls
                    : kpi.weekly_avg >= warningTarget
                    ? warnBadgeCls
                    : failBadgeCls
                }`}
              >
                {kpi.weekly_avg >= target
                  ? t('tag_pass')
                  : kpi.weekly_avg >= warningTarget
                  ? t('tag_warning')
                  : t('tag_fail')}
              </span>
            ) : (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${warnBadgeCls}`}>
                {t('tag_pending')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-1 flex-nowrap">
            <span
              className={`text-xl font-black font-mono leading-none whitespace-nowrap ${
                kpi?.weekly_avg === null
                  ? `${mutedTextCls} text-sm sm:text-base font-bold`
                  : kpi.weekly_avg >= target
                  ? passTextCls
                  : kpi.weekly_avg >= warningTarget
                  ? warnTextCls
                  : failTextCls
              }`}
            >
              {kpi?.weekly_avg !== null ? formatScore(kpi.weekly_avg, lang) : t('waiting_audit_badge')}
            </span>
            {kpi?.weekly_delta !== null ? (
              <span
                className={`text-xs font-semibold shrink-0 whitespace-nowrap ${
                  kpi.weekly_delta >= 0 ? passTextCls : failTextCls
                }`}
              >
                {formatDelta(kpi.weekly_delta, lang)}
              </span>
            ) : kpi?.latest_completed_avg !== null ? (
              <span className={`text-[11px] font-mono truncate shrink-0 ${mutedTextCls}`}>
                {kpi.latest_completed_week || getMonthShortName(month_info?.display_month || current_week.month)}:{' '}
                <strong className={subTextCls}>{formatScore(kpi.latest_completed_avg, lang)}</strong>
              </span>
            ) : null}
          </div>
        </div>

        {/* KPI 2: Monthly Average Score */}
        <div
          className={`${panelCls} ${hybridKpiAccent(
            isHybrid ? 'border-l-sky-500' : ''
          )} p-2.5 sm:px-3 sm:py-2 flex flex-col justify-between min-h-[68px] sm:min-h-[72px]`}
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
          <div className="flex items-baseline justify-between gap-1 mt-1 flex-nowrap">
            <span className={`text-xl font-black font-mono leading-none whitespace-nowrap ${headingTextCls}`}>
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
          )} p-2.5 sm:px-3 sm:py-2 flex flex-col justify-between min-h-[68px] sm:min-h-[72px]`}
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
          <div className="flex items-baseline justify-between gap-1 mt-1 flex-nowrap">
            <span className={`text-xl font-black font-mono leading-none whitespace-nowrap shrink-0 ${blueStatTextCls}`}>
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
          )} p-2.5 sm:px-3 sm:py-2 flex flex-col justify-between min-h-[68px] sm:min-h-[72px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[11px] sm:text-xs">{t('open_findings_kpi')}</span>
            <span className={`text-[10px] font-bold shrink-0 ${isLightTv ? 'text-amber-700' : 'text-amber-400'}`}>
              {t('waiting_mng')}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-1 flex-nowrap">
            <span className={`text-xl font-black font-mono leading-none whitespace-nowrap ${isLightTv ? 'text-amber-700' : 'text-amber-400'}`}>
              {counts.open}
            </span>
            <span className={`text-xs truncate shrink-0 ${mutedTextCls}`}>
              {t('waiting_verify_count', { n: counts.waiting_verify })}
            </span>
          </div>
        </div>

        {/* KPI 5: 7-Day Overdue Alarm */}
        <div className={`${kpiOverdueCardCls} p-2.5 sm:px-3 sm:py-2 flex flex-col justify-between min-h-[68px] sm:min-h-[72px]`}>
          <div className={`flex items-center justify-between gap-1 text-xs font-bold min-w-0 ${failTextCls}`}>
            <span className="truncate text-[11px] sm:text-xs">{t('alarm_7_days')}</span>
            {totalOverdue > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-black shrink-0">
                {t('alarm_badge')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-1 flex-nowrap">
            <span className={`text-xl font-black font-mono leading-none whitespace-nowrap ${failTextCls}`}>{totalOverdue}</span>
            <span className={`text-[11px] font-semibold truncate shrink-0 max-w-[140px] ${isLightTv ? 'text-rose-700' : 'text-rose-300'}`}>
              {overdueAreasList || t('no_findings_clean')}
            </span>
          </div>
        </div>

        {/* KPI 6: Repeat Findings Escalation */}
        <div className={`${kpiRepeatCardCls} p-2.5 sm:px-3 sm:py-2 flex flex-col justify-between min-h-[68px] sm:min-h-[72px]`}>
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
          <div className="flex items-baseline justify-between gap-1 mt-1 flex-nowrap">
            <span className={`text-xl font-black font-mono leading-none whitespace-nowrap ${purpleValTextCls}`}>
              {counts.not_improved}
            </span>
            <span className={`text-[11px] font-semibold truncate shrink-0 max-w-[140px] ${purpleTextCls}`}>
              {repeatAreasList || t('no_findings_clean')}
            </span>
          </div>
        </div>
      </div>

      {/* ROW 2: MIDDLE MAIN WORKSPACE */}
      <div className="flex-none min-h-[380px] lg:flex-[58] grid grid-cols-12 gap-3 lg:gap-2.5">
        {/* 16 AREAS 4x4 MATRIX WALL */}
        <div className={`col-span-12 lg:col-span-8 h-auto lg:h-full ${panelCls} p-2.5 sm:p-3 flex flex-col`}>
          <div className={`shrink-0 flex items-center justify-between pb-2 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs tracking-wide uppercase truncate ${headingTextCls}`}>
              {t('production_areas_wall', {
                total: current_week_status?.length || 16,
                week: `W${current_week.iso_week}`,
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs shrink-0 flex-nowrap overflow-x-auto">
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

          {/* Grid of 16 area cards: 2 cols on mobile, 4 cols on tablet & desktop */}
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 flex-1 auto-rows-fr">
            {current_week_status.map((area: any) => {
              const isSubmitted = area.status === 'submitted' && area.score !== null;
              // If current week not submitted yet, fallback to month_avg for score evaluation & coloring
              const displayScore = isSubmitted ? area.score : area.month_avg;
              const isPass = displayScore !== null && displayScore >= target;
              const isWarning = displayScore !== null && displayScore >= warningTarget && displayScore < target;
              const isFail = displayScore !== null && displayScore < warningTarget;
              const isOverdue = area.overdue_count > 0;

              let boxCls = '';
              if (isClassic) {
                boxCls = isOverdue
                  ? 'rounded-md border border-rose-500/80 bg-rose-950/30 ring-1 ring-rose-500/40'
                  : isPass
                  ? 'rounded-md border border-emerald-500/35 bg-emerald-950/20'
                  : isWarning
                  ? 'rounded-md border border-amber-500/40 bg-amber-950/25 ring-1 ring-amber-500/20'
                  : isFail
                  ? 'rounded-md border border-rose-500/70 bg-rose-950/30'
                  : 'rounded-md border border-slate-700 bg-slate-800/40 opacity-75';
              } else if (isLightTv) {
                const stripeCls = isHybrid
                  ? isOverdue || isFail
                    ? 'border-l-4 border-l-rose-500'
                    : isPass
                    ? 'border-l-4 border-l-emerald-500'
                    : isWarning
                    ? 'border-l-4 border-l-amber-400'
                    : 'border-l-4 border-l-slate-400'
                  : '';
                boxCls = `${isHybrid ? 'rounded-xl' : 'rounded-xl backdrop-blur-sm'} border ${stripeCls} ${
                  isOverdue
                    ? 'border-rose-400 bg-rose-50/90 ring-1 ring-rose-300'
                    : isPass
                    ? 'border-emerald-200 bg-emerald-50/75'
                    : isWarning
                    ? 'border-amber-300 bg-amber-50/80 ring-1 ring-amber-200/70'
                    : isFail
                    ? 'border-rose-300 bg-rose-50/80'
                    : 'border-slate-200 bg-slate-100/70 opacity-85'
                }`;
              } else if (isGlass) {
                boxCls = `rounded-xl backdrop-blur-sm border ${
                  isOverdue
                    ? 'border-rose-400/75 bg-rose-950/35 ring-1 ring-rose-500/35'
                    : isPass
                    ? 'border-emerald-400/35 bg-emerald-950/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : isWarning
                    ? 'border-amber-400/40 bg-amber-950/25 ring-1 ring-amber-400/20'
                    : isFail
                    ? 'border-rose-400/65 bg-rose-950/30'
                    : 'border-white/15 bg-white/[0.04] opacity-80'
                }`;
              } else {
                // Crystal Hybrid Dark (Sample 4 Obsidian Bento + vertical left status stripe)
                const stripeCls =
                  isOverdue || isFail
                    ? 'border-l-4 border-l-rose-500'
                    : isPass
                    ? 'border-l-4 border-l-emerald-500'
                    : isWarning
                    ? 'border-l-4 border-l-amber-400'
                    : 'border-l-4 border-l-slate-600';
                boxCls = `rounded-xl border ${stripeCls} ${
                  isOverdue
                    ? 'border-rose-500/70 bg-rose-950/25 ring-1 ring-rose-500/30'
                    : isPass
                    ? 'border-white/10 bg-[#141d2e]/90'
                    : isWarning
                    ? 'border-amber-500/35 bg-amber-950/20'
                    : isFail
                    ? 'border-rose-500/55 bg-rose-950/25'
                    : 'border-white/10 bg-[#121a2a]/60 opacity-80'
                }`;
              }

              const scoreCls = isPass
                ? passTextCls
                : isWarning
                ? warnTextCls
                : isFail
                ? failTextCls
                : `${mutedTextCls} text-xs font-normal`;

              const scoreTxt = displayScore !== null ? formatScore(displayScore, lang) : t('not_audited_yet');
              const progressBarColor = isPass
                ? 'bg-emerald-500'
                : isWarning
                ? 'bg-amber-400'
                : isFail
                ? 'bg-rose-500'
                : 'bg-slate-500';
              const clampedProgress =
                displayScore !== null ? Math.min(100, Math.max(8, Number(displayScore))) : 0;

              return (
                <Link
                  key={area.area_id}
                  to={is_authenticated ? `/findings?area_id=${area.area_id}` : '/login'}
                  className={`${boxCls} px-2.5 py-1.5 sm:py-2 flex flex-col justify-between min-h-[80px] sm:min-h-[84px] ${
                    isLightTv ? 'hover:border-blue-400' : isClassic ? 'hover:border-slate-400' : 'hover:border-sky-400/60'
                  } transition cursor-pointer group`}
                >
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <span
                      className={`font-black text-xs sm:text-[13px] tracking-wide transition-colors truncate max-w-[70%] ${headingTextCls} ${
                        isClassic
                          ? 'group-hover:text-emerald-400'
                          : isLightTv
                          ? 'group-hover:text-blue-600'
                          : 'group-hover:text-sky-400'
                      }`}
                      title={`${area.area_name || area.area_code} (${area.area_code})`}
                    >
                      {area.area_name || area.area_code}
                    </span>
                    {isOverdue ? (
                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-bold shrink-0">
                        {t('tag_overdue', { n: area.overdue_count })}
                      </span>
                    ) : (isSubmitted || displayScore !== null) ? (
                      isPass ? (
                        <span className={`text-xs font-bold shrink-0 ${passTextCls}`}>{t('tag_pass')}</span>
                      ) : isWarning ? (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${warnBadgeCls}`}>
                          {t('tag_warning')}
                        </span>
                      ) : (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${failBadgeCls}`}>
                          {t('tag_fail')}
                        </span>
                      )
                    ) : (
                      <span className={`text-[10px] font-medium shrink-0 ${warnTextCls}`}>
                        {t('tag_pending')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between my-0.5 gap-1">
                    <span className={`text-base sm:text-lg font-black font-mono leading-none ${scoreCls}`}>
                      {scoreTxt}
                    </span>
                    <span className={`text-[10px] font-mono truncate ${mutedTextCls}`}>
                      {isSubmitted ? (
                        <>
                          {getMonthShortName(month_info?.display_month || current_week.month)}:{' '}
                          <strong className={subTextCls}>
                            {formatScore(area.month_avg, lang)}
                          </strong>
                        </>
                      ) : (
                        <strong className={subTextCls}>
                          {area.month_source === 'historical'
                            ? t('source_historical')
                            : getMonthShortName(month_info?.display_month || current_week.month)}
                        </strong>
                      )}
                    </span>
                  </div>

                  {/* Signature Sample 4 Slim Progress Bar */}
                  {isHybrid && (
                    <div
                      className={`h-1 w-full rounded-full overflow-hidden mb-1 ${
                        isLightTv ? 'bg-slate-200/90' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${progressBarColor}`}
                        style={{ width: `${clampedProgress}%` }}
                      />
                    </div>
                  )}

                  <div className={`flex items-center justify-between text-[11px] border-t pt-1 ${mutedTextCls} ${innerRowDividerCls}`}>
                    <span className="truncate">
                      {t('open_short')}:{' '}
                      <strong
                        className={
                          area.open_count > 0
                            ? isLightTv
                              ? 'text-amber-700'
                              : 'text-amber-400'
                            : subTextCls
                        }
                      >
                        {area.open_count}
                      </strong>
                    </span>
                    {area.repeat_count > 0 ? (
                      <span className={`font-bold shrink-0 ${purpleValTextCls}`}>{t('repeat_short')}</span>
                    ) : (
                      <span className="truncate shrink-0">
                        {t('verify_short')}: <strong className={subTextCls}>{area.fixed_count}</strong>
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* RIGHT 4 COLS: 7-DAY ALARM & REMEDIATION EFFECTIVENESS BOARD */}
        <div className={`col-span-12 lg:col-span-4 h-auto lg:h-full ${panelCls} p-2.5 sm:p-3 flex flex-col min-w-0`}>
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
            <div className={`${remedMiniCardCls} px-1.5 sm:px-2 py-1 flex items-center justify-between gap-1 min-w-0`}>
              <span className={`text-[10px] font-semibold truncate ${mutedTextCls}`}>
                {t('on_time')}
              </span>
              <span className={`text-xs font-black font-mono shrink-0 ${passTextCls}`}>
                {formatScore(remediation?.on_time_rate_pct, lang)}
              </span>
            </div>
            <div className={`${remedMiniCardCls} px-1.5 sm:px-2 py-1 flex items-center justify-between gap-1 min-w-0`}>
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
            <div className={`${remedMiniCardCls} px-1.5 sm:px-2 py-1 flex items-center justify-between gap-1 min-w-0`}>
              <span className={`text-[10px] font-semibold truncate ${mutedTextCls}`}>
                {t('repeat_findings_label')}
              </span>
              <span className={`text-xs font-black font-mono shrink-0 ${purpleValTextCls}`}>
                {formatScore(remediation?.repeat_rate_pct ?? 0, lang)}
              </span>
            </div>
          </div>

          <div className="mt-2 flex-1 flex flex-col gap-2 sm:gap-1.5 min-w-0">
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

                return (
                  <Link
                    key={f.id}
                    to={is_authenticated ? `/findings/${f.id}` : '/login'}
                    title={fullCriterion}
                    className={`flex-1 min-h-[72px] sm:min-h-[76px] w-full min-w-0 overflow-hidden rounded-lg border ${cardBorder} px-2.5 py-1.5 flex flex-col justify-between ${
                      isLightTv ? 'hover:border-blue-400' : 'hover:border-slate-400'
                    } transition cursor-pointer group`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <span
                          className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[10px] shrink-0 max-w-[85px] truncate"
                          title={`${f.area_name || f.area_code} (${f.area_code})`}
                        >
                          {f.area_name || f.area_code}
                        </span>
                        <span className={`font-mono font-bold text-[11px] shrink-0 ${headingTextCls}`}>
                          {f.item_code}
                        </span>
                        {isRepeat ? (
                          <span
                            className={`px-1.5 rounded font-semibold text-[10px] shrink-0 ${
                              isLightTv ? 'bg-purple-100 text-purple-800' : 'bg-purple-500/25 text-purple-300'
                            }`}
                          >
                            {t('repeat_level_pts', { w: f.repeat_level, pts: f.applied_penalty })}
                          </span>
                        ) : (
                          <span className={`font-mono text-[10px] shrink-0 ${warnTextCls}`}>
                            -{f.applied_penalty}{t('pts_unit')}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold shrink-0 ${
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
                    </div>

                    <div className={`text-xs font-medium truncate leading-tight my-0.5 min-w-0 ${isLightTv ? 'text-slate-800' : 'text-slate-100'}`}>
                      {shortCriterion}
                    </div>

                    <div className={`flex items-center justify-between gap-2 text-[10px] border-t pt-1 min-w-0 ${mutedTextCls} ${innerRowDividerCls}`}>
                      <span className="truncate min-w-0">
                        {isFixed ? 'Auditor:' : 'MNG:'}{' '}
                        <strong className={subTextCls}>
                          {isFixed
                            ? f.auditor_name || 'Auditor'
                            : f.manager_name || f.fixer_name || 'Area Manager'}
                        </strong>
                      </span>
                      <span
                        className={`font-semibold shrink-0 whitespace-nowrap ${
                          isFixed ? blueStatTextCls : passTextCls
                        }`}
                      >
                        {isFixed ? t('verify_close_btn') : t('update_after_btn')}
                      </span>
                    </div>
                  </Link>
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
      <div className="flex-none min-h-[220px] lg:flex-[42] grid grid-cols-12 gap-3 lg:gap-2.5">
        {/* 12-WEEK TREND LINE */}
        <div className={`col-span-12 lg:col-span-5 h-auto lg:h-full ${panelCls} p-2.5 sm:p-3 flex flex-col`}>
          <div className={`shrink-0 flex items-center justify-between pb-1.5 border-b ${subtleDividerCls}`}>
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

          <div className="h-48 sm:h-56 lg:h-full lg:flex-1 min-h-[160px] pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend_12_weeks}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
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
        <div className={`col-span-12 lg:col-span-4 h-auto lg:h-full ${panelCls} p-2.5 sm:p-3 flex flex-col justify-between gap-2`}>
          <div className={`shrink-0 flex items-center justify-between pb-1.5 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${headingTextCls}`}>
              {t('breakdown_title', {
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            <span className={`text-[10px] shrink-0 ${mutedTextCls}`}>
              {t('total_findings_count', { n: totalFindingsInMonth })}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-around py-1 text-xs gap-1.5 lg:gap-1">
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
                <div key={group.s_group} className="grid grid-cols-12 items-center gap-1.5 py-0.5">
                  <span className={`col-span-4 font-semibold truncate text-[11px] ${subTextCls}`}>
                    {sNames[group.s_group] || `S${group.s_group}`}
                  </span>
                  <div className={`col-span-4 h-2 rounded-full overflow-hidden ${barTrackCls}`}>
                    <div
                      className={`h-full ${barColor}`}
                      style={{ width: `${Math.max(4, widthPct)}%` }}
                    ></div>
                  </div>
                  <span className={`col-span-4 text-right font-mono font-bold text-[10px] whitespace-nowrap ${failTextCls}`}>
                    {group.count} {t('findings_unit')} (-{group.penalty}{t('pts_unit')})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP & BOTTOM MONTHLY LEADERBOARD */}
        <div className={`col-span-12 lg:col-span-3 h-auto lg:h-full ${panelCls} p-2.5 sm:p-3 flex flex-col justify-between gap-2`}>
          <div className={`shrink-0 flex items-center justify-between pb-1.5 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${headingTextCls}`}>
              {t('leaderboard_title', {
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            <span className={`text-[10px] shrink-0 ${mutedTextCls}`}>{t('top_bottom_label')}</span>
          </div>

          <div className="flex-1 flex flex-col justify-around text-xs py-0.5 gap-1.5 lg:gap-1">
            {top_areas && top_areas.length > 0 ? (
              top_areas.slice(0, 2).map((a: any, idx: number) => (
                <div
                  key={a.area_id}
                  className={`flex items-center justify-between px-2.5 py-1.5 sm:py-1 rounded border min-w-0 ${
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
                    {idx === 0 ? '🏆 1.' : '🥈 2.'} {a.area_name || a.area_code}
                  </span>
                  <span className={`font-mono font-black text-xs shrink-0 ml-1.5 ${passTextCls}`}>
                    {formatScore(a.month_avg, lang)}
                  </span>
                </div>
              ))
            ) : (
              <div className={`text-xs italic ${mutedTextCls}`}>{t('noData')}</div>
            )}

            {bottom_areas && bottom_areas.length > 0 ? (
              bottom_areas.slice(0, 2).map((a: any) => (
                <div
                  key={a.area_id}
                  className={`flex items-center justify-between px-2.5 py-1.5 sm:py-1 rounded border min-w-0 ${
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
