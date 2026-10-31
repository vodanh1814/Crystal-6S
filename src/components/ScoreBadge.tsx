import React from 'react';
import { useI18n } from '../i18n/context';

interface ScoreBadgeProps {
  score: number | null | undefined;
  target?: number;
  showStatusText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  target = 95,
  showStatusText = false,
  size = 'md',
}) => {
  const { t } = useI18n();

  if (score === null || score === undefined) {
    return <span className="text-slate-400 font-mono text-sm">-</span>;
  }

  const isPass = score >= target;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base font-bold px-3 py-1.5',
  };

  const bgClasses = isPass
    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 ring-emerald-500/20'
    : 'bg-rose-950/50 text-rose-300 border-rose-500/40 ring-rose-500/20';

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center font-semibold rounded-md border ring-1 ${bgClasses} ${sizeClasses[size]}`}
      >
        {score.toFixed(1)}%
      </span>
      {showStatusText && (
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded border ${
            isPass
              ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-900/60 text-rose-300 border-rose-500/30'
          }`}
        >
          {isPass ? t('pass') : t('fail')}
        </span>
      )}
    </div>
  );
};
