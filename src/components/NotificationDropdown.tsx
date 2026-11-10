import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { api } from '../api/client';

interface AlarmItem {
  id: number;
  audit_id: number;
  area_id: number;
  area_code: string;
  area_name: string;
  item_code: string;
  s_group: number;
  description?: string;
  content_vi?: string;
  content_en?: string;
  location_vi?: string;
  location_en?: string;
  due_date: string;
  days_remaining: number;
  is_overdue?: boolean;
  applied_penalty?: number;
  repeat_level?: number;
  alarm_type: 'mng_fix_needed' | 'auditor_verify_needed';
  fixer_name?: string;
}

interface AlarmsResponse {
  count: number;
  mng_alarms: AlarmItem[];
  auditor_alarms: AlarmItem[];
}

interface NotificationDropdownProps {
  isLightChrome?: boolean;
  buttonClassName?: string;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isLightChrome = false,
  buttonClassName,
}) => {
  const { alarmCount, refreshAlarms } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mng' | 'auditor'>('all');
  const [loading, setLoading] = useState(false);
  const [alarms, setAlarms] = useState<AlarmsResponse | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchAlarmsData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AlarmsResponse>('/findings/alarms');
      setAlarms(res);
      await refreshAlarms();
    } catch (err) {
      console.error('Failed to load alarms:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshAlarms]);

  // Fetch when opening
  useEffect(() => {
    if (isOpen) {
      fetchAlarmsData();
    }
  }, [isOpen, fetchAlarmsData]);

  // Click outside and Escape key to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const mngList = alarms?.mng_alarms || [];
  const auditorList = alarms?.auditor_alarms || [];
  const allList = [...mngList, ...auditorList];

  const displayedList =
    activeTab === 'mng' ? mngList : activeTab === 'auditor' ? auditorList : allList;

  const handleItemClick = (id: number) => {
    setIsOpen(false);
    navigate(`/findings/${id}`);
  };

  const handleNavigateAll = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  // Styling tokens
  const triggerBtnCls =
    buttonClassName ||
    (isLightChrome
      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
      : 'text-slate-400 hover:text-white hover:bg-slate-800');

  const panelBgCls = isLightChrome
    ? 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900 shadow-[0_16px_40px_-8px_rgba(15,23,42,0.18)]'
    : 'bg-[#0b1324]/95 backdrop-blur-md border-slate-700/80 text-white shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)]';

  const headerBorderCls = isLightChrome ? 'border-slate-200' : 'border-white/10';
  const itemHoverCls = isLightChrome ? 'hover:bg-slate-50' : 'hover:bg-white/[0.04]';
  const itemBorderCls = isLightChrome ? 'border-slate-100' : 'border-white/5';
  const subTextCls = isLightChrome ? 'text-slate-500' : 'text-slate-400';
  const tabActiveCls = isLightChrome
    ? 'bg-blue-600 text-white shadow-xs'
    : 'bg-sky-500 text-slate-950 font-bold shadow-xs';
  const tabInactiveCls = isLightChrome
    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    : 'text-slate-400 hover:text-white hover:bg-white/5';

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-1.5 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer ${triggerBtnCls}`}
        title={t('notifications')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-4 h-4" />
        {alarmCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
            {alarmCount > 99 ? '99+' : alarmCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-[320px] sm:w-[380px] max-w-[90vw] z-50 rounded-2xl border ${panelBgCls} overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150`}
          role="dialog"
          aria-label={t('notifications')}
        >
          {/* Header */}
          <div className={`p-3 border-b ${headerBorderCls} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-bold text-xs uppercase tracking-wide">
                {t('notifications')}
              </span>
              {alarmCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                  {alarmCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchAlarmsData}
                disabled={loading}
                className={`p-1 rounded-md transition cursor-pointer ${
                  isLightChrome
                    ? 'hover:bg-slate-100 text-slate-500'
                    : 'hover:bg-white/10 text-slate-400'
                }`}
                title={t('refresh_notifications')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-md transition cursor-pointer ${
                  isLightChrome
                    ? 'hover:bg-slate-100 text-slate-500'
                    : 'hover:bg-white/10 text-slate-400'
                }`}
                title={t('close')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className={`px-2 py-1.5 border-b ${headerBorderCls} flex items-center gap-1 bg-black/10 text-[10px]`}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2 py-1 rounded-lg transition font-medium cursor-pointer ${
                activeTab === 'all' ? tabActiveCls : tabInactiveCls
              }`}
            >
              {t('tab_all_notifications')} ({allList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mng')}
              className={`px-2 py-1 rounded-lg transition font-medium cursor-pointer ${
                activeTab === 'mng' ? tabActiveCls : tabInactiveCls
              }`}
            >
              {t('tab_fix_needed')} ({mngList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('auditor')}
              className={`px-2 py-1 rounded-lg transition font-medium cursor-pointer ${
                activeTab === 'auditor' ? tabActiveCls : tabInactiveCls
              }`}
            >
              {t('tab_verify_needed')} ({auditorList.length})
            </button>
          </div>

          {/* Body: Notifications List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-white/5">
            {loading && displayedList.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
                <span className={`text-xs ${subTextCls}`}>{t('loading')}</span>
              </div>
            ) : displayedList.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400/80" />
                <span className={`text-xs font-medium ${subTextCls}`}>{t('no_alarms')}</span>
              </div>
            ) : (
              displayedList.map((item) => {
                const isOverdue = item.is_overdue;
                const isVerify = item.alarm_type === 'auditor_verify_needed';
                const contentText =
                  lang === 'en'
                    ? item.content_en || item.content_vi
                    : item.content_vi || item.content_en;

                return (
                  <div
                    key={`${item.alarm_type}-${item.id}`}
                    onClick={() => handleItemClick(item.id)}
                    className={`p-2.5 transition cursor-pointer border-b ${itemBorderCls} ${itemHoverCls}`}
                  >
                    {/* Top Row: Area, Code, Status Badge */}
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[9px] shrink-0">
                          {item.area_code}
                        </span>
                        <span className="font-mono font-bold text-[11px] shrink-0">
                          {item.item_code}
                        </span>
                        {item.applied_penalty !== undefined && (
                          <span className="font-mono text-[10px] text-rose-400 font-semibold">
                            -{item.applied_penalty}{t('pts_unit')}
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold text-[9px] shrink-0 flex items-center gap-1 ${
                          isOverdue
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : isVerify
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : item.days_remaining === 0
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-500/20 text-slate-300'
                        }`}
                      >
                        {isOverdue ? (
                          <>
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {t('alarm_overdue', { n: Math.abs(item.days_remaining) })}
                          </>
                        ) : isVerify ? (
                          <>
                            <Clock className="w-2.5 h-2.5" />
                            {t('alarm_waiting_verify')}
                          </>
                        ) : item.days_remaining === 0 ? (
                          <>
                            <Clock className="w-2.5 h-2.5" />
                            {t('alarm_today')}
                          </>
                        ) : (
                          <>
                            <Clock className="w-2.5 h-2.5" />
                            {t('alarm_days_left', { n: item.days_remaining })}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Middle Row: Description */}
                    <div className="mt-1 text-[11px] leading-snug line-clamp-2 font-medium">
                      {item.description || contentText || `${t('finding_detail')} #${item.id}`}
                    </div>

                    {/* Bottom Row: Location & Manager */}
                    <div className={`mt-1 flex items-center justify-between text-[10px] ${subTextCls} font-mono`}>
                      <span className="truncate max-w-[200px]">
                        {item.area_name}
                      </span>
                      {item.due_date && (
                        <span>
                          {t('due_date')}: {item.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Navigation */}
          <div className={`p-2 border-t ${headerBorderCls} flex items-center justify-between text-[10px] font-semibold bg-black/15`}>
            <button
              type="button"
              onClick={() => handleNavigateAll('/findings?overdue=1')}
              className={`hover:underline flex items-center gap-1 cursor-pointer ${
                isLightChrome ? 'text-rose-600' : 'text-rose-400'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{t('view_overdue_only')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigateAll('/findings')}
              className={`hover:underline flex items-center gap-1 cursor-pointer ${
                isLightChrome ? 'text-blue-600' : 'text-sky-400'
              }`}
            >
              <span>{t('view_all_findings')}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
