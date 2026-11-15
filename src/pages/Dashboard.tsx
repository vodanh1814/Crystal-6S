import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
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
import {
  Search,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  Flame,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { formatScore, formatDelta } from '../lib/format';
import { formatMonthYear } from '../lib/date';
import { resolveAppColorMode } from '../lib/theme';
import { AreaTrendModal } from '../components/dashboard/AreaTrendModal';

type TierStatus = 'pass' | 'warning' | 'fail' | 'none';

function getStatus(
  score: number | null | undefined,
  target: number,
  warningTarget: number
): TierStatus {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return 'none';
  const val = Number(score);
  if (val >= target) return 'pass';
  if (val >= warningTarget) return 'warning';
  return 'fail';
}

function getStatusColorVar(status: TierStatus): string {
  switch (status) {
    case 'pass':
      return 'var(--app-pass)';
    case 'warning':
      return 'var(--app-warn)';
    case 'fail':
      return 'var(--app-fail)';
    default:
      return 'var(--app-text-muted)';
  }
}

function getStatusHex(status: TierStatus, isLight: boolean): string {
  switch (status) {
    case 'pass':
      return isLight ? '#059669' : '#10b981';
    case 'warning':
      return isLight ? '#d97706' : '#f59e0b';
    case 'fail':
      return isLight ? '#e11d48' : '#f43f5e';
    default:
      return isLight ? '#64748b' : '#94a3b8';
  }
}

function renderBulletBar(
  score: number | null | undefined,
  target: number,
  warningTarget: number,
  compact = false,
  minScale = 75
) {
  const numeric = score !== null && score !== undefined && !Number.isNaN(Number(score)) ? Number(score) : null;
  const clamped = numeric !== null ? Math.max(minScale, Math.min(100, numeric)) : minScale;
  const range = Math.max(1, 100 - minScale);
  const fillPct = numeric !== null ? ((clamped - minScale) / range) * 100 : 0;
  const warnPos = Math.max(0, Math.min(100, ((warningTarget - minScale) / range) * 100));
  const targetPos = Math.max(0, Math.min(100, ((target - minScale) / range) * 100));
  const tier = getStatus(numeric, target, warningTarget);
  const fillColor = getStatusColorVar(tier);

  return (
    <div
      className={`relative w-full rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}
      style={{ backgroundColor: 'var(--app-surface-muted)' }}
      aria-label={numeric !== null ? `${numeric.toFixed(1)}%` : 'No data'}
    >
      {/* Qualitative background zones: Fail (<warn), Warning (warn..target), Pass (>=target) */}
      <div
        className="absolute inset-y-0 left-0 opacity-20"
        style={{ width: `${warnPos}%`, backgroundColor: 'var(--app-fail)' }}
      />
      <div
        className="absolute inset-y-0 opacity-20"
        style={{
          left: `${warnPos}%`,
          width: `${Math.max(0, targetPos - warnPos)}%`,
          backgroundColor: 'var(--app-warn)',
        }}
      />
      <div
        className="absolute inset-y-0 right-0 opacity-20"
        style={{ left: `${targetPos}%`, backgroundColor: 'var(--app-pass)' }}
      />

      {/* Active telemetry value fill */}
      {numeric !== null && (
        <div
          className="relative h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(4, Math.min(100, fillPct))}%`,
            backgroundColor: fillColor,
          }}
        />
      )}

      {/* Target threshold marker line */}
      <div
        className="absolute inset-y-0 w-0.5 z-10"
        style={{
          left: `${targetPos}%`,
          backgroundColor: 'var(--app-text)',
          opacity: 0.85,
        }}
        title={`Target: ${target}%`}
      />
    </div>
  );
}

