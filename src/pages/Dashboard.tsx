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
  AreaChart,
  Area,
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
import { resolveAppColorMode } from '../lib/theme';
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

/**
 * Maps a 5S score (focused window 60–100%) to a 0–100% track width so variations near
 * the 90% warning / 95% target thresholds are clearly legible on Bullet Target Bars.
 */
function scoreToBulletPct(score: number | null | undefined): number {
  if (score === null || score === undefined || isNaN(Number(score))) return 0;
  const normalized = ((Number(score) - 60) / 40) * 100;
  return Math.max(4, Math.min(100, Math.round(normalized * 10) / 10));
}

const RADAR_AXES = [
  { label: 'S1', angle: -90 },
  { label: 'S2', angle: -18 },
  { label: 'S3', angle: 54 },
  { label: 'S4', angle: 126 },
  { label: 'S5', angle: 198 },
];

export const Dashboard: React.FC = () => {
  const { lang, t } = useI18n();
  const { colorModeOverride } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedMonth = searchParams.get('month') || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [row3Tab, setRow3Tab] = useState<'improvement' | 'leaderboard'>('improvement');
  const [expandedAlarmId, setExpandedAlarmId] = useState<number | null>(null);
  const [selectedTrendArea, setSelectedTrendArea] = useState<any | null>(null);

  const resolvedMode = resolveAppColorMode(colorModeOverride, true);
  const isLightTv = resolvedMode === 'light';

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
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
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
  const isFallbackWeek =
    !isCurrentWeekAudited && kpi?.latest_completed_avg !== null && kpi?.latest_completed_avg !== undefined;
  const effectiveWeeklyScore = isCurrentWeekAudited
    ? kpi.weekly_avg
    : isFallbackWeek
    ? kpi.latest_completed_avg
    : null;
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

  // Total findings and max count for 5S breakdown + radar pentagon
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
  const maxGroupPenalty = Math.max(
    5,
    ...(s_group_breakdown || []).map((g: any) => Number(g.penalty) || 0)
  );
  const topViolationGroup = [...(s_group_breakdown || [])].sort(
    (a: any, b: any) => (b.count || 0) - (a.count || 0)
  )[0];
  const topViolationGroupName =
    topViolationGroup && topViolationGroup.count > 0
      ? `S${topViolationGroup.s_group} (${topViolationGroup.count} ${t('findings_unit')})`
      : '—';

  const targetMarkerLeftPct = scoreToBulletPct(target);

  // 5S Radar Pentagon polygon vertices (center: 55, 55; outer radius: 36)
  const buildPentagonPoints = (radiusScale: number) =>
    RADAR_AXES.map((axis) => {
      const rad = (axis.angle * Math.PI) / 180;
      const r = 36 * radiusScale;
      return `${(55 + r * Math.cos(rad)).toFixed(1)},${(55 + r * Math.sin(rad)).toFixed(1)}`;
    }).join(' ');

  const radarDataPoints = RADAR_AXES.map((axis, idx) => {
    const groupItem = (s_group_breakdown || []).find((g: any) => g.s_group === idx + 1) || {
      penalty: 0,
    };
    const penaltyRatio = Math.min(1, (Number(groupItem.penalty) || 0) / maxGroupPenalty);
    const healthRatio = Math.max(0.32, 1 - penaltyRatio * 0.68);
    const rad = (axis.angle * Math.PI) / 180;
    const r = 36 * healthRatio;
    return {
      x: 55 + r * Math.cos(rad),
      y: 55 + r * Math.sin(rad),
      label: axis.label,
    };
  });
  const radarPolygonStr = radarDataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Segmented Area status counts for KPI 3 bar
  const totalAreasDenominator = Math.max(1, kpi?.audited_areas_count || current_week_status?.length || 15);
  const passRatioPct = Math.round(((kpi?.passed_areas_count || 0) / totalAreasDenominator) * 100);
  const warnRatioPct = Math.round(((kpi?.warning_areas_count || 0) / totalAreasDenominator) * 100);
  const failRatioPct = Math.max(0, 100 - passRatioPct - warnRatioPct);

  // Open vs Waiting Verify bar ratio for KPI 4
  const openTotalPair = Math.max(1, (counts.open || 0) + (counts.waiting_verify || 0));
  const openOnlyPct = Math.round(((counts.open || 0) / openTotalPair) * 100);

  // ── Sample A: Bento Telemetry Pro Adaptive Surface Tokens ──
  const panelCls = isLightTv
    ? 'rounded-2xl bg-white/92 backdrop-blur-md border border-slate-200/90 shadow-[0_10px_28px_-12px_rgba(15,23,42,0.09)]'
    : 'rounded-2xl bg-[#0c1527]/88 backdrop-blur-md border border-slate-800/90 shadow-[0_14px_34px_-12px_rgba(2,6,23,0.75)]';

  const toolbarPillCls = isLightTv
    ? 'bg-white/90 backdrop-blur-md border-slate-200/90 text-slate-700 shadow-2xs'
    : 'bg-[#0c1527]/90 backdrop-blur-md border-slate-800 text-slate-200';

  const optionBgCls = isLightTv ? 'bg-white text-slate-900' : 'bg-[#0c1527] text-slate-200';
  const accentTextCls = isLightTv ? 'text-sky-600' : 'text-sky-400';

  const headingTextCls = isLightTv ? 'text-slate-900' : 'text-white';
  const subTextCls = isLightTv ? 'text-slate-700' : 'text-slate-200';
  const mutedTextCls = isLightTv ? 'text-slate-500' : 'text-slate-400';
  const subtleDividerCls = isLightTv ? 'border-slate-200/80' : 'border-white/10';
  const innerRowDividerCls = isLightTv ? 'border-slate-200/70' : 'border-white/5';

  // Status semantic colors adapted safely for Light vs Dark Bento
  const passTextCls = isLightTv ? 'text-emerald-700' : 'text-emerald-400';
  const passBadgeCls = isLightTv
    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  const warnTextCls = isLightTv ? 'text-amber-700' : 'text-amber-300';
  const warnBadgeCls = isLightTv
    ? 'bg-amber-100 text-amber-800 border border-amber-200'
    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
  const failTextCls = isLightTv ? 'text-rose-700' : 'text-rose-400';
  const failBadgeCls = isLightTv
    ? 'bg-rose-100 text-rose-800 border border-rose-200'
    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
  const blueStatTextCls = isLightTv ? 'text-sky-700' : 'text-sky-400';
  const purpleTextCls = isLightTv ? 'text-purple-700' : 'text-purple-300';
  const purpleValTextCls = isLightTv ? 'text-purple-700' : 'text-purple-400';

  const kpiOverdueCardCls = isLightTv
    ? `rounded-2xl bg-rose-50/95 backdrop-blur-md p-1.5 sm:px-2.5 sm:py-1.5 fit:p-1.5 fit:2xl:p-2 flex flex-col justify-between min-h-[54px] transition-all ${
        totalOverdue > 0 ? 'border-2 border-rose-500 alarm-pulse' : 'border border-rose-200'
      }`
    : `rounded-2xl bg-rose-950/35 backdrop-blur-md p-1.5 sm:px-2.5 sm:py-1.5 fit:p-1.5 fit:2xl:p-2 flex flex-col justify-between min-h-[54px] transition-all ${
        totalOverdue > 0 ? 'border-2 border-rose-500/90 alarm-pulse' : 'border border-slate-800'
      }`;

  const kpiRepeatCardCls = isLightTv
    ? 'rounded-2xl bg-white/95 backdrop-blur-md border border-purple-200 shadow-xs'
    : 'rounded-2xl bg-[#0c1527]/90 backdrop-blur-md border border-purple-500/35';

  const remedMiniCardCls = isLightTv
    ? 'rounded-xl bg-slate-100/85 border border-slate-200/80'
    : 'rounded-xl bg-[#070d1b]/90 border border-white/[0.08]';

  const remedBtnCls = isLightTv
    ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200'
    : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/25';

  const barTrackCls = isLightTv ? 'bg-slate-200/90' : 'bg-slate-800/90';
  const chartLineStroke = isLightTv ? '#0284c7' : '#38bdf8';
  const chartGridStroke = isLightTv ? '#cbd5e1' : 'rgba(148, 163, 184, 0.16)';
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
        backgroundColor: '#0b111e',
        border: '1px solid rgba(56, 189, 248, 0.30)',
        color: '#f8fafc',
        borderRadius: '10px',
        fontSize: '11px',
      };

  return (
    <div className="dashboard-container flex-1 w-full min-h-0 p-1.5 sm:p-2.5 2xl:p-3 flex flex-col gap-1.5 2xl:gap-2.5 select-none fit:h-full fit:overflow-hidden fit:p-1.5 fit:2xl:p-2.5">
      {/* TOOLBAR: Month Selector & Status */}
      <div className="shrink-0 flex items-center justify-between gap-1.5 px-0.5 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-xl border ${toolbarPillCls}`}>
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
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                isLightTv
                  ? 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700'
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
          <span className={`font-mono ${warnTextCls}`}>
            {warningTarget}-{target}%
          </span>
        </div>
      </div>

      {/* ROW 1: 6 BENTO KPI TELEMETRY CARDS WITH BULLET TARGET BARS */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
        {/* KPI 1: Weekly Average Score + Bullet Target Bar */}
        <div
          className={`${panelCls} p-1.5 sm:px-2.5 sm:py-1.5 fit:p-1.5 fit:2xl:p-2 flex flex-col justify-between min-h-[54px] fit:min-h-[52px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[10px] sm:text-[11px]">
              {t('weekly_avg_kpi', { week: effectiveWeeklyWeekName })}
            </span>
            {isCurrentWeekAudited ? (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${
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
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${warnBadgeCls}`}
                title={t('pending_audit_week', { week: current_week.iso_week })}
              >
                {t('latest_week_badge')}
              </span>
            ) : (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${warnBadgeCls}`}>
                {t('tag_pending')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 flex-nowrap">
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
              {effectiveWeeklyScore !== null
                ? formatScore(effectiveWeeklyScore, lang)
                : t('waiting_audit_badge')}
            </span>
            <div className="flex items-center gap-1 shrink-0 flex-nowrap">
              {kpi?.weekly_delta !== null && kpi?.weekly_delta !== undefined ? (
                <span
                  className={`text-[11px] font-mono font-bold shrink-0 whitespace-nowrap ${
                    kpi.weekly_delta >= 0 ? passTextCls : failTextCls
                  }`}
                >
                  {formatDelta(kpi.weekly_delta, lang)}
                </span>
              ) : null}
              {isFallbackWeek && (
                <span className={`text-[9px] font-mono truncate shrink-0 ${mutedTextCls}`}>
                  (W{current_week.iso_week})
                </span>
              )}
            </div>
          </div>
          {/* Bullet Target Progress Bar */}
          <div className={`bullet-track w-full h-1.5 mt-1 ${barTrackCls}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                effectiveWeeklyScore === null
                  ? 'bg-slate-500/40'
                  : effectiveWeeklyScore >= target
                  ? 'bg-emerald-500'
                  : effectiveWeeklyScore >= warningTarget
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${scoreToBulletPct(effectiveWeeklyScore)}%` }}
            />
            <span
              className={`bullet-target-marker ${isLightTv ? 'bg-slate-900' : 'bg-white'}`}
              style={{ left: `${targetMarkerLeftPct}%` }}
              title={`${t('target')}: ${target}%`}
            />
          </div>
        </div>

        {/* KPI 2: Monthly Average Score + Bullet Target Bar */}
        <div
          className={`${panelCls} p-1.5 sm:px-2.5 sm:py-1.5 fit:p-1.5 fit:2xl:p-2 flex flex-col justify-between min-h-[54px] fit:min-h-[52px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[10px] sm:text-[11px]">
              {t('monthly_avg_kpi', {
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            {month_info?.is_fallback ? (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${warnBadgeCls}`}>
                {t('latest_month_badge')}
              </span>
            ) : (
              <span className={`font-mono text-[9px] shrink-0 ${mutedTextCls}`}>
                {t('target_standard', { target })}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap ${headingTextCls}`}>
              {formatScore(kpi?.monthly_avg_overall, lang)}
            </span>
            <span className={`text-[10px] font-mono truncate shrink-0 ${mutedTextCls}`}>
              {month_info?.is_fallback
                ? t('historical_data_badge')
                : `W${current_week.iso_week} (${current_week.iso_year})`}
            </span>
          </div>
          {/* Bullet Target Progress Bar */}
          <div className={`bullet-track w-full h-1.5 mt-1 ${barTrackCls}`}>
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{ width: `${scoreToBulletPct(kpi?.monthly_avg_overall)}%` }}
            />
            <span
              className={`bullet-target-marker ${isLightTv ? 'bg-slate-900' : 'bg-white'}`}
              style={{ left: `${targetMarkerLeftPct}%` }}
              title={`${t('target')}: ${target}%`}
            />
          </div>
        </div>

        {/* KPI 3: Areas Meeting Target + Segmented 3-Tier Bar */}
        <div
          className={`${panelCls} p-1.5 sm:px-2.5 sm:py-1.5 fit:p-1.5 fit:2xl:p-2 flex flex-col justify-between min-h-[54px] fit:min-h-[52px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[10px] sm:text-[11px]">{t('areas_meeting_target')}</span>
            <span className={`text-[9px] font-bold shrink-0 ${blueStatTextCls}`}>
              {month_info?.is_fallback
                ? t('display_month_short', { month: getMonthShortName(month_info.display_month) })
                : t('audited_areas_status', {
                    audited: kpi?.audited_areas_count || 0,
                    total: kpi?.total_areas_count || 0,
                  })}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap shrink-0 ${blueStatTextCls}`}>
              {kpi?.passed_areas_count || 0}{' '}
              <span className={`text-[11px] font-normal ${mutedTextCls}`}>
                {t('area_count_slash', { n: kpi?.audited_areas_count || 0 })}
              </span>
            </span>
            <div className="flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap shrink-0">
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
          {/* Segmented Pass / Warning / Fail Progress Bar */}
          <div className={`w-full h-1.5 rounded-full overflow-hidden flex mt-1 ${barTrackCls}`}>
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${passRatioPct}%` }} />
            <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${warnRatioPct}%` }} />
            <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${failRatioPct}%` }} />
          </div>
        </div>

        {/* KPI 4: Open Findings */}
        <div
          className={`${panelCls} p-1.5 sm:px-2.5 sm:py-1.5 fit:p-1.5 fit:2xl:p-2 flex flex-col justify-between min-h-[54px] fit:min-h-[52px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs min-w-0 ${mutedTextCls}`}>
            <span className="font-semibold truncate text-[10px] sm:text-[11px]">{t('open_findings_kpi')}</span>
            <span className={`text-[9px] font-bold shrink-0 ${isLightTv ? 'text-amber-700' : 'text-amber-400'}`}>
              {t('waiting_mng')}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap ${isLightTv ? 'text-amber-700' : 'text-amber-400'}`}>
              {counts.open}
            </span>
            <span className={`text-[10px] truncate shrink-0 ${mutedTextCls}`}>
              {t('waiting_verify_count', { n: counts.waiting_verify })}
            </span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden flex mt-1 ${barTrackCls}`}>
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${counts.open > 0 ? Math.max(12, openOnlyPct) : 0}%` }}
            />
            <div
              className="h-full bg-sky-500 transition-all duration-500"
              style={{ width: `${counts.waiting_verify > 0 ? Math.max(12, 100 - openOnlyPct) : 0}%` }}
            />
          </div>
        </div>

        {/* KPI 5: 7-Day Overdue Alarm */}
        <div className={`${kpiOverdueCardCls} min-h-[54px] fit:min-h-[52px]`}>
          <div className={`flex items-center justify-between gap-1 text-xs font-bold min-w-0 ${failTextCls}`}>
            <span className="truncate text-[10px] sm:text-[11px]">{t('alarm_7_days')}</span>
            {totalOverdue > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black shrink-0">
                {t('alarm_badge')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap ${failTextCls}`}>
              {totalOverdue}
            </span>
            <span className={`text-[10px] font-semibold truncate shrink-0 max-w-[130px] ${isLightTv ? 'text-rose-700' : 'text-rose-300'}`}>
              {overdueAreasList || t('no_findings_clean')}
            </span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 ${barTrackCls}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalOverdue > 0 ? 'bg-rose-500' : 'bg-emerald-500/70'
              }`}
              style={{ width: totalOverdue > 0 ? `${Math.min(100, Math.max(20, totalOverdue * 15))}%` : '100%' }}
            />
          </div>
        </div>

        {/* KPI 6: Repeat Findings Escalation */}
        <div
          className={`${kpiRepeatCardCls} p-1.5 sm:px-2.5 sm:py-1.5 fit:p-1.5 fit:2xl:p-2 flex flex-col justify-between min-h-[54px] fit:min-h-[52px]`}
        >
          <div className={`flex items-center justify-between gap-1 text-xs font-semibold min-w-0 ${purpleTextCls}`}>
            <span className="truncate text-[10px] sm:text-[11px]">{t('repeat_findings_kpi')}</span>
            <span
              className={`px-1.5 rounded-full text-[9px] font-bold shrink-0 ${
                isLightTv ? 'bg-purple-100 text-purple-800' : 'bg-purple-500/20 text-purple-300'
              }`}
            >
              {t('repeat_step_badge')}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-0.5 flex-nowrap">
            <span className={`text-lg sm:text-xl font-black font-mono leading-none whitespace-nowrap ${purpleValTextCls}`}>
              {counts.not_improved}
            </span>
            <span className={`text-[10px] font-semibold truncate shrink-0 max-w-[130px] ${purpleTextCls}`}>
              {repeatAreasList || t('no_findings_clean')}
            </span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 ${barTrackCls}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                counts.not_improved > 0 ? 'bg-purple-500' : 'bg-emerald-500/70'
              }`}
              style={{
                width: counts.not_improved > 0 ? `${Math.min(100, Math.max(20, counts.not_improved * 18))}%` : '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* ROW 2: MIDDLE MAIN TELEMETRY WORKSPACE */}
      <div className="dashboard-row-2 grid grid-cols-12 gap-2 2xl:gap-3 fit:min-h-0 fit:grid-rows-[minmax(0,1fr)]">
        {/* LEFT 8 COLS: 15 AREAS BENTO MATRIX WALL */}
        <div className={`col-span-12 lg:col-span-8 ${panelCls} p-2 sm:p-2.5 fit:p-1.5 fit:2xl:p-2.5 flex flex-col justify-between fit:min-h-0 fit:overflow-hidden`}>
          <div className={`shrink-0 flex items-center justify-between pb-1 fit:pb-1 2xl:pb-2 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs tracking-wide uppercase truncate ${headingTextCls}`}>
              {t('production_areas_wall', {
                total: current_week_status?.length || 15,
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

          {/* Grid of area cards: 5 cols desktop (15 areas = EXACTLY 3 rows!) */}
          <div className="mt-1 fit:mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 fit:gap-1.5 fit:2xl:gap-2 fit:flex-1 fit:min-h-0 fit:grid-rows-3 fit:grid-cols-5">
            {current_week_status.map((area: any) => {
              const isCurrentWeekAudited = area.status === 'submitted' && area.score !== null;

              const latestCompleted = area.latest_completed_week;
              const weekScore = isCurrentWeekAudited ? area.score : latestCompleted?.score ?? null;
              const weekLabel = isCurrentWeekAudited
                ? `W${current_week.iso_week}`
                : latestCompleted?.week ?? `W${current_week.iso_week}`;
              const isWeekFallback =
                !isCurrentWeekAudited && latestCompleted?.score !== null && latestCompleted?.score !== undefined;

              const hasCurrentMonthAvg = area.month_avg !== null && area.month_avg !== undefined;
              const monthScore = hasCurrentMonthAvg ? area.month_avg : area.prev_month_avg ?? null;
              const targetMonthStr = hasCurrentMonthAvg
                ? month_info?.display_month || current_week.month
                : area.prev_month_str || current_week.month;
              const monthParts = String(targetMonthStr).split('-');
              const monthNum = parseInt(monthParts[monthParts.length - 1], 10);
              const monthDisplayLabel = lang === 'vi' ? String(monthNum) : getMonthShortName(targetMonthStr);
              const isMonthFallback =
                !hasCurrentMonthAvg && area.prev_month_avg !== null && area.prev_month_avg !== undefined;

              const primaryScore = isCurrentWeekAudited ? area.score : weekScore ?? monthScore;
              const isPass = primaryScore !== null && primaryScore >= target;
              const isWarning = primaryScore !== null && primaryScore >= warningTarget && primaryScore < target;
              const isFail = primaryScore !== null && primaryScore < warningTarget;
              const isOverdue = area.overdue_count > 0;

              const boxCls = isLightTv
                ? isOverdue
                  ? 'rounded-xl border border-rose-400 bg-rose-50/75 ring-1 ring-rose-300/60'
                  : isPass
                  ? 'rounded-xl border border-emerald-300/90 bg-emerald-50/45'
                  : isWarning
                  ? 'rounded-xl border border-amber-300/90 bg-amber-50/55 ring-1 ring-amber-200/60'
                  : isFail
                  ? 'rounded-xl border border-rose-300 bg-rose-50/65'
                  : 'rounded-xl border border-slate-200 bg-slate-50/80 opacity-85'
                : isOverdue
                ? 'rounded-xl border border-rose-500/80 bg-rose-950/30 ring-1 ring-rose-500/40'
                : isPass
                ? 'rounded-xl border border-emerald-500/35 bg-emerald-950/20'
                : isWarning
                ? 'rounded-xl border border-amber-500/40 bg-amber-950/25 ring-1 ring-amber-500/20'
                : isFail
                ? 'rounded-xl border border-rose-500/70 bg-rose-950/30'
                : 'rounded-xl border border-slate-700/80 bg-slate-800/40 opacity-80';

              const miniTileCls = isLightTv
                ? 'bg-white/90 border border-slate-200/80'
                : 'bg-[#070d1b]/75 border border-slate-800/80';

              const bulletFillCls =
                primaryScore === null
                  ? 'bg-slate-500/40'
                  : isPass
                  ? 'bg-emerald-500'
                  : isWarning
                  ? 'bg-amber-400'
                  : 'bg-rose-500';

              return (
                <div
                  key={area.area_id}
                  onClick={() => setSelectedTrendArea(area)}
                  className={`${boxCls} p-1.5 sm:p-2 fit:p-1.5 fit:2xl:p-2 flex flex-col justify-between h-auto min-h-[100px] sm:min-h-[108px] fit:min-h-0 fit:h-full fit:overflow-hidden transition-all duration-150 cursor-pointer group ${
                    isLightTv ? 'hover:border-sky-400 hover:shadow-md' : 'hover:border-sky-400/70'
                  }`}
                  title={t('click_to_inspect_area')}
                >
                  {/* Tier 1: Header (Area Name on Left, Status Badge on Right) */}
                  <div className={`flex items-center justify-between gap-1 min-w-0 pb-0.5 fit:pb-0.5 2xl:pb-1 border-b ${innerRowDividerCls} shrink-0`}>
                    <span
                      className={`font-black text-xs sm:text-[13px] fit:text-[11px] 2xl:fit:text-sm tracking-wide transition-colors truncate max-w-[65%] ${headingTextCls} group-hover:text-sky-400`}
                      title={`${area.area_name || area.area_code} (${area.area_code})`}
                    >
                      {area.area_name || area.area_code}
                    </span>
                    <div className="shrink-0">
                      {isOverdue ? (
                        <span className="px-1.5 py-0.2 fit:py-0 rounded-full bg-rose-600 text-white text-[9px] 2xl:text-[10px] font-black uppercase tracking-wider shadow-xs">
                          🚨 {area.overdue_count}
                        </span>
                      ) : isCurrentWeekAudited ? (
                        isPass ? (
                          <span className={`px-1.5 py-0.2 fit:py-0 rounded-full text-[9px] 2xl:text-[10px] font-black tracking-wider ${passBadgeCls}`}>
                            {t('tag_pass')}
                          </span>
                        ) : isWarning ? (
                          <span className={`px-1.5 py-0.2 fit:py-0 rounded-full text-[9px] 2xl:text-[10px] font-black tracking-wider ${warnBadgeCls}`}>
                            {t('tag_warning')}
                          </span>
                        ) : (
                          <span className={`px-1.5 py-0.2 fit:py-0 rounded-full text-[9px] 2xl:text-[10px] font-black tracking-wider ${failBadgeCls}`}>
                            {t('tag_fail')}
                          </span>
                        )
                      ) : (
                        <span className={`px-1.5 py-0.2 fit:py-0 rounded-full text-[9px] 2xl:text-[10px] font-bold tracking-wider ${warnBadgeCls}`}>
                          {t('badge_pending_week', { week: current_week.iso_week })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tier 2: Telemetry Body (Symmetrical Week/Month Tiles + Horizontal Bullet Target Bar) */}
                  <div className="flex-1 flex flex-col justify-center gap-1 py-0.5 fit:py-0.5 min-w-0">
                    <div className="grid grid-cols-2 gap-1 2xl:gap-1.5 min-w-0 items-center">
                      {/* Left Tile: Week Score */}
                      <div className={`flex flex-col items-center justify-center rounded-md 2xl:rounded-lg py-0.5 px-1 min-w-0 ${miniTileCls}`}>
                        <div className={`flex items-center gap-0.5 2xl:gap-1 text-[8px] 2xl:text-[9px] uppercase font-bold tracking-wider truncate ${mutedTextCls}`}>
                          <span>{t('week')}</span>
                          <span className={isWeekFallback ? 'text-amber-500 font-mono' : 'font-mono'}>
                            {weekLabel}
                          </span>
                        </div>
                        <span
                          className={`font-black text-xs sm:text-sm fit:text-xs 2xl:fit:text-base font-mono tracking-tight leading-none mt-0.5 ${
                            weekScore !== null
                              ? weekScore >= target
                                ? passTextCls
                                : weekScore >= warningTarget
                                ? warnTextCls
                                : failTextCls
                              : mutedTextCls
                          }`}
                        >
                          {weekScore !== null ? formatScore(weekScore, lang) : '-'}
                        </span>
                      </div>

                      {/* Right Tile: Month Score */}
                      <div className={`flex flex-col items-center justify-center rounded-md 2xl:rounded-lg py-0.5 px-1 min-w-0 ${miniTileCls}`}>
                        <div className={`flex items-center gap-0.5 2xl:gap-1 text-[8px] 2xl:text-[9px] uppercase font-bold tracking-wider truncate ${mutedTextCls}`}>
                          <span>{t('month')}</span>
                          <span className={isMonthFallback ? accentTextCls : 'font-mono'}>
                            {monthDisplayLabel}
                          </span>
                        </div>
                        <span
                          className={`font-black text-xs sm:text-sm fit:text-xs 2xl:fit:text-base font-mono tracking-tight leading-none mt-0.5 ${
                            monthScore !== null
                              ? monthScore >= target
                                ? passTextCls
                                : monthScore >= warningTarget
                                ? warnTextCls
                                : failTextCls
                              : mutedTextCls
                          }`}
                        >
                          {monthScore !== null ? formatScore(monthScore, lang) : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Bullet Target Bar vs Target% */}
                    <div className={`bullet-track w-full h-1 ${barTrackCls}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${bulletFillCls}`}
                        style={{ width: `${scoreToBulletPct(primaryScore)}%` }}
                      />
                      <span
                        className={`bullet-target-marker ${isLightTv ? 'bg-slate-900' : 'bg-white/90'}`}
                        style={{ left: `${targetMarkerLeftPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Tier 3: Action Telemetry Footer */}
                  <div className={`flex items-center justify-between text-[9px] 2xl:text-[10px] pt-0.5 fit:pt-0.5 2xl:pt-1 border-t ${innerRowDividerCls} ${mutedTextCls} font-mono shrink-0`}>
                    <div className="flex items-center gap-1">
                      <span>{t('open_short')}:</span>
                      <strong className={area.open_count > 0 ? 'text-amber-500 font-bold' : subTextCls}>
                        {area.open_count}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1">
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

        {/* RIGHT 4 COLS: 7-DAY SLA COUNTDOWN & REMEDIATION EFFECTIVENESS BOARD */}
        <div className={`col-span-12 lg:col-span-4 ${panelCls} p-2 sm:p-2.5 fit:p-2 fit:2xl:p-3 flex flex-col min-w-0 justify-start gap-1.5 fit:gap-1.5 2xl:fit:gap-2 fit:min-h-0 fit:overflow-hidden`}>
          <div className={`shrink-0 flex items-center justify-between gap-2 pb-1 border-b min-w-0 ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${failTextCls}`}>
              {t('alarm_board_title')}
            </span>
            <Link
              to="/reports"
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition ${remedBtnCls}`}
            >
              {t('remediation_report')} →
            </Link>
          </div>

          {/* 3-Tile Remediation Effectiveness Strip */}
          <div className="shrink-0 mt-0.5 grid grid-cols-3 gap-1 min-w-0">
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

          {/* Expandable Urgent Alarms Countdown List */}
          <div className="mt-0.5 flex-1 flex flex-col justify-start gap-1.5 2xl:gap-2 min-w-0 fit:min-h-0 overflow-y-auto pr-0.5">
            {urgent_alarms && urgent_alarms.length > 0 ? (
              urgent_alarms.slice(0, 6).map((f: any) => {
                const isOverdue = f.is_overdue;
                const isFixed = f.status === 'fixed';
                const isRepeat = f.repeat_level > 1;

                const cardBorder = isLightTv
                  ? isOverdue
                    ? 'border-rose-300 bg-rose-50/90'
                    : isRepeat
                    ? 'border-purple-300 bg-purple-50/80'
                    : isFixed
                    ? 'border-sky-300 bg-sky-50/80'
                    : 'border-amber-300 bg-amber-50/80'
                  : isOverdue
                  ? 'border-rose-500/60 bg-rose-950/25'
                  : isRepeat
                  ? 'border-purple-500/40 bg-purple-950/20'
                  : isFixed
                  ? 'border-sky-500/40 bg-sky-950/20'
                  : 'border-amber-500/40 bg-amber-950/20';

                const fullCriterion = lang === 'en' ? f.content_en || f.content_vi : f.content_vi;
                const shortCriterion = getShortCriterionText(f.item_code, fullCriterion, lang);

                const isExpanded = expandedAlarmId === f.id;

                return (
                  <div
                    key={f.id}
                    onClick={() => setExpandedAlarmId(isExpanded ? null : f.id)}
                    className={`w-full min-w-0 shrink-0 rounded-lg border ${cardBorder} px-2.5 py-1.5 sm:py-2 flex flex-col justify-between ${
                      isLightTv ? 'hover:border-sky-500' : 'hover:border-sky-400/70'
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
                            -{f.applied_penalty}
                            {t('pts_unit')}
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
                          className="p-0.5 rounded text-slate-400 group-hover:text-sky-400 transition"
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

                    <div
                      className={`text-[10px] sm:text-[11px] font-medium leading-tight my-0.5 min-w-0 ${
                        isExpanded ? 'whitespace-normal' : 'truncate'
                      } ${isLightTv ? 'text-slate-800' : 'text-slate-100'}`}
                    >
                      {isExpanded ? fullCriterion : shortCriterion}
                    </div>

                    {isExpanded && (
                      <div className={`pt-1.5 pb-1 mt-1 border-t ${innerRowDividerCls} flex flex-col gap-1 text-[11px] animate-in fade-in duration-150`}>
                        {f.description && (
                          <div
                            className={`text-[11px] italic p-1.5 rounded ${
                              isLightTv ? 'bg-slate-100 text-slate-700' : 'bg-black/30 text-slate-200'
                            }`}
                          >
                            "{f.description}"
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-400">
                          <span>
                            {t('areas')}: <strong className={subTextCls}>{f.area_name || f.area_code}</strong>
                          </span>
                          <span>
                            {t('due_date')}: <strong className={subTextCls}>{f.due_date}</strong>
                          </span>
                        </div>
                      </div>
                    )}

                    <div
                      className={`flex items-center justify-between gap-2 text-[9px] sm:text-[10px] border-t pt-0.5 min-w-0 ${mutedTextCls} ${innerRowDividerCls}`}
                    >
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

      {/* ROW 3: BOTTOM ANALYTICS STRIP (3 Equal 4-Column Bento Cards) */}
      <div className="dashboard-row-3 grid grid-cols-12 gap-1.5 2xl:gap-2.5 fit:min-h-0 fit:grid-rows-[minmax(0,1fr)]">
        {/* CARD 1: 12-WEEK PLANT TREND AREA CHART */}
        <div
          className={`col-span-12 lg:col-span-4 min-h-[170px] fit:min-h-0 fit:overflow-hidden ${panelCls} p-2 sm:p-2.5 fit:p-1.5 fit:2xl:p-2.5 flex flex-col justify-between`}
        >
          <div className={`shrink-0 flex items-center justify-between pb-1 fit:pb-0.5 2xl:pb-1.5 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${headingTextCls}`}>
              {t('trend_title')}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono shrink-0">
              <span className={`font-semibold ${passTextCls}`}>
                {t('target_reference_label', { target: `${target}.0` })}
              </span>
              <span className={`font-semibold ${warnTextCls}`}>
                {t('warning_reference_label', { target: `${warningTarget}.0` })}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-[100px] fit:min-h-0 pt-0.5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend_12_weeks}
                margin={{ top: 6, right: 6, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="bentoTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartLineStroke} stopOpacity={0.38} />
                    <stop offset="95%" stopColor={chartLineStroke} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: chartTickColor }} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 9, fill: chartTickColor }} />
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
                <Area
                  type="monotone"
                  dataKey="avg_score"
                  connectNulls
                  stroke={chartLineStroke}
                  strokeWidth={2.5}
                  fill="url(#bentoTrendGradient)"
                  dot={{ r: 2, fill: chartLineStroke }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 2: 5S RADAR PENTAGON SVG + S1-S5 PILLAR PARETO BREAKDOWN */}
        <div
          className={`col-span-12 md:col-span-6 lg:col-span-4 min-h-[170px] fit:min-h-0 fit:overflow-hidden ${panelCls} p-2 sm:p-2.5 fit:p-1.5 fit:2xl:p-2.5 flex flex-col justify-between gap-1 fit:gap-0.5`}
        >
          <div className={`shrink-0 flex items-center justify-between pb-1 fit:pb-0.5 2xl:pb-1.5 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${headingTextCls}`}>
              {t('breakdown_title', {
                month: formatMonthYear(month_info?.display_month || current_week.month),
              })}
            </span>
            <span className={`text-[10px] shrink-0 font-mono ${mutedTextCls}`}>
              {t('total_findings_count', { n: totalFindingsInMonth })}
            </span>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-12 gap-1.5 items-center py-0.5 fit:py-0">
            {/* Left 4 Cols: 5S Radar Pentagon SVG */}
            <div className="col-span-4 h-full flex items-center justify-center min-h-[92px] fit:min-h-0">
              <svg viewBox="0 0 110 110" className="w-full h-full max-w-[106px] max-h-[106px]">
                {/* Reference pentagon rings */}
                <polygon
                  points={buildPentagonPoints(1.0)}
                  fill="none"
                  stroke={isLightTv ? 'rgba(15, 23, 42, 0.14)' : 'rgba(148, 163, 184, 0.22)'}
                  strokeWidth="1"
                />
                <polygon
                  points={buildPentagonPoints(0.68)}
                  fill="none"
                  stroke={isLightTv ? 'rgba(15, 23, 42, 0.10)' : 'rgba(148, 163, 184, 0.14)'}
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                {/* Radial axis spokes */}
                {RADAR_AXES.map((axis) => {
                  const rad = (axis.angle * Math.PI) / 180;
                  const x2 = 55 + 36 * Math.cos(rad);
                  const y2 = 55 + 36 * Math.sin(rad);
                  const lx = 55 + 46 * Math.cos(rad);
                  const ly = 55 + 46 * Math.sin(rad);
                  return (
                    <g key={axis.label}>
                      <line
                        x1="55"
                        y1="55"
                        x2={x2}
                        y2={y2}
                        stroke={isLightTv ? 'rgba(15, 23, 42, 0.12)' : 'rgba(148, 163, 184, 0.18)'}
                        strokeWidth="0.8"
                      />
                      <text
                        x={lx}
                        y={ly + 3}
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="800"
                        fill={isLightTv ? '#334155' : '#94a3b8'}
                      >
                        {axis.label}
                      </text>
                    </g>
                  );
                })}
                {/* Actual 5S health polygon */}
                <polygon
                  points={radarPolygonStr}
                  fill={isLightTv ? 'rgba(14, 165, 233, 0.22)' : 'rgba(56, 189, 248, 0.24)'}
                  stroke={isLightTv ? '#0284c7' : '#38bdf8'}
                  strokeWidth="1.8"
                />
                {radarDataPoints.map((pt) => (
                  <circle
                    key={pt.label}
                    cx={pt.x}
                    cy={pt.y}
                    r="2.2"
                    fill={isLightTv ? '#0284c7' : '#38bdf8'}
                  />
                ))}
              </svg>
            </div>

            {/* Right 8 Cols: S1-S5 Pillar Bars */}
            <div className="col-span-8 flex flex-col justify-around h-full text-xs gap-0.5 min-w-0">
              {(s_group_breakdown || []).map((group: any) => {
                const widthPct = Math.round(((group.count || 0) / maxGroupFindings) * 100);
                const barColor =
                  group.s_group === 2
                    ? 'bg-rose-500'
                    : group.s_group === 3
                    ? 'bg-amber-500'
                    : group.s_group === 1
                    ? 'bg-sky-500'
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
                  <div key={group.s_group} className="flex flex-col gap-0.5 py-0.2 min-w-0">
                    <div className="flex items-center justify-between text-xs min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${barColor} shrink-0`}></span>
                        <span className={`font-semibold truncate text-[10px] ${subTextCls}`}>
                          {sNames[group.s_group] || `S${group.s_group}`}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold text-[9px] sm:text-[10px] whitespace-nowrap shrink-0 ml-1 ${
                          group.count > 0 ? failTextCls : mutedTextCls
                        }`}
                      >
                        {group.count} (-{group.penalty}
                        {t('pts_unit')})
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${barTrackCls}`}>
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(group.count > 0 ? 5 : 0, widthPct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Summary Footer Strip */}
          <div className={`shrink-0 pt-0.5 fit:pt-0.5 2xl:pt-1 border-t ${subtleDividerCls} flex items-center justify-between text-[9px] sm:text-[10px] font-mono ${mutedTextCls}`}>
            <span className={`font-semibold ${failTextCls}`}>
              {t('total_penalty_month', { n: totalPenaltiesInMonth })}
            </span>
            <span className="truncate ml-2">
              {t('top_violation_group', { group: topViolationGroupName })}
            </span>
          </div>
        </div>

        {/* CARD 3: CONTINUOUS IMPROVEMENT KAIZEN TRACKER & LEADERBOARD */}
        <div
          className={`col-span-12 md:col-span-6 lg:col-span-4 min-h-[170px] fit:min-h-0 fit:overflow-hidden ${panelCls} p-2 sm:p-2.5 fit:p-1.5 fit:2xl:p-2.5 flex flex-col justify-between gap-1 fit:gap-0.5`}
        >
          <div className={`shrink-0 flex items-center justify-between pb-1 fit:pb-0.5 2xl:pb-1.5 border-b ${subtleDividerCls}`}>
            <span className={`font-bold text-xs uppercase truncate ${headingTextCls}`}>
              {row3Tab === 'improvement'
                ? t('continuous_improvement_title')
                : t('leaderboard_title', {
                    month: formatMonthYear(month_info?.display_month || current_week.month),
                  })}
            </span>
            <div
              className={`flex items-center gap-0.5 rounded-lg p-0.5 text-[9px] font-bold shrink-0 ${
                isLightTv ? 'bg-slate-100 border border-slate-200' : 'bg-[#070d1b] border border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setRow3Tab('improvement')}
                className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                  row3Tab === 'improvement'
                    ? 'bg-sky-500 text-slate-950 font-black'
                    : `${mutedTextCls} hover:text-sky-400`
                }`}
                title={t('switch_to_improvement_view')}
              >
                {t('tab_improvement_btn')}
              </button>
              <button
                type="button"
                onClick={() => setRow3Tab('leaderboard')}
                className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                  row3Tab === 'leaderboard'
                    ? 'bg-sky-500 text-slate-950 font-black'
                    : `${mutedTextCls} hover:text-sky-400`
                }`}
                title={t('switch_to_leaderboard_view')}
              >
                Top
              </button>
            </div>
          </div>

          {row3Tab === 'improvement' ? (
            <div className="flex-1 flex flex-col justify-between text-xs py-0.5 fit:py-0 gap-1 fit:gap-0.5 min-h-0 overflow-hidden">
              {/* Kaizen Status Micro-Strip */}
              <div
                className={`shrink-0 grid grid-cols-3 gap-1 p-0.5 rounded-lg border ${
                  isLightTv ? 'bg-slate-100 border-slate-200' : 'bg-[#070d1b]/70 border-white/5'
                } text-[9px] sm:text-[10px] font-mono text-center whitespace-nowrap`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-emerald-500 font-bold">▲</span>
                  <span className={`font-semibold ${passTextCls}`}>
                    {t('kaizen_stat_improved', {
                      n: improvement_analysis?.improved_count ?? (improvement_analysis?.top_improvers?.length || 0),
                    })}
                  </span>
                </div>
                <div className={`flex items-center justify-center gap-1 border-x ${subtleDividerCls}`}>
                  <span className="text-slate-400 font-bold">▬</span>
                  <span className={`font-semibold ${mutedTextCls}`}>
                    {t('kaizen_stat_stable', { n: improvement_analysis?.stagnant_count ?? 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-rose-500 font-bold">▼</span>
                  <span className={`font-semibold ${failTextCls}`}>
                    {t('kaizen_stat_declined', {
                      n: improvement_analysis?.declined_count ?? (improvement_analysis?.stagnant_areas?.length || 0),
                    })}
                  </span>
                </div>
              </div>

              {/* Side-by-side 2 Columns: Left = Top Improvers, Right = Needs Improvement */}
              <div className="flex-1 min-h-0 grid grid-cols-2 gap-1.5 sm:gap-2 overflow-hidden items-stretch">
                {/* Col 1: Top Improvers */}
                <div className="flex flex-col min-h-0 overflow-hidden justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 mb-0.5 px-0.5 truncate ${passTextCls}`}>
                    {t('top_improvers_title')}
                  </span>
                  <div className="flex-1 min-h-0 flex flex-col justify-around gap-0.5 fit:gap-0.5 overflow-hidden">
                    {improvement_analysis?.top_improvers && improvement_analysis.top_improvers.length > 0 ? (
                      improvement_analysis.top_improvers.slice(0, 3).map((a: any) => (
                        <div
                          key={a.area_id}
                          className={`flex items-center justify-between px-1.5 py-0.5 fit:py-0.2 2xl:fit:py-0.5 rounded-lg border min-w-0 transition-all shrink-0 ${
                            isLightTv
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-emerald-500/10 border-emerald-500/25'
                          }`}
                        >
                          <span
                            className={`font-bold truncate text-[10px] sm:text-[11px] min-w-0 ${
                              isLightTv ? 'text-emerald-800' : 'text-emerald-300'
                            }`}
                            title={`${a.area_name || a.area_code} (${a.area_code})`}
                          >
                            🚀 {a.area_name || a.area_code}
                          </span>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <span className={`font-mono font-bold text-[10px] sm:text-[11px] ${passTextCls}`}>
                              {formatScore(a.current_score, lang)}
                            </span>
                            <span
                              className={`px-1 py-0.2 rounded font-mono font-bold text-[9px] sm:text-[10px] ${
                                isLightTv ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              ▲+{a.delta}
                              {t('pts_unit')}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`text-xs italic py-1 ${mutedTextCls}`}>{t('no_improvers')}</div>
                    )}
                  </div>
                </div>

                {/* Col 2: Stagnant / Needs Improvement */}
                <div className="flex flex-col min-h-0 overflow-hidden justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 mb-0.5 px-0.5 truncate ${failTextCls}`}>
                    {t('stagnant_areas_title')}
                  </span>
                  <div className="flex-1 min-h-0 flex flex-col justify-around gap-0.5 fit:gap-0.5 overflow-hidden">
                    {improvement_analysis?.stagnant_areas && improvement_analysis.stagnant_areas.length > 0 ? (
                      improvement_analysis.stagnant_areas.slice(0, 3).map((a: any) => (
                        <div
                          key={a.area_id}
                          className={`flex items-center justify-between px-1.5 py-0.5 fit:py-0.2 2xl:fit:py-0.5 rounded-lg border min-w-0 transition-all shrink-0 ${
                            isLightTv
                              ? 'bg-rose-50 border-rose-200'
                              : 'bg-rose-500/15 border-rose-500/35'
                          }`}
                        >
                          <span
                            className={`font-bold truncate text-[10px] sm:text-[11px] min-w-0 ${
                              isLightTv ? 'text-rose-800' : 'text-rose-300'
                            }`}
                            title={`${a.area_name || a.area_code} (${a.area_code})`}
                          >
                            ⚠️ {a.area_name || a.area_code}
                          </span>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <span className={`font-mono font-bold text-[10px] sm:text-[11px] ${failTextCls}`}>
                              {formatScore(a.current_score, lang)}
                            </span>
                            <span
                              className={`px-1 py-0.2 rounded font-mono font-bold text-[9px] sm:text-[10px] ${
                                a.delta !== null && a.delta < 0
                                  ? isLightTv
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-rose-500/25 text-rose-300'
                                  : isLightTv
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
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
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between text-xs py-0.5 fit:py-0 gap-1 fit:gap-0.5 min-h-0 overflow-hidden">
              {/* Side-by-side 2 Columns for Leaderboard */}
              <div className="flex-1 min-h-0 grid grid-cols-2 gap-1.5 sm:gap-2 overflow-hidden items-stretch">
                {/* Col 1: Top 3 Leaders */}
                <div className="flex flex-col min-h-0 overflow-hidden justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 mb-0.5 px-0.5 truncate ${passTextCls}`}>
                    {t('top_leaders_title')}
                  </span>
                  <div className="flex-1 min-h-0 flex flex-col justify-around gap-0.5 fit:gap-0.5 overflow-hidden">
                    {top_areas && top_areas.length > 0 ? (
                      top_areas.slice(0, 3).map((a: any, idx: number) => (
                        <div
                          key={a.area_id}
                          className={`flex items-center justify-between px-1.5 py-0.5 fit:py-0.2 2xl:fit:py-0.5 rounded-lg border min-w-0 transition-all shrink-0 ${
                            isLightTv
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-emerald-500/10 border-emerald-500/25'
                          }`}
                        >
                          <span
                            className={`font-bold truncate text-[10px] sm:text-[11px] min-w-0 ${
                              isLightTv ? 'text-emerald-800' : 'text-emerald-300'
                            }`}
                            title={`${a.area_name || a.area_code} (${a.area_code})`}
                          >
                            {idx === 0 ? '🏆 1.' : idx === 1 ? '🥈 2.' : '🥉 3.'} {a.area_name || a.area_code}
                          </span>
                          <span className={`font-mono font-black text-[10px] sm:text-[11px] shrink-0 ml-1 ${passTextCls}`}>
                            {formatScore(a.month_avg, lang)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className={`text-xs italic py-1 ${mutedTextCls}`}>{t('noData')}</div>
                    )}
                  </div>
                </div>

                {/* Col 2: Bottom 3 Needs Improvement */}
                <div className="flex flex-col min-h-0 overflow-hidden justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 mb-0.5 px-0.5 truncate ${failTextCls}`}>
                    {t('bottom_lagging_title')}
                  </span>
                  <div className="flex-1 min-h-0 flex flex-col justify-around gap-0.5 fit:gap-0.5 overflow-hidden">
                    {bottom_areas && bottom_areas.length > 0 ? (
                      bottom_areas.slice(0, 3).map((a: any) => (
                        <div
                          key={a.area_id}
                          className={`flex items-center justify-between px-1.5 py-0.5 fit:py-0.2 2xl:fit:py-0.5 rounded-lg border min-w-0 transition-all shrink-0 ${
                            isLightTv
                              ? 'bg-rose-50 border-rose-200'
                              : 'bg-rose-500/15 border-rose-500/35'
                          }`}
                        >
                          <span
                            className={`font-bold truncate text-[10px] sm:text-[11px] min-w-0 ${
                              isLightTv ? 'text-rose-800' : 'text-rose-300'
                            }`}
                            title={`${a.area_name || a.area_code} (${a.area_code})`}
                          >
                            ⚠️ {a.area_name || a.area_code}
                          </span>
                          <span className={`font-mono font-black text-[10px] sm:text-[11px] shrink-0 ml-1 ${failTextCls}`}>
                            {formatScore(a.month_avg, lang)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className={`text-xs italic py-1 ${mutedTextCls}`}>{t('noData')}</div>
                    )}
                  </div>
                </div>
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
