import React from 'react';
import { Link } from 'react-router';
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
}

export const DashboardHeatmapAction: React.FC<Props> = ({
  data,
  lang,
  t,
  is_authenticated,
  target,
  warningTarget,
  formatMonthYear,
}) => {
  const {
    current_week_status = [],
    urgent_alarms = [],
    area_s_matrix = {},
    month_info,
    current_week,
  } = data;

  const sPillars = [
    { num: 1, label: 'S1', title: 'S1 · Sort (Sàng lọc)' },
    { num: 2, label: 'S2', title: 'S2 · Set in order (Sắp xếp)' },
    { num: 3, label: 'S3', title: 'S3 · Shine (Sạch sẽ)' },
    { num: 4, label: 'S4', title: 'S4 · Standardize (Săn sóc)' },
    { num: 5, label: 'S5', title: 'S5 · Sustain (Sẵn sàng)' },
  ];

  // Filter urgent alarms into 3 action feeds
  const overdueFeed = urgent_alarms.filter((a: any) => a.is_overdue);
  const repeatFeed = urgent_alarms.filter((a: any) => a.repeat_level > 1 && !a.is_overdue);
  const verifyFeed = urgent_alarms.filter((a: any) => a.status === 'fixed');

  // Heatmap tile style based on finding count
  const getHeatmapColor = (count: number) => {
    if (count === 0) {
      return 'bg-emerald-950/60 border-emerald-500/25 text-emerald-400 hover:bg-emerald-900/60';
    }
    if (count === 1) {
      return 'bg-emerald-900/70 border-emerald-400/35 text-emerald-300 hover:bg-emerald-800/70';
    }
    if (count === 2) {
      return 'bg-amber-950/70 border-amber-500/40 text-amber-300 hover:bg-amber-900/70';
    }
    return 'bg-rose-950/80 border-rose-500/50 text-rose-300 font-bold hover:bg-rose-900/80';
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* TOP HALF: 5S PRODUCTION HEATMAP MATRIX */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs uppercase tracking-wide text-slate-100 flex items-center gap-1.5">
              <span>▦</span>
              <span>{t('heatmap_title')}</span>
            </span>
            <span className="text-[11px] font-bold text-sky-400 font-mono">
              ({formatMonthYear(month_info?.display_month || current_week.month)})
            </span>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center gap-3 text-[10px] font-medium text-slate-300 shrink-0 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-950 border border-emerald-500/30" />
              <span>{t('heatmap_legend_zero')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-900 border border-emerald-400/40" />
              <span>{t('heatmap_legend_minor')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-950 border border-amber-500/50" />
              <span>{t('heatmap_legend_warn')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-950 border border-rose-500/50" />
              <span>{t('heatmap_legend_severe')}</span>
            </span>
          </div>
        </div>

        {/* Heatmap Table Grid */}
        <div className="overflow-x-auto w-full pb-1">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="text-left py-1.5 px-2 font-bold uppercase tracking-wider sticky left-0 bg-slate-900/95 z-10 w-28">
                  Pillar
                </th>
                {current_week_status.map((area: any) => (
                  <th key={area.area_id} className="py-1.5 px-1 font-bold min-w-[58px] truncate" title={area.area_name}>
                    <span className="block text-[11px] font-mono text-slate-200 truncate max-w-[62px]">
                      {area.area_code}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sPillars.map((pillar) => (
                <tr key={pillar.num} className="border-b border-slate-800/60">
                  <td
                    className="py-1.5 px-2 text-left text-xs font-bold text-slate-300 sticky left-0 bg-slate-900/95 z-10 truncate"
                    title={pillar.title}
                  >
                    {pillar.label}
                  </td>
                  {current_week_status.map((area: any) => {
                    const key = `${area.area_id}_${pillar.num}`;
                    const stat = area_s_matrix[key] || { count: 0, penalty: 0 };
                    const cellCls = getHeatmapColor(stat.count);

                    return (
                      <td key={area.area_id} className="p-0.5 sm:p-1">
                        <Link
                          to={is_authenticated ? `/findings?area_id=${area.area_id}` : '/login'}
                          className={`block py-1 sm:py-1.5 rounded-md border text-center font-mono font-bold text-xs transition cursor-pointer ${cellCls}`}
                          title={`${area.area_name || area.area_code} - ${pillar.title}: ${stat.count} lỗi (-${stat.penalty}đ)`}
                        >
                          {stat.count}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Total Score Summary Row */}
              <tr className="border-t-2 border-slate-700 font-bold bg-slate-800/40">
                <td className="py-2 px-2 text-left text-xs font-black text-sky-400 sticky left-0 bg-slate-900/95 z-10">
                  Total %
                </td>
                {current_week_status.map((area: any) => {
                  const isSubmitted = area.status === 'submitted' && area.score !== null;
                  const displayScore = isSubmitted ? area.score : area.month_avg;
                  const isPass = displayScore !== null && displayScore >= target;
                  const isWarn = displayScore !== null && displayScore >= warningTarget && displayScore < target;
                  const scoreColor = isPass ? 'text-emerald-400' : isWarn ? 'text-amber-400' : 'text-rose-400';

                  return (
                    <td key={area.area_id} className="py-2 px-1 text-center font-mono text-xs font-black">
                      <span className={displayScore !== null ? scoreColor : 'text-slate-500'}>
                        {displayScore !== null ? formatScore(displayScore, lang) : '-'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM HALF: ACTION COMMAND CENTER (3 INCIDENT FEED COLUMNS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* COLUMN 1: 🚨 7-DAY OVERDUE FINDINGS */}
        <div className="rounded-xl border border-rose-500/40 bg-slate-900/90 p-3 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-2 mb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span>🚨</span>
              <span>{t('feed_overdue_title')}</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-black">
              {overdueFeed.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-56">
            {overdueFeed.length > 0 ? (
              overdueFeed.slice(0, 4).map((f: any) => (
                <Link
                  key={f.id}
                  to={is_authenticated ? `/findings/${f.id}` : '/login'}
                  className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-2 hover:border-rose-400 transition cursor-pointer flex flex-col justify-between gap-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[10px]">
                      {f.area_code}
                    </span>
                    <span className="font-mono font-bold text-[10px] text-rose-400">
                      {f.days_remaining !== undefined ? `${Math.abs(f.days_remaining)}d overdue` : 'Overdue'}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-200 truncate">
                    {lang === 'en' ? f.content_en || f.content_vi : f.content_vi}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5 border-t border-rose-500/20">
                    <span>MNG: <strong className="text-slate-300">{f.manager_name || 'Area Manager'}</strong></span>
                    <span className="text-sky-400 font-bold">{t('update_after_btn')} →</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 italic">
                {t('no_findings_clean')}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: ⚠️ WEEK REPEAT VIOLATIONS */}
        <div className="rounded-xl border border-purple-500/40 bg-slate-900/90 p-3 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-2 mb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{t('feed_repeat_title')}</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white font-mono text-[10px] font-black">
              {repeatFeed.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-56">
            {repeatFeed.length > 0 ? (
              repeatFeed.slice(0, 4).map((f: any) => (
                <Link
                  key={f.id}
                  to={is_authenticated ? `/findings/${f.id}` : '/login'}
                  className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-2 hover:border-purple-400 transition cursor-pointer flex flex-col justify-between gap-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-1.5 py-0.2 rounded bg-purple-600 text-white font-bold text-[10px]">
                      {f.area_code}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 font-mono text-[10px] font-bold">
                      Repeat W{f.repeat_level}: -{f.applied_penalty}pts
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-200 truncate">
                    {lang === 'en' ? f.content_en || f.content_vi : f.content_vi}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5 border-t border-purple-500/20">
                    <span>MNG: <strong className="text-slate-300">{f.manager_name || 'Area Manager'}</strong></span>
                    <span className="text-purple-300 font-bold">{t('update_after_btn')} →</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 italic">
                {t('no_findings_clean')}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: ✅ REMEDIATED - READY FOR VERIFICATION */}
        <div className="rounded-xl border border-sky-500/40 bg-slate-900/90 p-3 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-sky-500/30 pb-2 mb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <span>✅</span>
              <span>{t('feed_verify_title')}</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-sky-600 text-white font-mono text-[10px] font-black">
              {verifyFeed.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-56">
            {verifyFeed.length > 0 ? (
              verifyFeed.slice(0, 4).map((f: any) => (
                <Link
                  key={f.id}
                  to={is_authenticated ? `/findings/${f.id}` : '/login'}
                  className="rounded-lg border border-sky-500/30 bg-sky-950/20 p-2 hover:border-sky-400 transition cursor-pointer flex flex-col justify-between gap-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white font-bold text-[10px]">
                      {f.area_code}
                    </span>
                    <span className="font-bold text-[10px] text-emerald-400">
                      {t('waiting_auditor_verify')}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-200 truncate">
                    {lang === 'en' ? f.content_en || f.content_vi : f.content_vi}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5 border-t border-sky-500/20">
                    <span>Auditor: <strong className="text-slate-300">{f.auditor_name || '5S Auditor'}</strong></span>
                    <span className="text-emerald-400 font-bold">{t('verify_close_btn')} →</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 italic">
                {t('no_findings_clean')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
