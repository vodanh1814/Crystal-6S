import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Loader2,
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
import { useI18n } from '../i18n/context';
import { getMonthShortName, formatMonthYear } from '../lib/date';

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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get<any>('/reports/dashboard');
      setData(res);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 60 seconds for factory TV
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading || !data) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const {
    target,
    current_week,
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
    .map((a: any) => `${a.area_code} (${a.overdue_count})`)
    .slice(0, 3)
    .join(' · ');

  const repeatAreasList = (current_week_status || [])
    .filter((a: any) => a.repeat_count > 0)
    .map((a: any) => a.area_code)
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

  return (
    <div className="flex-1 min-h-0 p-2 sm:p-2.5 flex flex-col gap-2.5 overflow-y-auto lg:overflow-hidden select-none">
      {/* ROW 1: 6 COMPACT KPI STRIP CARDS (shrink-0, height ~64px-70px) */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {/* KPI 1: Weekly Average Score */}
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold truncate">
              {t('weekly_avg_kpi', { week: `W${current_week.iso_week}` })}
            </span>
            {kpi?.weekly_avg !== null && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  kpi.weekly_avg >= target
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {kpi.weekly_avg >= target ? t('tag_pass') : t('tag_fail')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-xl font-black font-mono ${
                kpi?.weekly_avg === null
                  ? 'text-slate-400 text-sm'
                  : kpi.weekly_avg >= target
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {kpi?.weekly_avg !== null ? `${kpi.weekly_avg}%` : t('noData')}
            </span>
            {kpi?.weekly_delta !== null && (
              <span
                className={`text-xs font-semibold ${
                  kpi.weekly_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {kpi.weekly_delta >= 0 ? `▲ +${kpi.weekly_delta}%` : `▼ ${kpi.weekly_delta}%`}
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Monthly Average Score */}
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold truncate">
              {t('monthly_avg_kpi', { month: formatMonthYear(current_week.month) })}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {t('target_standard', { target })}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black font-mono text-white">
              {kpi?.monthly_avg_overall !== null ? `${kpi.monthly_avg_overall}%` : '-'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              W{current_week.iso_week} ({current_week.iso_year})
            </span>
          </div>
        </div>

        {/* KPI 3: Areas Meeting Target */}
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold truncate">{t('areas_meeting_target')}</span>
            <span className="text-blue-400 text-[10px] font-bold">
              {t('audited_areas_status', {
                audited: kpi?.audited_areas_count || 0,
                total: kpi?.total_areas_count || 0,
              })}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black font-mono text-blue-400">
              {kpi?.passed_areas_count || 0}{' '}
              <span className="text-xs font-normal text-slate-400">
                {t('area_count_slash', { n: kpi?.audited_areas_count || 0 })}
              </span>
            </span>
            <span className="text-xs text-rose-400 font-semibold truncate">
              {t('areas_failing_target', { n: kpi?.failing_areas_count || 0, target })}
            </span>
          </div>
        </div>

        {/* KPI 4: Open Findings */}
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold truncate">{t('open_findings_kpi')}</span>
            <span className="text-amber-400 text-[10px] font-bold">{t('waiting_mng')}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black font-mono text-amber-400">{counts.open}</span>
            <span className="text-xs text-slate-400">
              {t('waiting_verify_count', { n: counts.waiting_verify })}
            </span>
          </div>
        </div>

        {/* KPI 5: 7-Day Overdue Alarm */}
        <div
          className={`rounded-lg bg-rose-950/30 px-3 py-2 flex flex-col justify-between transition-all ${
            totalOverdue > 0
              ? 'border-2 border-rose-500/90 alarm-pulse'
              : 'border border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-400 font-bold">
            <span className="truncate">{t('alarm_7_days')}</span>
            {totalOverdue > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-black">
                {t('alarm_badge')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black font-mono text-rose-400">{totalOverdue}</span>
            <span className="text-[11px] text-rose-300 font-semibold truncate max-w-[120px]">
              {overdueAreasList || t('no_findings_clean')}
            </span>
          </div>
        </div>

        {/* KPI 6: Repeat Findings Escalation */}
        <div className="rounded-lg bg-slate-900 border border-purple-500/40 px-3 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
            <span className="truncate">{t('repeat_findings_kpi')}</span>
            <span className="px-1.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
              {t('repeat_step_badge')}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black font-mono text-purple-400">
              {counts.not_improved}
            </span>
            <span className="text-[11px] text-purple-300 font-semibold truncate max-w-[120px]">
              {repeatAreasList || t('no_findings_clean')}
            </span>
          </div>
        </div>
      </div>

      {/* ROW 2: MIDDLE MAIN WORKSPACE (flex-[58] on lg screens) */}
      <div className="flex-[58] min-h-0 grid grid-cols-12 gap-2.5">
        {/* 16 AREAS 4x4 MATRIX WALL (col-span-12 lg:col-span-8) */}
        <div className="col-span-12 lg:col-span-8 h-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 flex flex-col min-h-0">
          <div className="shrink-0 flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-xs tracking-wide text-white uppercase truncate">
              {t('production_areas_wall', {
                total: current_week_status?.length || 16,
                week: `W${current_week.iso_week}`,
                month: formatMonthYear(current_week.month),
              })}
            </span>
            <div className="flex items-center gap-3 text-xs shrink-0">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-xs bg-emerald-500"></span>
                {t('areas_pass_count', { target, n: kpi?.passed_areas_count || 0 })}
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-xs bg-rose-500"></span>
                {t('areas_fail_count', { n: kpi?.failing_areas_count || 0 })}
              </span>
              <span className="flex items-center gap-1 text-slate-400 hidden sm:inline-flex">
                <span className="w-2 h-2 rounded-xs bg-slate-600"></span>
                {t('areas_pending_count', { n: kpi?.pending_audits_count || 0 })}
              </span>
            </div>
          </div>

          {/* 4 cols x 4 rows auto-rows-fr grid that fills container height */}
          <div className="mt-2 flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-4 auto-rows-fr gap-2 overflow-y-auto lg:overflow-hidden">
            {current_week_status.map((area: any) => {
              const isSubmitted = area.status === 'submitted' && area.score !== null;
              const isPass = isSubmitted && area.score >= target;
              const isFail = isSubmitted && area.score < target;
              const isOverdue = area.overdue_count > 0;

              const boxCls = isOverdue
                ? 'border-rose-500/80 bg-rose-950/30 ring-1 ring-rose-500/40'
                : isPass
                ? 'border-emerald-500/35 bg-emerald-950/20'
                : isFail
                ? 'border-rose-500/70 bg-rose-950/30'
                : 'border-slate-700 bg-slate-800/40 opacity-75';

              const scoreCls = isPass
                ? 'text-emerald-400'
                : isFail
                ? 'text-rose-400'
                : 'text-slate-400 text-xs font-normal';

              const scoreTxt = isSubmitted ? `${area.score}%` : t('not_audited_yet');

              return (
                <Link
                  key={area.area_id}
                  to={is_authenticated ? `/findings?area_id=${area.area_id}` : '/login'}
                  className={`rounded-md border ${boxCls} px-2.5 py-1.5 flex flex-col justify-between min-h-0 hover:border-slate-400 transition cursor-pointer group`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-white tracking-wide group-hover:text-emerald-400 transition-colors">
                      {area.area_code}
                    </span>
                    {isOverdue ? (
                      <span className="px-1.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                        {t('tag_overdue', { n: area.overdue_count })}
                      </span>
                    ) : isFail ? (
                      <span className="px-1.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                        {t('tag_fail')}
                      </span>
                    ) : isPass ? (
                      <span className="text-xs font-bold text-emerald-400">{t('tag_pass')}</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">{t('tag_pending')}</span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between my-0.5">
                    <span className={`text-base font-black font-mono leading-none ${scoreCls}`}>
                      {scoreTxt}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {getMonthShortName(current_week.month)}:{' '}
                      <strong className="text-slate-200">
                        {area.month_avg !== null ? `${area.month_avg}%` : '-'}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-0.5">
                    <span>
                      {t('open_short')}:{' '}
                      <strong
                        className={area.open_count > 0 ? 'text-amber-400' : 'text-slate-300'}
                      >
                        {area.open_count}
                      </strong>
                    </span>
                    {area.repeat_count > 0 ? (
                      <span className="text-purple-400 font-bold">{t('repeat_short')}</span>
                    ) : (
                      <span>
                        {t('verify_short')}: <strong>{area.fixed_count}</strong>
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* RIGHT 4 COLS: 7-DAY ALARM & REMEDIATION EFFECTIVENESS BOARD (col-span-12 lg:col-span-4) */}
        <div className="col-span-12 lg:col-span-4 h-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <div className="shrink-0 flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800 min-w-0">
            <span className="font-bold text-xs text-rose-400 uppercase truncate">
              {t('alarm_board_title')}
            </span>
            <Link
              to="/reports"
              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0 transition"
            >
              {t('remediation_report')} →
            </Link>
          </div>

          {/* Single-line Compact Remediation Effectiveness Strip */}
          <div className="shrink-0 mt-1.5 grid grid-cols-3 gap-1.5 min-w-0">
            <div className="rounded bg-slate-950/90 border border-slate-800 px-2 py-1 flex items-center justify-between gap-1 min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold truncate">
                {lang === 'en' ? 'On-Time' : 'Đúng hạn'}
              </span>
              <span className="text-xs font-black font-mono text-emerald-400 shrink-0">
                {remediation?.on_time_rate_pct !== null && remediation?.on_time_rate_pct !== undefined
                  ? `${remediation.on_time_rate_pct}%`
                  : '-'}
              </span>
            </div>
            <div className="rounded bg-slate-950/90 border border-slate-800 px-2 py-1 flex items-center justify-between gap-1 min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold truncate">
                {lang === 'en' ? 'Avg Time' : 'TG sửa TB'}
              </span>
              <span className="text-xs font-black font-mono text-sky-400 shrink-0">
                {remediation?.avg_remediation_days !== null &&
                remediation?.avg_remediation_days !== undefined
                  ? `${remediation.avg_remediation_days}${lang === 'en' ? 'd' : ' ngày'}`
                  : '-'}
              </span>
            </div>
            <div className="rounded bg-slate-950/90 border border-slate-800 px-2 py-1 flex items-center justify-between gap-1 min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold truncate">
                {lang === 'en' ? 'Repeat' : 'Tái diễn'}
              </span>
              <span className="text-xs font-black font-mono text-purple-400 shrink-0">
                {remediation?.repeat_rate_pct !== undefined ? `${remediation.repeat_rate_pct}%` : '0%'}
              </span>
            </div>
          </div>

          <div className="mt-1.5 flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto min-w-0">
            {urgent_alarms && urgent_alarms.length > 0 ? (
              urgent_alarms.slice(0, 3).map((f: any) => {
                const isOverdue = f.is_overdue;
                const isFixed = f.status === 'fixed';
                const isRepeat = f.repeat_level > 1;

                const cardBorder = isOverdue
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
                    className={`flex-1 min-h-[60px] max-h-[82px] w-full min-w-0 overflow-hidden rounded-md border ${cardBorder} px-2.5 py-1.5 flex flex-col justify-between hover:border-slate-400 transition cursor-pointer group`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[10px] shrink-0">
                          {f.area_code}
                        </span>
                        <span className="font-mono font-bold text-white text-[11px] shrink-0">
                          {f.item_code}
                        </span>
                        {isRepeat ? (
                          <span className="px-1.5 rounded bg-purple-500/25 text-purple-300 font-semibold text-[10px] shrink-0">
                            {t('repeat_level_pts', { w: f.repeat_level, pts: f.applied_penalty })}
                          </span>
                        ) : (
                          <span className="text-amber-300 font-mono text-[10px] shrink-0">
                            -{f.applied_penalty}đ
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold shrink-0 ${
                          isOverdue
                            ? 'text-rose-400'
                            : isFixed
                            ? 'text-blue-400'
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

                    <div className="text-xs font-medium text-slate-100 truncate leading-snug min-w-0">
                      {shortCriterion}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-white/5 pt-0.5 min-w-0">
                      <span className="truncate min-w-0">
                        {isFixed ? 'Auditor:' : 'MNG:'}{' '}
                        <strong className="text-slate-200">
                          {isFixed
                            ? f.auditor_name || 'Auditor'
                            : f.manager_name || f.fixer_name || 'Area Manager'}
                        </strong>
                      </span>
                      <span
                        className={`font-semibold shrink-0 ${
                          isFixed ? 'text-blue-400' : 'text-emerald-400'
                        }`}
                      >
                        {isFixed ? t('verify_close_btn') : t('update_after_btn')}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                {t('no_alarms')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: BOTTOM ANALYTICS STRIP (flex-[42] on lg screens) */}
      <div className="flex-[42] min-h-0 grid grid-cols-12 gap-2.5">
        {/* 12-WEEK TREND LINE (col-span-12 lg:col-span-5) */}
        <div className="col-span-12 lg:col-span-5 h-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 flex flex-col min-h-0">
          <div className="shrink-0 flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold text-xs text-white uppercase truncate">
              {t('trend_title')}
            </span>
            <span className="text-[11px] font-mono text-rose-400 font-semibold shrink-0">
              {t('target_reference_label', { target: `${target}.0` })}
            </span>
          </div>

          <div className="flex-1 min-h-0 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend_12_weeks}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, t('score')]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '11px',
                  }}
                />
                <ReferenceLine y={target} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5} />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#10b981' }}
                  activeDot={{ r: 4.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5S GROUP BREAKDOWN (col-span-12 lg:col-span-4) */}
        <div className="col-span-12 lg:col-span-4 h-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 flex flex-col justify-between min-h-0">
          <div className="shrink-0 flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold text-xs text-white uppercase truncate">
              {t('breakdown_title', { month: formatMonthYear(current_week.month) })}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">
              {t('total_findings_count', { n: totalFindingsInMonth })}
            </span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-around py-1 text-xs">
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
                <div key={group.s_group} className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 font-semibold text-slate-200 truncate text-[11px]">
                    {sNames[group.s_group] || `S${group.s_group}`}
                  </span>
                  <div className="col-span-5 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${barColor}`}
                      style={{ width: `${Math.max(4, widthPct)}%` }}
                    ></div>
                  </div>
                  <span className="col-span-3 text-right font-mono font-bold text-rose-400 text-[10px]">
                    {group.count} lỗi (-{group.penalty}đ)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP & BOTTOM MONTHLY LEADERBOARD (col-span-12 lg:col-span-3) */}
        <div className="col-span-12 lg:col-span-3 h-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 flex flex-col justify-between min-h-0">
          <div className="shrink-0 flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold text-xs text-white uppercase truncate">
              {t('leaderboard_title', { month: formatMonthYear(current_week.month) })}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">{t('top_bottom_label')}</span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-around text-xs py-0.5">
            {top_areas && top_areas.length > 0 ? (
              top_areas.slice(0, 2).map((a: any, idx: number) => (
                <div
                  key={a.area_id}
                  className="flex items-center justify-between px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/25"
                >
                  <span className="font-bold text-emerald-300 truncate text-[11px]">
                    {idx === 0 ? '🏆 1.' : '🥈 2.'} {a.area_code}
                  </span>
                  <span className="font-mono font-black text-emerald-400 text-xs">
                    {a.month_avg}%
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-xs italic">{t('noData')}</div>
            )}

            {bottom_areas && bottom_areas.length > 0 ? (
              bottom_areas.slice(0, 2).map((a: any) => (
                <div
                  key={a.area_id}
                  className="flex items-center justify-between px-2 py-1 rounded bg-rose-500/15 border border-rose-500/35"
                >
                  <span className="font-bold text-rose-300 truncate text-[11px]">
                    ⚠️ {a.area_code}
                  </span>
                  <span className="font-mono font-black text-rose-400 text-xs">
                    {a.month_avg}%
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
