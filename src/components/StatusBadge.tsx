import React from 'react';
import { useI18n } from '../i18n/context';

interface StatusBadgeProps {
  status: string;
  type?: 'audit' | 'finding';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'finding' }) => {
  const { t } = useI18n();

  if (type === 'audit') {
    if (status === 'submitted') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
          {t('status_submitted')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/30">
        {t('status_draft')}
      </span>
    );
  }

  // Finding statuses: open, fixed, closed, carried
  switch (status) {
    case 'open':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-950/40 text-rose-400 border border-rose-500/30">
          {t('status_open')}
        </span>
      );
    case 'fixed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-950/40 text-blue-400 border border-blue-500/30">
          {t('status_fixed')}
        </span>
      );
    case 'closed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          {t('status_closed')}
        </span>
      );
    case 'carried':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-950/40 text-purple-400 border border-purple-500/30">
          {t('status_carried')}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          {status}
        </span>
      );
  }
};