function renderHeroGauge(
  score: number | null | undefined,
  target: number,
  warningTarget: number,
  isLight: boolean,
  lang: 'vi' | 'en'
) {
  const numeric = score !== null && score !== undefined && !Number.isNaN(Number(score)) ? Number(score) : null;
  const tier = getStatus(numeric, target, warningTarget);
  const strokeColor = getStatusHex(tier, isLight);
  const trackStroke = isLight ? 'rgba(15, 23, 42, 0.09)' : 'rgba(148, 163, 184, 0.16)';

  // Scale semi-circle from 70% to 100% so precision changes around 90-98% are visually distinct
  const minVal = 70;
  const normalized = numeric !== null ? Math.max(0, Math.min(1, (numeric - minVal) / (100 - minVal))) : 0;
  const targetRatio = Math.max(0, Math.min(1, (target - minVal) / (100 - minVal)));

  // Semicircle path radius = 64 centered at (90, 82), circumference = pi * 64 = 201.06
  const radius = 64;
  const cx = 90;
  const cy = 82;
  const halfCirc = Math.PI * radius;
  const dashOffset = halfCirc * (1 - normalized);

  const targetAngle = Math.PI * (1 - targetRatio);
  const tx1 = cx + (radius - 6) * Math.cos(targetAngle);
  const ty1 = cy - (radius - 6) * Math.sin(targetAngle);
  const tx2 = cx + (radius + 6) * Math.cos(targetAngle);
  const ty2 = cy - (radius + 6) * Math.sin(targetAngle);

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <svg viewBox="0 0 180 102" className="w-full max-w-[205px] overflow-visible">
        <defs>
          <linearGradient id="heroGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.72" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Background semi-arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={trackStroke}
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Active fill arc */}
        {numeric !== null && (
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#heroGaugeGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={halfCirc}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        )}
        {/* Target tick mark */}
        <line
          x1={tx1}
          y1={ty1}
          x2={tx2}
          y2={ty2}
          stroke={isLight ? '#0f172a' : '#f8fafc'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          className="font-mono-kpi font-black"
          fill={isLight ? '#0f172a' : '#f8fafc'}
          fontSize="24"
        >
          {numeric !== null ? formatScore(numeric, lang) : '—'}
        </text>
        <text
          x={cx}
          y={cy - 3}
          textAnchor="middle"
          fill={isLight ? '#475569' : '#94a3b8'}
          fontSize="9.5"
          fontWeight="600"
        >
          {`TARGET ≥ ${target}%`}
        </text>
        <text
          x={cx - radius}
          y={cy + 14}
          textAnchor="middle"
          fill={isLight ? '#64748b' : '#64748b'}
          fontSize="8.5"
        >
          70%
        </text>
        <text
          x={cx + radius}
          y={cy + 14}
          textAnchor="middle"
          fill={isLight ? '#64748b' : '#64748b'}
          fontSize="8.5"
        >
          100%
        </text>
      </svg>
    </div>
  );
}

function render5SRadar(
  sGroups: Array<{ s_group: number; count: number; penalty: number }>,
  isLight: boolean
) {
  const labels = [
    { group: 1, code: 'S1' },
    { group: 2, code: 'S2' },
    { group: 3, code: 'S3' },
    { group: 4, code: 'S4' },
    { group: 5, code: 'S5' },
  ];
  const byGroup = new Map<number, { count: number; penalty: number }>();
  for (const s of sGroups || []) {
    byGroup.set(Number(s.s_group), { count: Number(s.count || 0), penalty: Number(s.penalty || 0) });
  }

  // Convert pillar penalty points into health index [45..100] so zero deductions = 100% outer ring
  const maxPenalty = Math.max(8, ...labels.map((l) => byGroup.get(l.group)?.penalty || 0));
  const scores = labels.map((l) => {
    const p = byGroup.get(l.group)?.penalty || 0;
    return Math.max(45, Math.min(100, Math.round(100 - (p / maxPenalty) * 45)));
  });

  const cx = 110;
  const cy = 94;
  const maxR = 64;
  const rings = [1, 0.78, 0.56];

  const getPoint = (idx: number, ratio: number) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 5;
    return {
      x: cx + maxR * ratio * Math.cos(angle),
      y: cy + maxR * ratio * Math.sin(angle),
    };
  };

  const dataPoints = scores
    .map((sc, i) => {
      const ratio = 0.28 + ((sc - 40) / 60) * 0.72;
      const pt = getPoint(i, ratio);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const gridStroke = isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(148, 163, 184, 0.18)';
  const accent = isLight ? '#0284c7' : '#38bdf8';

  return (
    <svg viewBox="0 0 220 186" className="w-full max-w-[215px] mx-auto select-none">
      {rings.map((r, idx) => {
        const pts = labels
          .map((_, i) => {
            const pt = getPoint(i, r);
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <polygon
            key={idx}
            points={pts}
            fill="none"
            stroke={gridStroke}
            strokeWidth={idx === 0 ? 1.2 : 0.8}
            strokeDasharray={idx > 0 ? '2 2' : undefined}
          />
        );
      })}
      {labels.map((_, i) => {
        const outer = getPoint(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke={gridStroke}
            strokeWidth="0.9"
          />
        );
      })}
      <polygon
        points={dataPoints}
        fill={isLight ? 'rgba(2, 132, 199, 0.18)' : 'rgba(56, 189, 248, 0.22)'}
        stroke={accent}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {labels.map((l, i) => {
        const ratio = 0.28 + ((scores[i] - 40) / 60) * 0.72;
        const pt = getPoint(i, ratio);
        const lbl = getPoint(i, 1.23);
        const pen = byGroup.get(l.group)?.penalty || 0;
        return (
          <g key={l.code}>
            <circle cx={pt.x} cy={pt.y} r="3" fill={accent} />
            <text
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isLight ? '#0f172a' : '#e2e8f0'}
              fontSize="10"
              fontWeight="800"
            >
              {l.code}
            </text>
            {pen > 0 && (
              <text
                x={lbl.x}
                y={lbl.y + 10}
                textAnchor="middle"
                fill={isLight ? '#e11d48' : '#fb7185'}
                fontSize="8.5"
                fontWeight="700"
              >
                -{pen}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function renderMiniSparkline(
  points: Array<{ score: number | null }> | undefined,
  colorHex: string
) {
  const valid = (points || [])
    .map((p) => (p.score !== null && p.score !== undefined ? Number(p.score) : null))
    .filter((v): v is number => v !== null && !Number.isNaN(v));

  if (valid.length < 2) {
    return (
      <svg viewBox="0 0 72 24" className="w-[62px] h-[20px] opacity-40 shrink-0">
        <line
          x1="4"
          y1="12"
          x2="68"
          y2="12"
          stroke={colorHex}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const minVal = Math.min(...valid, 80);
  const maxVal = Math.max(...valid, 100);
  const span = Math.max(4, maxVal - minVal);
  const w = 68;
  const h = 18;
  const stepX = w / (valid.length - 1);

  const coords = valid.map((val, idx) => {
    const x = 2 + idx * stepX;
    const y = 3 + h - ((val - minVal) / span) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = coords[coords.length - 1].split(',');
  return (
    <svg viewBox="0 0 72 24" className="w-[62px] h-[20px] shrink-0 overflow-visible">
      <polyline
        fill="none"
        stroke={colorHex}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={colorHex} />
    </svg>
  );
}

export const Dashboard: React.FC = () => {
  const { colorModeOverride } = useAuth();
  const { lang, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedMonthParam = searchParams.get('month') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaSearch, setAreaSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'pass' | 'warning' | 'fail'>('all');
  const [selectedTrendArea, setSelectedTrendArea] = useState<any | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const isLight = resolveAppColorMode(colorModeOverride, true) === 'light';

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = selectedMonthParam ? `?month=${encodeURIComponent(selectedMonthParam)}` : '';
      const res = await api.get<any>(`/reports/dashboard${qs}`);
      setData(res);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load telemetry data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedMonthParam]);

  useEffect(() => {
    fetchDashboard(false);
    const interval = setInterval(() => fetchDashboard(true), 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleMonthChange = (month: string) => {
    const next = new URLSearchParams(searchParams);
    if (month) next.set('month', month);
    else next.delete('month');
    setSearchParams(next);
  };

  const target = Number(data?.target ?? 95);
  const warningTarget = Number(data?.warning_target ?? 90);
  const current_week = data?.current_week || {};
  const month_info = data?.month_info || {};
  const kpi = data?.kpi || {};
  const remediation = data?.remediation || {};
  const counts = data?.counts || { open: 0, waiting_verify: 0, overdue: 0, not_improved: 0 };
  const s_group_breakdown = data?.s_group_breakdown || [];
  const urgent_alarms = data?.urgent_alarms || [];
  const current_week_status = data?.current_week_status || [];
  const trend_12_weeks = data?.trend_12_weeks || [];
  const improvement_analysis = data?.improvement_analysis || { top_improvers: [], stagnant_areas: [] };
  const area_s_matrix = data?.area_s_matrix || {};

  const filteredAreas = useMemo(() => {
    const q = areaSearch.trim().toLowerCase();
    return current_week_status.filter((area: any) => {
      if (q) {
        const match =
          String(area.area_code || '').toLowerCase().includes(q) ||
          String(area.area_name || '').toLowerCase().includes(q) ||
          String(area.manager_name || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (tierFilter !== 'all') {
        const displayScore = area.score ?? area.latest_completed_week?.score ?? area.month_avg;
        const tier = getStatus(displayScore, target, warningTarget);
        if (tier !== tierFilter) return false;
      }
      return true;
    });
  }, [current_week_status, areaSearch, tierFilter, target, warningTarget]);

  const trendChartData = useMemo(() => {
    return (trend_12_weeks || []).map((pt: any) => ({
      week: pt.week,
      avg_score: pt.avg_score !== null && pt.avg_score !== undefined ? Number(pt.avg_score) : null,
      target,
    }));
  }, [trend_12_weeks, target]);

  if (loading && !data) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="surface-card px-6 py-5 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
          <span className="text-sm font-semibold">
            {lang === 'en' ? 'Synchronizing Factory 5S Telemetry...' : 'Đang đồng bộ dữ liệu Telemetry 5S toàn nhà máy...'}
          </span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="surface-card p-6 max-w-md text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
          <button
            onClick={() => fetchDashboard(false)}
            className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold cursor-pointer"
          >
            {lang === 'en' ? 'Retry' : 'Thử lại'}
          </button>
        </div>
      </div>
    );
  }

  const plantWeekScore = kpi.latest_completed_avg ?? kpi.weekly_avg ?? kpi.monthly_avg_overall;
  const plantWeekTier = getStatus(plantWeekScore, target, warningTarget);
  const plantMonthTier = getStatus(kpi.monthly_avg_overall, target, warningTarget);
  const totalAreasCount = Number(kpi.total_areas_count || current_week_status.length || 15);
  const passRateAreas =
    totalAreasCount > 0 ? Math.round((Number(kpi.passed_areas_count || 0) / totalAreasCount) * 1000) / 10 : 0;
  const onTimePct = remediation.on_time_rate_pct !== null && remediation.on_time_rate_pct !== undefined
    ? Number(remediation.on_time_rate_pct)
    : null;
  const availableMonths: string[] = month_info.available_months || [];

  return (
    <div className="dash-compact-shell w-full h-full min-h-0 flex flex-col gap-2.5 lg:gap-3 p-2.5 sm:p-3 lg:p-3.5 overflow-x-hidden">
      {/* ── ROW 1: 5-CARD KPI TELEMETRY BENTO STRIP ───────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-2.5 shrink-0">
        {/* KPI 1: Plant Weekly Score */}
        <div className="surface-card dash-compact-kpi p-3 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] truncate">
              {lang === 'en' ? 'PLANT WEEK SCORE' : 'ĐIỂM NHÀ MÁY (TUẦN)'}
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono-kpi font-bold border"
              style={{
                backgroundColor: 'var(--app-accent-soft)',
                color: 'var(--app-accent)',
                borderColor: 'var(--app-border-strong)',
              }}
            >
              {kpi.latest_completed_week || `W${String(current_week.iso_week || '').padStart(2, '0')}`}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="text-xl sm:text-2xl font-black font-mono-kpi leading-none"
              style={{ color: getStatusColorVar(plantWeekTier) }}
            >
              {formatScore(plantWeekScore, lang)}
            </span>
            <span
              className={`text-[11px] font-mono-kpi font-bold ${
                kpi.weekly_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {kpi.weekly_delta !== null && kpi.weekly_delta !== undefined
                ? formatDelta(kpi.weekly_delta, lang)
                : `Target ${target}%`}
            </span>
          </div>
          {renderBulletBar(plantWeekScore, target, warningTarget)}
        </div>

        {/* KPI 2: Plant Monthly Average + Month Switcher */}
        <div className="surface-card dash-compact-kpi p-3 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] truncate">
              {lang === 'en' ? 'MONTHLY AVG' : 'TRUNG BÌNH THÁNG'}
            </span>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[var(--app-accent)] shrink-0" />
              <select
                value={selectedMonthParam || month_info.display_month || ''}
                onChange={(e) => handleMonthChange(e.target.value)}
                aria-label={lang === 'en' ? 'Select month' : 'Chọn tháng'}
                className="bg-transparent text-[10px] font-mono-kpi font-bold text-[var(--app-accent)] focus:outline-none cursor-pointer"
              >
                {availableMonths.length > 0 ? (
                  availableMonths.map((m) => (
                    <option key={m} value={m} className="bg-slate-900 text-slate-100">
                      {formatMonthYear(m)}
                    </option>
                  ))
                ) : (
                  <option value={month_info.display_month || ''} className="bg-slate-900 text-slate-100">
                    {formatMonthYear(month_info.display_month)}
                  </option>
                )}
              </select>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="text-xl sm:text-2xl font-black font-mono-kpi leading-none"
              style={{ color: getStatusColorVar(plantMonthTier) }}
            >
              {formatScore(kpi.monthly_avg_overall, lang)}
            </span>
            <span className="text-[10px] font-semibold text-[var(--app-text-muted)] truncate">
              {month_info.is_fallback
                ? lang === 'en'
                  ? 'Latest Completed'
                  : 'Tháng gần nhất'
                : `${kpi.audited_areas_count || 0}/${totalAreasCount} ${lang === 'en' ? 'areas' : 'KV'}`}
            </span>
          </div>
          {renderBulletBar(kpi.monthly_avg_overall, target, warningTarget)}
        </div>

        {/* KPI 3: Areas Passing Compliance */}
        <div className="surface-card dash-compact-kpi p-3 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] truncate">
              {lang === 'en' ? 'PASSING AREAS' : 'KHU VỰC ĐẠT CHUẨN'}
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono-kpi leading-none text-emerald-400">
              {kpi.passed_areas_count || 0}
              <span className="text-xs font-bold text-[var(--app-text-muted)]">/{totalAreasCount}</span>
            </span>
            <div className="flex items-center gap-1 text-[10px] font-mono-kpi font-bold">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                {kpi.warning_areas_count || 0}W
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400">
                {kpi.failing_areas_count || 0}F
              </span>
            </div>
          </div>
          {renderBulletBar(passRateAreas, 85, 70, false, 0)}
        </div>

        {/* KPI 4: Open & Escalated Findings */}
        <Link
          to="/findings?status=open"
          className="surface-card surface-card-interactive dash-compact-kpi p-3 flex flex-col justify-between gap-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] truncate">
              {lang === 'en' ? 'OPEN CAPA BACKLOG' : 'LỖI CHỜ KHẮC PHỤC'}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--app-accent)] shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono-kpi leading-none">
              {counts.open || 0}
              <span className="text-[11px] font-semibold text-[var(--app-text-muted)] ml-1">
                {lang === 'en' ? 'open' : 'mở'}
              </span>
            </span>
            <span className="text-[10px] font-mono-kpi font-bold text-amber-400">
              {counts.waiting_verify || 0} {lang === 'en' ? 'verify' : 'chờ duyệt'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono-kpi pt-0.5 border-t border-[var(--app-border)]">
            <span className="text-rose-400 font-bold">
              {counts.overdue || 0} {lang === 'en' ? 'overdue' : 'quá hạn'}
            </span>
            <span className="text-purple-400 font-bold">
              {counts.not_improved || 0} {lang === 'en' ? 'repeat' : 'lặp lại'}
            </span>
          </div>
        </Link>

        {/* KPI 5: SLA On-Time Rate */}
        <div className="surface-card dash-compact-kpi p-3 flex flex-col justify-between gap-1.5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] truncate">
              {lang === 'en' ? 'SLA 7-DAY ON-TIME' : 'TỶ LỆ ĐÚNG HẠN SLA'}
            </span>
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="text-xl sm:text-2xl font-black font-mono-kpi leading-none"
              style={{ color: getStatusColorVar(getStatus(onTimePct, 90, 75)) }}
            >
              {onTimePct !== null ? formatScore(onTimePct, lang) : '—'}
            </span>
            <span className="text-[10px] font-mono-kpi text-[var(--app-text-muted)]">
              MTTR:{' '}
              <strong className="text-[var(--app-text)]">
                {remediation.avg_remediation_days !== null && remediation.avg_remediation_days !== undefined
                  ? `${remediation.avg_remediation_days}d`
                  : '—'}
              </strong>
            </span>
          </div>
          {renderBulletBar(onTimePct, 90, 75, false, 50)}
        </div>
      </section>

      {/* ── ROW 2: ASYMMETRIC 12-COLUMN BENTO TELEMETRY WORKSPACE ───────────────────────────── */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-2.5 lg:gap-3 flex-1 min-h-0">
        {/* LEFT RAIL (4 Cols): Hero Plant Gauge + 5S Radar + 7-Day SLA Countdown Alarms */}
        <div className="xl:col-span-4 flex flex-col gap-2.5 lg:gap-3 min-h-0">
          {/* Panel A: Hero Semi-Circular Gauge + 5S Pillar Radar */}
          <div className="surface-card dash-compact-panel p-3 lg:p-3.5 flex flex-col justify-between gap-2 xl:flex-[44] min-h-0">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--app-border)] pb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldAlert className="w-4 h-4 text-[var(--app-accent)] shrink-0" />
                <h2 className="text-xs font-black uppercase tracking-wider truncate">
                  {lang === 'en' ? '5S PLANT HEALTH & RADAR' : 'CHỈ SỐ SỨC KHỎE 5S & RADAR'}
                </h2>
              </div>
              {lastUpdatedAt && (
                <button
                  onClick={() => fetchDashboard(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-mono-kpi text-[var(--app-text-muted)] hover:text-[var(--app-accent)] cursor-pointer shrink-0"
                  title={lang === 'en' ? 'Refresh Telemetry' : 'Làm mới dữ liệu'}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{lastUpdatedAt.toTimeString().slice(0, 5)}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 flex-1 min-h-0">
              <div className="flex flex-col items-center justify-center">
                {renderHeroGauge(plantWeekScore, target, warningTarget, isLight, lang)}
                <div className="flex items-center gap-1.5 text-[10px] font-mono-kpi mt-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                    ≥{target}% {lang === 'en' ? 'Pass' : 'Đạt'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">
                    {warningTarget}–{target}%
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold">
                    &lt;{warningTarget}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center">
                {render5SRadar(s_group_breakdown, isLight)}
              </div>
            </div>
          </div>

          {/* Panel B: 7-Day SLA Countdown Alarms */}
          <div className="surface-card dash-compact-panel p-3 lg:p-3.5 flex flex-col xl:flex-[56] flex-1 min-h-0">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--app-border)] pb-1.5 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                <h2 className="text-xs font-black uppercase tracking-wider truncate">
                  {lang === 'en' ? '7-DAY SLA COUNTDOWN ALARMS' : 'CẢNH BÁO SLA 7 NGÀY'}
                </h2>
              </div>
              <Link
                to="/findings?overdue=1"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-kpi font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 shrink-0"
              >
                <span>{urgent_alarms.length}</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="scroll-pane flex-1 min-h-0 overflow-y-auto mt-2 space-y-1.5 pr-1">
              {urgent_alarms.length === 0 ? (
                <div className="h-full min-h-[90px] flex flex-col items-center justify-center text-center p-4 surface-muted">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                  <p className="text-xs font-bold">
                    {lang === 'en' ? 'All SLA Timelines On Track' : 'Không có lỗi vi phạm SLA 7 ngày'}
                  </p>
                  <p className="text-[10px] text-[var(--app-text-muted)]">
                    {lang === 'en' ? 'Factory CAPA compliance green' : 'Nhà máy đang kiểm soát tốt tiến độ khắc phục'}
                  </p>
                </div>
              ) : (
                urgent_alarms.slice(0, 12).map((alarm: any) => {
                  const isOverdue = Boolean(alarm.is_overdue) || Number(alarm.days_remaining) < 0;
                  const daysLeft = Number(alarm.days_remaining ?? 0);
                  const pillText = isOverdue
                    ? lang === 'en'
                      ? `OVERDUE ${Math.abs(daysLeft)}d`
                      : `QUÁ HẠN ${Math.abs(daysLeft)}d`
                    : `T-${daysLeft}d`;

                  return (
                    <Link
                      key={alarm.id}
                      to={`/findings/${alarm.id}`}
                      className="surface-muted flex items-start justify-between gap-2.5 p-2 hover:border-[var(--app-border-strong)] transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-400">
                            {alarm.area_name || alarm.area_code}
                          </span>
                          <span className="text-[10px] font-mono-kpi font-bold text-[var(--app-text-muted)]">
                            {alarm.item_code}
                          </span>
                          <span className="text-[10px] font-mono-kpi font-bold text-rose-400">
                            -{alarm.applied_penalty}{lang === 'en' ? 'pt' : 'đ'}
                          </span>
                          {alarm.repeat_level > 1 && (
                            <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300">
                              x{alarm.repeat_level}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold leading-snug line-clamp-1">
                          {lang === 'en' ? alarm.content_en || alarm.content_vi : alarm.content_vi}
                        </p>
                        <div className="text-[10px] text-[var(--app-text-muted)] truncate">
                          {alarm.manager_name || alarm.auditor_name || (lang === 'en' ? '5S Area' : 'Khu vực 5S')} · Due {alarm.due_date}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-mono-kpi font-black border ${
                          isOverdue
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                        }`}
                      >
                        {pillText}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-[var(--app-border)] shrink-0 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                <span>{lang === 'en' ? '5S PILLAR DEDUCTION BREAKDOWN' : 'PHÂN BỔ ĐIỂM TRỪ THEO TRỤ CỘT 5S'}</span>
                <span className="font-mono-kpi text-[var(--app-accent)]">S1–S5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((g) => {
                  const item = (s_group_breakdown || []).find((s: any) => Number(s.s_group) === g);
                  const pen = Number(item?.penalty || 0);
                  const cnt = Number(item?.count || 0);
                  return (
                    <div key={g} className="surface-muted px-1.5 py-1 text-center flex flex-col items-center justify-center">
                      <span className="text-[10px] font-black font-mono-kpi">S{g}</span>
                      <span className={`text-[10px] font-mono-kpi font-bold ${pen > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {pen > 0 ? `-${pen}${lang === 'en' ? 'pt' : 'đ'}` : '0'}
                      </span>
                      <span className="text-[9px] text-[var(--app-text-muted)] font-mono-kpi">
                        {cnt} {lang === 'en' ? 'err' : 'lỗi'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT WORKSPACE (8 Cols): 15-Area Bento Telemetry Matrix + 12-Week Trend & Improvement */}
        <div className="xl:col-span-8 flex flex-col gap-2.5 lg:gap-3 min-h-0">
          {/* Panel C: 15-Area Bento Telemetry Matrix */}
          <div className="surface-card dash-compact-panel p-3 lg:p-3.5 flex flex-col xl:flex-[60] flex-1 min-h-0 cq-area-grid">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--app-border)] pb-2 mb-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-xs font-black uppercase tracking-wider truncate">
                  {lang === 'en' ? '15-AREA BENTO TELEMETRY MATRIX' : 'MA TRẬN TELEMETRY 15 KHU VỰC'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-kpi font-bold bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                  {filteredAreas.length}/{current_week_status.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Tier quick filters */}
                <div className="flex items-center rounded-lg p-0.5 surface-muted">
                  {(['all', 'pass', 'warning', 'fail'] as const).map((tierKey) => {
                    const active = tierFilter === tierKey;
                    const labelMap = {
                      all: lang === 'en' ? 'All' : 'Tất cả',
                      pass: `≥${target}`,
                      warning: `${warningTarget}–${target}`,
                      fail: `<${warningTarget}`,
                    };
                    return (
                      <button
                        key={tierKey}
                        onClick={() => setTierFilter(tierKey)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono-kpi font-bold cursor-pointer transition-colors ${
                          active
                            ? 'bg-sky-500 text-slate-950'
                            : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                        }`}
                      >
                        {labelMap[tierKey]}
                      </button>
                    );
                  })}
                </div>

                {/* Live quick search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[var(--app-text-muted)] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={areaSearch}
                    onChange={(e) => setAreaSearch(e.target.value)}
                    placeholder={lang === 'en' ? 'Filter area...' : 'Tìm khu vực...'}
                    className="surface-muted pl-7 pr-2.5 py-1 text-[11px] font-medium focus:outline-none focus:border-[var(--app-accent)] w-28 sm:w-36"
                  />
                </div>
              </div>
            </div>

            <div className="scroll-pane flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col">
              {filteredAreas.length === 0 ? (
                <div className="h-full min-h-[140px] flex items-center justify-center text-xs text-[var(--app-text-muted)]">
                  {lang === 'en' ? 'No areas match current filter.' : 'Không có khu vực nào phù hợp bộ lọc.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:grid-rows-3 gap-2 lg:gap-2.5 flex-1 h-full auto-rows-fr">
                  {filteredAreas.map((area: any) => {
                    const displayScore =
                      area.score !== null && area.score !== undefined
                        ? area.score
                        : area.latest_completed_week?.score !== null && area.latest_completed_week?.score !== undefined
                        ? area.latest_completed_week.score
                        : area.month_avg;
                    const tier = getStatus(displayScore, target, warningTarget);
                    const hex = getStatusHex(tier, isLight);
                    const colorVar = getStatusColorVar(tier);
                    const momDelta = area.delta_prev_month;

                    return (
                      <button
                        type="button"
                        key={area.area_id}
                        onClick={() => setSelectedTrendArea(area)}
                        className="surface-elevated surface-card-interactive dash-compact-area cq-card p-2.5 flex flex-col justify-between gap-1.5 text-left cursor-pointer group"
                      >
                        {/* Tier 1: Area Label Name + MoM Delta */}
                        <div className="flex items-start justify-between gap-1.5 w-full">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: colorVar }}
                              />
                              <span
                                className="text-xs sm:text-[13px] font-extrabold tracking-tight truncate"
                                title={area.area_name || area.area_code}
                              >
                                {area.area_name || area.area_code}
                              </span>
                            </div>
                            {area.manager_name && (
                              <div className="text-[10px] text-[var(--app-text-muted)] truncate mt-0.5 pl-3.5">
                                {area.manager_name}
                              </div>
                            )}
                          </div>
                          {momDelta !== null && momDelta !== undefined && (
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono-kpi font-bold ${
                                momDelta > 0
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : momDelta < 0
                                  ? 'bg-rose-500/15 text-rose-400'
                                  : 'bg-slate-500/15 text-[var(--app-text-muted)]'
                              }`}
                            >
                              {momDelta > 0 ? `+${momDelta}` : momDelta}
                            </span>
                          )}
                        </div>

                        {/* Tier 2: Score + Mini Sparkline */}
                        <div className="flex items-center justify-between gap-1 w-full">
                          <div>
                            <div
                              className="text-lg sm:text-xl font-black font-mono-kpi leading-none"
                              style={{ color: colorVar }}
                            >
                              {displayScore !== null && displayScore !== undefined
                                ? formatScore(displayScore, lang)
                                : '—'}
                            </div>
                            <div className="text-[9px] font-mono-kpi text-[var(--app-text-muted)] mt-0.5">
                              {lang === 'en' ? 'Mo' : 'T'}:{' '}
                              <strong className="text-[var(--app-text)]">
                                {formatScore(area.month_avg, lang)}
                              </strong>
                            </div>
                          </div>
                          {renderMiniSparkline(area.sparkline_6 || area.trend_12_weeks, hex)}
                        </div>

                        {/* Tier 3: Bullet Bar + CAPA Open/Verify/Repeat */}
                        <div className="space-y-1 w-full">
                          {renderBulletBar(displayScore, target, warningTarget, true)}
                          <div className="flex items-center justify-between text-[9px] font-mono-kpi text-[var(--app-text-muted)]">
                            <span>
                              O:<strong className={area.open_count > 0 ? 'text-rose-400' : ''}>{area.open_count || 0}</strong>
                            </span>
                            <span>
                              V:<strong className={area.fixed_count > 0 ? 'text-amber-400' : ''}>{area.fixed_count || 0}</strong>
                            </span>
                            <span>
                              R:<strong className={area.repeat_count > 0 ? 'text-purple-400' : ''}>{area.repeat_count || 0}</strong>
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Panel D: 12-Week Plant Trend AreaChart + Top Improvement Leaderboard */}
          <div className="surface-card dash-compact-panel p-3 lg:p-4 xl:flex-[40] min-h-[205px] xl:min-h-[225px] grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-stretch">
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-w-0 h-full">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[var(--app-accent)]" />
                  <h3 className="text-[11px] font-black uppercase tracking-wider">
                    {lang === 'en' ? '12-WEEK FACTORY TREND' : 'XU HƯỚNG 12 TUẦN TOÀN NHÀ MÁY'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono-kpi text-[var(--app-text-muted)]">
                  Target {target}% · Warn {warningTarget}%
                </span>
              </div>
              <div className="flex-1 min-h-[145px] xl:min-h-[165px] h-full w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isLight ? '#0284c7' : '#38bdf8'} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={isLight ? '#0284c7' : '#38bdf8'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={isLight ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.12)'}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10, fill: isLight ? '#64748b' : '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[80, 100]}
                      tick={{ fontSize: 10, fill: isLight ? '#64748b' : '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderColor: isLight ? '#e2e8f0' : 'rgba(148,163,184,0.25)',
                        borderRadius: '10px',
                        fontSize: '11px',
                      }}
                      formatter={(val: any) => [formatScore(Number(val), lang), 'Score']}
                    />
                    <ReferenceLine
                      y={target}
                      stroke={isLight ? '#059669' : '#10b981'}
                      strokeDasharray="4 3"
                      strokeWidth={1.3}
                    />
                    <ReferenceLine
                      y={warningTarget}
                      stroke={isLight ? '#d97706' : '#f59e0b'}
                      strokeDasharray="2 3"
                      strokeWidth={1}
                    />
                    <Area
                      type="monotone"
                      dataKey="avg_score"
                      stroke={isLight ? '#0284c7' : '#38bdf8'}
                      strokeWidth={2.2}
                      fillOpacity={1}
                      fill="url(#trendAreaFill)"
                      connectNulls
                      dot={{ r: 2.5, fill: isLight ? '#0284c7' : '#38bdf8' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Top Improvement Leaderboard & Stagnant Watchlist */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[var(--app-border)] pt-2 lg:pt-0 lg:pl-4 gap-2 h-full min-h-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  {lang === 'en' ? 'TOP IMPROVEMENT' : 'TOP CẢI TIẾN (IMPROVEMENT)'}
                </span>
                <span className="text-[10px] font-mono-kpi text-[var(--app-text-muted)]">MoM</span>
              </div>
              <div className="flex-1 flex flex-col justify-between gap-1.5 min-h-0">
                {(improvement_analysis.top_improvers || []).slice(0, 3).map((imp: any) => (
                  <div
                    key={`imp-${imp.area_id}`}
                    className="flex items-center justify-between gap-2 text-xs surface-muted px-2.5 py-1.5 flex-1"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="font-bold truncate" title={imp.area_name || imp.area_code}>
                        {imp.area_name || imp.area_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono-kpi">
                      {imp.current_score !== null && imp.current_score !== undefined && (
                        <span className="text-[10px] text-[var(--app-text-muted)]">
                          {formatScore(imp.current_score, lang)}
                        </span>
                      )}
                      <span className="font-black text-emerald-400">
                        +{imp.delta}
                      </span>
                    </div>
                  </div>
                ))}
                {(improvement_analysis.stagnant_areas || []).slice(0, 2).map((st: any) => (
                  <div
                    key={`st-${st.area_id}`}
                    className="flex items-center justify-between gap-2 text-xs surface-muted px-2.5 py-1.5 flex-1"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-bold truncate text-amber-300" title={st.area_name || st.area_code}>
                        {st.area_name || st.area_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono-kpi">
                      {st.delta !== null && st.delta !== undefined && Number(st.delta) !== 0 && (
                        <span className="text-[10px] text-rose-400">
                          {Number(st.delta) > 0 ? `+${st.delta}` : st.delta}
                        </span>
                      )}
                      <span className="font-black text-rose-400">
                        {formatScore(st.current_score, lang)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

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
