import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  ClipboardCheck,
  AlertCircle,
  BarChart3,
  MapPin,
  Users,
  CheckSquare,
  Target,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Tv,
  ArrowUpCircle,
  Info,
  Sun,
  Moon,
  Eye,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { api } from '../api/client';
import { APP_VERSION, APP_COPYRIGHT, compareSemver } from '../version';
import { resolveAppColorMode } from '../lib/theme';
import { AboutModal } from './AboutModal';
import { NotificationDropdown } from './NotificationDropdown';

type SidebarState = 'expanded' | 'collapsed' | 'hidden';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    isAdmin,
    alarmCount,
    logout,
    companyName,
    companyLogo,
    previewTheme,
    setPreviewTheme,
    colorModeOverride,
    toggleColorMode,
  } = useAuth();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname === '/';
  const resolvedMode = resolveAppColorMode(colorModeOverride, isDashboard);
  const isLightChrome = resolvedMode === 'light';

  // Sync resolved data-color-mode & <meta name="color-scheme"> across entire app
  useEffect(() => {
    document.documentElement.dataset.colorMode = resolvedMode;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (meta) {
      meta.content = resolvedMode;
    }
  }, [resolvedMode]);

  // Desktop sidebar state: 'expanded' | 'collapsed' | 'hidden'
  const [sidebarState, setSidebarState] = useState<SidebarState>(() => {
    const saved = localStorage.getItem('crystal5s_sidebar');
    return (saved as SidebarState) || 'expanded';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clockTime, setClockTime] = useState('');
  const [logoBroken, setLogoBroken] = useState(false);
  const [availableUpdateVer, setAvailableUpdateVer] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    setLogoBroken(false);
  }, [companyLogo]);

  // Auto-detect deployed Worker updates across all clients (TV / tablets / browsers)
  useEffect(() => {
    let cancelled = false;
    const checkLiveWorkerVersion = async () => {
      try {
        const res = await api.get<any>(`/settings?t=${Date.now()}`);
        if (!cancelled && res?.version && compareSemver(res.version, APP_VERSION) > 0) {
          window.location.reload();
        }
      } catch {}
    };

    checkLiveWorkerVersion();
    const timer = setInterval(checkLiveWorkerVersion, 2 * 60 * 1000);
    window.addEventListener('focus', checkLiveWorkerVersion);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', checkLiveWorkerVersion);
    };
  }, []);

  // Admin-only background check for new version on Git
  useEffect(() => {
    if (!isAdmin) {
      setAvailableUpdateVer(null);
      return;
    }
    let cancelled = false;
    const checkGitUpdate = async () => {
      try {
        const res = await api
          .get<any>(`/settings/local-update-check?t=${Date.now()}`)
          .catch(() => api.get<any>(`/settings/update-check?t=${Date.now()}`));
        if (!cancelled && res && res.has_update && res.latest_version) {
          setAvailableUpdateVer(res.latest_version);
        } else if (!cancelled) {
          setAvailableUpdateVer(null);
        }
      } catch {}
    };
    checkGitUpdate();
    const timer = setInterval(checkGitUpdate, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isAdmin]);

  // Live Clock in Vietnam time (UTC+7)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const d = vnTime.getUTCDate().toString().padStart(2, '0');
      const m = (vnTime.getUTCMonth() + 1).toString().padStart(2, '0');
      const y = vnTime.getUTCFullYear();
      const hh = vnTime.getUTCHours().toString().padStart(2, '0');
      const mm = vnTime.getUTCMinutes().toString().padStart(2, '0');
      const ss = vnTime.getUTCSeconds().toString().padStart(2, '0');
      setClockTime(`${d}/${m}/${y} ${hh}:${mm}:${ss}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      if (isFs) {
        document.documentElement.classList.add('full-tv-mode');
      } else {
        document.documentElement.classList.remove('full-tv-mode');
      }
      if (!isFs && sidebarState === 'hidden') {
        setSidebarState('expanded');
        localStorage.setItem('crystal5s_sidebar', 'expanded');
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.documentElement.classList.remove('full-tv-mode');
    };
  }, [sidebarState]);

  const cycleSidebar = () => {
    let next: SidebarState = 'expanded';
    if (sidebarState === 'expanded') next = 'collapsed';
    else if (sidebarState === 'collapsed') next = 'hidden';
    else next = 'expanded';

    setSidebarState(next);
    localStorage.setItem('crystal5s_sidebar', next);
  };

  const toggleFullTV = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setSidebarState('hidden');
      localStorage.setItem('crystal5s_sidebar', 'hidden');
    } else {
      document.exitFullscreen?.().catch(() => {});
      setSidebarState('expanded');
      localStorage.setItem('crystal5s_sidebar', 'expanded');
    }
  };

  const toggleLanguage = async () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    setLang(nextLang);
    if (user) {
      try {
        await api.put('/auth/lang', { lang: nextLang });
      } catch {}
    }
  };

  const navItems = [
    { to: '/', label: t('dashboard'), shortLabel: t('nav_tv_short'), icon: LayoutDashboard },
    { to: '/audits', label: t('audits'), shortLabel: t('nav_audits_short'), icon: ClipboardCheck },
    { to: '/findings', label: t('findings'), shortLabel: t('nav_findings_short'), icon: AlertCircle },
    { to: '/reports', label: t('reports'), shortLabel: t('nav_reports_short'), icon: BarChart3 },
  ];

  const adminItems = [
    { to: '/admin/areas', label: t('areas'), icon: MapPin },
    { to: '/admin/users', label: t('users'), icon: Users },
    { to: '/admin/checklist', label: t('checklist'), icon: CheckSquare },
    { to: '/admin/targets', label: t('targets'), icon: Target },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const sidebarBtnText =
    sidebarState === 'expanded'
      ? t('sidebar_collapse')
      : sidebarState === 'collapsed'
      ? t('sidebar_hide')
      : t('sidebar_show');

  // ── Sample A: Bento Telemetry Pro Adaptive Glass Tokens ──
  const shellBgCls = isLightChrome ? 'bg-[#eef4fb] text-slate-900' : 'bg-[#070b14] text-slate-100';

  const sidebarBgCls = isLightChrome
    ? 'bg-white/88 backdrop-blur-xl border-r border-slate-200/85 text-slate-700 shadow-sm'
    : 'bg-[#091224]/88 backdrop-blur-xl border-r border-slate-800/80 text-slate-200';

  const chromeBorderCls = isLightChrome ? 'border-slate-200/80' : 'border-white/10';

  const headerBgCls = isLightChrome
    ? 'bg-white/85 backdrop-blur-xl border-b border-slate-200/80 text-slate-900'
    : 'bg-[#091224]/82 backdrop-blur-xl border-b border-white/10 text-slate-100';

  const logoBadgeCls =
    'bg-linear-to-br from-sky-500 via-cyan-500 to-emerald-500 text-slate-950 shadow-sm shadow-sky-500/30';

  const versionPillCls = isLightChrome
    ? 'bg-sky-50 border-sky-200 text-sky-700'
    : 'bg-sky-500/15 border-sky-400/30 text-sky-300';

  const navActiveCls = isLightChrome
    ? 'bg-sky-50 text-sky-700 border border-sky-300 font-semibold shadow-2xs'
    : 'bg-sky-500/15 text-sky-300 border border-sky-500/35 font-semibold shadow-[0_0_20px_-6px_rgba(14,165,233,0.45)]';

  const navIdleCls = isLightChrome
    ? 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 border border-transparent'
    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white border border-transparent';

  const headerBtnCls = isLightChrome
    ? 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-200 text-slate-700'
    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-200';

  const fullTvBtnCls = isLightChrome
    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-600/25'
    : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sm shadow-sky-500/25';

  const accentIconTextCls = isLightChrome ? 'text-sky-600' : 'text-sky-400';

  return (
    <div className={`h-screen w-screen overflow-hidden antialiased flex flex-col md:flex-row ${shellBgCls}`}>
      {/* COLLAPSIBLE / HIDABLE BENTO GLASS SIDEBAR RAIL (Desktop) */}
      {sidebarState !== 'hidden' && (
        <aside
          className={`sidebar-transition hidden md:flex flex-col shrink-0 h-full justify-between z-30 select-none ${sidebarBgCls} ${
            sidebarState === 'expanded' ? 'w-56' : 'w-14'
          }`}
        >
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Sidebar Brand Header */}
            <div className={`h-12 px-3 flex items-center justify-between border-b shrink-0 ${chromeBorderCls}`}>
              <Link to="/" className="flex items-center gap-2 overflow-hidden group">
                {companyLogo && !logoBroken ? (
                  <img
                    src={companyLogo}
                    alt={companyName}
                    onError={() => setLogoBroken(true)}
                    className="logo-well w-7 h-7 rounded-lg object-contain bg-white/95 p-0.5 shrink-0 border border-slate-300/40 shadow-xs"
                  />
                ) : (
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${logoBadgeCls}`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                )}
                {sidebarState === 'expanded' && (
                  <div className="truncate">
                    <div
                      className={`font-black text-xs tracking-wider leading-none truncate flex items-center gap-1.5 ${
                        isLightChrome ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      <span className="truncate">{companyName} 5S</span>
                      <span
                        className={`px-1.5 py-0.2 rounded border font-mono text-[9px] font-bold shrink-0 ${versionPillCls}`}
                      >
                        v{APP_VERSION}
                      </span>
                    </div>
                    <div
                      className={`text-[9px] font-mono tracking-tight leading-tight truncate mt-0.5 ${
                        isLightChrome ? 'text-sky-700' : 'text-sky-400/90'
                      }`}
                    >
                      BENTO TELEMETRY 2.0
                    </div>
                  </div>
                )}
              </Link>
              <button
                onClick={cycleSidebar}
                title={sidebarBtnText}
                className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                  isLightChrome
                    ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {sidebarState === 'expanded' ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 px-2.5 py-2 space-y-1 text-xs font-medium overflow-y-auto min-h-0">
              {sidebarState === 'expanded' && (
                <div
                  className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    isLightChrome ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {t('dashboard')}
                </div>
              )}
              {navItems.map((item) => {
                const active =
                  location.pathname === item.to ||
                  (item.to !== '/' && location.pathname.startsWith(item.to));
                const Icon = item.icon;
                const isFindings = item.to === '/findings';
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={sidebarState === 'collapsed' ? item.label : undefined}
                    className={`relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl transition-all ${
                      active ? navActiveCls : navIdleCls
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      {sidebarState === 'expanded' && <span className="truncate">{item.label}</span>}
                    </div>
                    {isFindings && alarmCount > 0 && (
                      sidebarState === 'expanded' ? (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono font-bold text-[10px] shrink-0">
                          {alarmCount > 99 ? '99+' : alarmCount}
                        </span>
                      ) : (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                      )
                    )}
                  </Link>
                );
              })}

              {isAdmin && (
                <>
                  {sidebarState === 'expanded' && (
                    <div
                      className={`pt-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isLightChrome ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {t('admin')}
                    </div>
                  )}
                  {adminItems.map((item) => {
                    const active = location.pathname.startsWith(item.to);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        title={sidebarState === 'collapsed' ? item.label : undefined}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${
                          active ? navActiveCls : navIdleCls
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {sidebarState === 'expanded' && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className={`p-2.5 border-t space-y-2 shrink-0 ${chromeBorderCls}`}>
            <button
              onClick={() => {
                setSidebarState('hidden');
                localStorage.setItem('crystal5s_sidebar', 'hidden');
              }}
              title={t('sidebar_hide')}
              className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border cursor-pointer transition ${headerBtnCls}`}
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              {sidebarState === 'expanded' && (
                <span className="truncate">{t('sidebar_hide')}</span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2 px-1">
                <div
                  className={`w-6 h-6 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ${logoBadgeCls}`}
                >
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                {sidebarState === 'expanded' && (
                  <div className="truncate text-xs min-w-0 flex-1">
                    <div
                      className={`font-semibold leading-none truncate ${
                        isLightChrome ? 'text-slate-900' : 'text-slate-200'
                      }`}
                    >
                      {user.full_name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 capitalize truncate">
                      {user.role}
                    </div>
                  </div>
                )}
                {sidebarState === 'expanded' && (
                  <button
                    onClick={handleLogout}
                    className={`p-1 rounded transition cursor-pointer ${
                      isLightChrome
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                    }`}
                    title={t('logout')}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                title={t('login')}
                className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border font-semibold transition ${navActiveCls}`}
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0" />
                {sidebarState === 'expanded' && <span className="truncate">{t('login')}</span>}
              </Link>
            )}
            <button
              onClick={() => setAboutOpen(true)}
              className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition cursor-pointer ${navIdleCls}`}
              title={t('about_app')}
            >
              <Info className={`w-3.5 h-3.5 shrink-0 ${accentIconTextCls}`} />
              {sidebarState === 'expanded' && <span className="truncate">{t('about_app')}</span>}
            </button>

            {sidebarState === 'expanded' && (
              <div className="pt-0.5 text-center text-[10px] text-slate-500 font-mono select-none">
                {APP_COPYRIGHT}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* RIGHT MAIN VIEWPORT */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {/* TOP COMMAND HEADER BAR */}
        <header
          className={`h-11 2xl:h-12 shrink-0 px-3 md:px-4 flex items-center justify-between gap-2 z-20 select-none ${headerBgCls}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-1.5 rounded-lg transition ${
                isLightChrome
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop cycle sidebar button */}
            <button
              onClick={cycleSidebar}
              className={`hidden md:flex px-2.5 py-1 rounded-lg border text-xs font-semibold items-center gap-1.5 cursor-pointer shrink-0 transition ${headerBtnCls}`}
              title={sidebarBtnText}
            >
              <Menu className={`w-3.5 h-3.5 ${accentIconTextCls}`} />
              <span>{sidebarBtnText}</span>
            </button>

            {/* Title / Banner */}
            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
              {companyLogo && !logoBroken && (
                <img
                  src={companyLogo}
                  alt={companyName}
                  onError={() => setLogoBroken(true)}
                  className="logo-well w-5 h-5 object-contain rounded shrink-0 bg-white/95 p-0.5 border border-slate-300/30"
                />
              )}
              <span
                className={`font-black text-xs sm:text-sm tracking-tight truncate max-w-[160px] sm:max-w-[280px] md:max-w-[380px] xl:max-w-none ${
                  isLightChrome ? 'text-slate-900' : 'text-white'
                }`}
              >
                CRYSTAL 5S PRO <span className="text-slate-400 font-normal">·</span>{' '}
                {companyName}
              </span>
              <span
                className={`hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${versionPillCls}`}
              >
                Bento Telemetry 2.0 (Glass Adaptive)
              </span>
              <span
                className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-bold shrink-0 ${versionPillCls}`}
              >
                v{APP_VERSION}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Live Preview Theme Banner Pill */}
            {previewTheme && (
              <button
                type="button"
                onClick={() => setPreviewTheme(null)}
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-500 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                title={t('theme_exit_preview_btn')}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">
                  {t('theme_previewing_badge')}: {previewTheme}
                </span>
                <X className="w-3 h-3 shrink-0" />
              </button>
            )}

            {/* Admin-only Auto-Update Available Notification Pill */}
            {isAdmin && availableUpdateVer && (
              <Link
                to="/admin/targets"
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm shadow-amber-500/30 animate-pulse transition"
                title={t('new_version_found_msg', { v: availableUpdateVer })}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {t('update_available_badge', { v: availableUpdateVer })}
                </span>
              </Link>
            )}

            {/* Live Clock Indicator */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono ${
                isLightChrome
                  ? 'bg-slate-100/90 border-slate-200 text-slate-700'
                  : 'bg-[#070b14] border-white/10 text-slate-200'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>
                {t('live_clock')} · {clockTime}
              </span>
            </div>

            {/* Adaptive Light / Dark Mode Switcher (Always enabled in Sample A) */}
            <button
              type="button"
              onClick={() => toggleColorMode(resolvedMode)}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${headerBtnCls}`}
              title={
                resolvedMode === 'dark'
                  ? t('color_mode_switch_light')
                  : t('color_mode_switch_dark')
              }
              aria-label={
                resolvedMode === 'dark'
                  ? t('color_mode_switch_light')
                  : t('color_mode_switch_dark')
              }
            >
              {resolvedMode === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-sky-600" />
              )}
              <span className="hidden xl:inline">
                {resolvedMode === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>

            {/* Dedicated Full TV Button - Hidden on mobile screens */}
            <button
              onClick={toggleFullTV}
              className={`hidden sm:flex px-2.5 py-1 rounded-lg font-bold text-xs items-center gap-1 cursor-pointer transition ${fullTvBtnCls}`}
              title={t('full_tv_mode')}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{isFullscreen ? t('exit_full_tv') : t('full_tv_mode')}</span>
            </button>

            {/* Alarm Bell Notification Dropdown */}
            <NotificationDropdown isLightChrome={isLightChrome} />

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className={`px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer transition ${headerBtnCls}`}
            >
              {lang.toUpperCase()}
            </button>

            {/* About App / Copyright Button */}
            <button
              onClick={() => setAboutOpen(true)}
              className={`p-1.5 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer ${
                isLightChrome
                  ? 'text-slate-500 hover:text-sky-600 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-sky-400 hover:bg-slate-800'
              }`}
              title={t('about_app')}
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Profile / Login icon in top-right header */}
            <Link
              to={user ? '/profile' : '/login'}
              className={`p-1.5 rounded-lg transition flex items-center gap-1.5 ${
                user
                  ? `${accentIconTextCls} ${
                      isLightChrome ? 'hover:bg-slate-100' : 'hover:text-white hover:bg-slate-800'
                    }`
                  : `border px-2.5 py-1 text-xs font-semibold ${headerBtnCls}`
              }`}
              title={user ? `${user.full_name} (${t('profile')})` : t('login')}
            >
              <UserIcon className="w-4 h-4" />
              {!user && <span className="hidden sm:inline">{t('login')}</span>}
            </Link>
          </div>
        </header>

        {/* Mobile Slide-over Drawer */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden px-4 py-5 space-y-4 border-b z-40 overflow-y-auto max-h-[80vh] ${
              isLightChrome
                ? 'bg-white/95 backdrop-blur-xl text-slate-900 border-slate-200'
                : 'bg-[#0b1324]/95 backdrop-blur-xl text-white border-white/10'
            }`}
          >
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  location.pathname === item.to ||
                  (item.to !== '/' && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      active
                        ? navActiveCls
                        : isLightChrome
                        ? 'hover:bg-slate-100'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 opacity-80" />
                      <span>{item.label}</span>
                    </div>
                    {item.to === '/findings' && alarmCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold">
                        {alarmCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {isAdmin && (
              <div className={`space-y-1 pt-3 border-t ${chromeBorderCls}`}>
                <div className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  {t('admin')}
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                        isLightChrome ? 'hover:bg-slate-100' : 'hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className={`pt-3 border-t flex flex-col gap-2 ${chromeBorderCls}`}>
              {user ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{user.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/50 text-rose-300 text-xs font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${fullTvBtnCls}`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>{t('login')}</span>
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAboutOpen(true);
                }}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${headerBtnCls}`}
              >
                <Info className={`w-4 h-4 ${accentIconTextCls}`} />
                <span>{t('about_app')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace */}
        {isDashboard ? (
          <main className="theme-tv-canvas flex-1 min-h-0 h-full flex flex-col overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
        ) : (
          <main
            className={`theme-workspace flex-1 min-h-0 flex flex-col overflow-y-auto pb-20 md:pb-0 ${
              resolvedMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            <div className="p-3 sm:p-4 lg:p-5 2xl:p-6 w-full min-h-full flex-1 flex flex-col">{children}</div>
          </main>
        )}

        {/* Mobile Bottom Navigation Bar (Sample A Thumb-Friendly Navigation) */}
        <nav
          aria-label="Mobile navigation"
          className={`md:hidden fixed inset-x-0 bottom-0 z-30 h-16 px-2 border-t flex items-center justify-around backdrop-blur-xl select-none ${
            isLightChrome
              ? 'bg-white/92 border-slate-200/90 text-slate-500 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]'
              : 'bg-[#091224]/94 border-white/10 text-slate-400 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]'
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            const isFindingsItem = item.to === '/findings';
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition ${
                  active
                    ? isLightChrome
                      ? 'text-sky-600 bg-sky-50'
                      : 'text-sky-400 bg-sky-500/15'
                    : isLightChrome
                    ? 'text-slate-500 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="truncate">{item.shortLabel}</span>
                {isFindingsItem && alarmCount > 0 && (
                  <span className="absolute top-0.5 right-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                    {alarmCount > 99 ? '99+' : alarmCount}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            to={isAdmin ? '/admin/targets' : user ? '/profile' : '/login'}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition ${
              location.pathname.startsWith('/admin') ||
              location.pathname === '/profile' ||
              location.pathname === '/login'
                ? isLightChrome
                  ? 'text-sky-600 bg-sky-50'
                  : 'text-sky-400 bg-sky-500/15'
                : isLightChrome
                ? 'text-slate-500 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAdmin ? (
              <Target className="w-5 h-5 mb-0.5" />
            ) : (
              <UserIcon className="w-5 h-5 mb-0.5" />
            )}
            <span className="truncate">
              {isAdmin ? t('nav_settings_short') : user ? t('profile') : t('login')}
            </span>
          </Link>
        </nav>
      </div>

      {/* About App Modal */}
      <AboutModal
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
        companyName={companyName}
      />
    </div>
  );
};
