import React from 'react';
import { useI18n } from '../i18n/context';
import { useAuth } from '../context/AuthContext';
import { resolveColorMode } from '../lib/theme';

interface StatusBadgeProps {
  status: string;
  type?: 'audit' | 'finding';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'finding' }) => {
  const { t } = useI18n();
  const { activeTheme, colorModeOverride } = useAuth();

  const mode = resolveColorMode(activeTheme, colorModeOverride, false);
  const isModernLight = activeTheme !== 'classic' && mode === 'light';

  if (type === 'audit') {
    if (status === 'submitted') {
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
            isModernLight
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {t('status_submitted')}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
          isModernLight
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-amber-950/40 text-amber-400 border-amber-500/30'
        }`}
      >
        {t('status_draft')}
      </span>
    );
  }

  // Finding statuses: open, fixed, closed, carried
  switch (status) {
    case 'open':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
            isModernLight
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
          }`}
        >
          {t('status_open')}
        </span>
      );
    case 'fixed':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
            isModernLight
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-blue-950/40 text-blue-400 border-blue-500/30'
          }`}
        >
          {t('status_fixed')}
        </span>
      );
    case 'closed':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
            isModernLight
              ? 'bg-slate-100 text-slate-700 border-slate-300'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {t('status_closed')}
        </span>
      );
    case 'carried':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
            isModernLight
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-purple-950/40 text-purple-400 border-purple-500/30'
          }`}
        >
          {t('status_carried')}
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
            isModernLight
              ? 'bg-slate-100 text-slate-600 border-slate-300'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {status}
        </span>
      );
  }
};
