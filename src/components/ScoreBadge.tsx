import React from 'react';
import { useI18n } from '../i18n/context';
import { useAuth } from '../context/AuthContext';
import { formatScore, getScoreTier } from '../lib/format';
import { resolveColorMode } from '../lib/theme';

interface ScoreBadgeProps {
  score: number | null | undefined;
  target?: number;
  warningTarget?: number;
  showStatusText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  target = 95,
  warningTarget = 90,
  showStatusText = false,
  size = 'md',
}) => {
  const { t, lang } = useI18n();
  const { activeTheme, colorModeOverride } = useAuth();

  if (score === null || score === undefined) {
    return <span className="text-slate-400 font-mono text-sm">-</span>;
  }

  const tier = getScoreTier(score, target, warningTarget);
  const mode = resolveColorMode(activeTheme, colorModeOverride, false);
  const isModernLight = activeTheme !== 'classic' && mode === 'light';
  const isModernDark = activeTheme !== 'classic' && mode === 'dark';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base font-bold px-3 py-1.5',
  };

  const bgClasses = isModernLight
    ? tier === 'pass'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/15'
      : tier === 'warning'
      ? 'bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/15'
      : 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/15'
    : isModernDark
    ? tier === 'pass'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 ring-emerald-500/20'
      : tier === 'warning'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/35 ring-amber-500/20'
      : 'bg-rose-500/15 text-rose-300 border-rose-500/35 ring-rose-500/20'
    : tier === 'pass'
    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 ring-emerald-500/20'
    : tier === 'warning'
    ? 'bg-amber-950/50 text-amber-300 border-amber-500/40 ring-amber-500/20'
    : 'bg-rose-950/50 text-rose-300 border-rose-500/40 ring-rose-500/20';

  const statusTextClasses = isModernLight
    ? tier === 'pass'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : tier === 'warning'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-rose-100 text-rose-800 border-rose-300'
    : isModernDark
    ? tier === 'pass'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      : tier === 'warning'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    : tier === 'pass'
    ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
    : tier === 'warning'
    ? 'bg-amber-900/60 text-amber-300 border-amber-500/30'
    : 'bg-rose-900/60 text-rose-300 border-rose-500/30';

  const statusLabel =
    tier === 'pass' ? t('pass') : tier === 'warning' ? t('tag_warning') : t('fail');

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center font-semibold font-mono rounded-md border ring-1 ${bgClasses} ${sizeClasses[size]}`}
      >
        {formatScore(score, lang)}
      </span>
      {showStatusText && (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${statusTextClasses}`}>
          {statusLabel}
        </span>
      )}
    </div>
  );
};
