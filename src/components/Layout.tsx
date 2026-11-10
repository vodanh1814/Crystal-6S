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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { api } from '../api/client';
import { APP_VERSION, APP_COPYRIGHT } from '../version';
import { resolveColorMode } from '../lib/theme';
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
    activeTheme,
    previewTheme,
    setPreviewTheme,
    colorModeOverride,
    toggleColorMode,
  } = useAuth();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname === '/';
  const resolvedMode = resolveColorMode(activeTheme, colorModeOverride, isDashboard);
  const isClassic = true;
  const isGlass = false;
  const isHybrid = false;
  const isLightChrome = false;

  // Sync resolved data-color-mode & <meta name="color-scheme"> for CSS theme selectors
  useEffect(() => {
    document.documentElement.dataset.colorMode = resolvedMode;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (meta) {
      meta.content = isClassic ? 'light dark' : colorModeOverride || 'light dark';
    }
  }, [resolvedMode, isClassic, colorModeOverride]);

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
          .get<any>('/settings/local-update-check')
          .catch(() => api.get<any>('/settings/update-check'));
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
        // User exited fullscreen via ESC key, restore sidebar
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

  // Theme-aware Chrome classes (preserving Classic 100% faithfully)
  const shellBgCls = isClassic
    ? 'bg-slate-950 text-slate-100'
    : isGlass
    ? isLightChrome
      ? 'bg-[#eef4fb] text-slate-800'
      : 'bg-[#060c1a] text-slate-100'
    : isLightChrome
    ? 'bg-[#f4f7fb] text-slate-900'
    : 'bg-[#070b14] text-slate-100';

  const sidebarBgCls = isClassic
    ? 'bg-slate-900 border-r border-slate-800'
    : isGlass
    ? isLightChrome
      ? 'bg-white/80 backdrop-blur-xl border-r border-slate-200/80 text-slate-700 shadow-sm'
      : 'bg-[#091226]/85 backdrop-blur-xl border-r border-white/10 text-slate-200'
    : isLightChrome
    ? 'bg-white border-r border-slate-200/90 text-slate-700'
    : 'bg-[#0b111e] border-r border-white/10 text-slate-200';

  const chromeBorderCls = isClassic
    ? 'border-slate-800'
    : isLightChrome
    ? 'border-slate-200/80'
    : 'border-white/10';

  const headerBgCls = isClassic
    ? 'bg-slate-900 border-b border-slate-800'
    : isGlass
    ? isLightChrome
      ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/80 text-slate-800'
      : 'bg-[#091226]/80 backdrop-blur-xl border-b border-white/10 text-slate-100'
    : isLightChrome
    ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800'
    : 'bg-[#0b111e]/95 backdrop-blur-md border-b border-white/10 text-slate-100';

  const logoBadgeCls = isClassic
    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
    : isGlass
    ? 'bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-sm shadow-blue-600/25'
    : 'bg-linear-to-br from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-500/25';

  const versionPillCls = isClassic
    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
    : isGlass
    ? isLightChrome
      ? 'bg-blue-50 border-blue-200 text-blue-700'
      : 'bg-blue-500/20 border-blue-400/35 text-sky-300'
    : isLightChrome
    ? 'bg-sky-50 border-sky-200 text-sky-700'
    : 'bg-sky-500/15 border-sky-400/30 text-sky-300';

  const navActiveCls = isClassic
    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
    : isGlass
    ? isLightChrome
      ? 'bg-blue-600/10 text-blue-700 border border-blue-500/25 font-semibold shadow-2xs'
      : 'bg-blue-500/18 text-sky-300 border border-sky-400/30 font-semibold'
    : isLightChrome
    ? 'bg-sky-500/10 text-sky-700 border border-sky-500/25 font-semibold'
    : 'bg-sky-500/15 text-sky-300 border border-sky-400/30 font-semibold';

  const navIdleCls = isClassic
    ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
    : isLightChrome
    ? 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
    : 'text-slate-300 hover:bg-white/5 hover:text-white';

  const headerBtnCls = isClassic
    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
    : isLightChrome
    ? 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-200 text-slate-700'
    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200';

  const fullTvBtnCls = isClassic
    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/20'
    : isGlass
    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/25'
    : isLightChrome
    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-600/25'
    : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sm shadow-sky-500/25';

  const accentIconTextCls = isClassic
    ? 'text-emerald-400'
    : isGlass
    ? isLightChrome
      ? 'text-blue-600'
      : 'text-sky-400'
    : isLightChrome
    ? 'text-sky-600'
    : 'text-sky-400';

  return (
    <div className={`h-screen w-screen overflow-hidden antialiased flex flex-col md:flex-row ${shellBgCls}`}>
      {/* COLLAPSIBLE / HIDABLE LEFT SIDEBAR (Desktop) */}
      {sidebarState !== 'hidden' && (
        <aside
          className={`sidebar-transition hidden md:flex flex-col shrink-0 h-full justify-between z-30 select-none ${sidebarBgCls} ${
            sidebarState === 'expanded' ? 'w-56' : 'w-14'
          }`}
        >
          <div>
            {/* Sidebar Brand Header */}
            <div className={`h-12 px-3 flex items-center justify-between border-b ${chromeBorderCls}`}>
              <Link to="/" className="flex items-center gap-2 overflow-hidden group">
                {companyLogo && !logoBroken ? (
                  <img
                    src={companyLogo}
                    alt={companyName}
                    onError={() => setLogoBroken(true)}
                    className="logo-well w-7 h-7 rounded-md object-contain bg-white/95 p-0.5 shrink-0 border border-slate-300/40 shadow-xs"
                  />
                ) : (
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-xs shrink-0 ${logoBadgeCls}`}
                  >
                    5S
                  </div>
                )}
                {sidebarState === 'expanded' && (
                  <div className="truncate">
                    <div
                      className={`font-bold text-xs tracking-wider leading-none truncate flex items-center gap-1.5 ${
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
                      className={`text-[10px] leading-tight truncate mt-0.5 ${
                        isLightChrome ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      Andon System · v{APP_VERSION}
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
            <nav className="p-2 space-y-1 text-xs font-medium">
              {sidebarState === 'expanded' && (
                <div
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
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
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={sidebarState === 'collapsed' ? item.label : undefined}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${
                      active ? navActiveCls : navIdleCls
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {sidebarState === 'expanded' && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}

              {isAdmin && (
                <>
                  {sidebarState === 'expanded' && (
                    <div
                      className={`pt-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
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
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${
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
          <div className={`p-2.5 border-t space-y-2 ${chromeBorderCls}`}>
            <button
              onClick={() => {
                setSidebarState('hidden');
                localStorage.setItem('crystal5s_sidebar', 'hidden');
              }}
              title={t('sidebar_hide')}
              className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs border cursor-pointer transition ${headerBtnCls}`}
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
                className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs border font-semibold transition ${navActiveCls}`}
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0" />
                {sidebarState === 'expanded' && <span className="truncate">{t('login')}</span>}
              </Link>
            )}
            <button
              onClick={() => setAboutOpen(true)}
              className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition cursor-pointer ${navIdleCls}`}
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
        {/* COMPACT TOP HEADER BAR (h-12 = 48px) */}
        <header
          className={`h-12 shrink-0 px-3 md:px-4 flex items-center justify-between gap-2 z-20 select-none ${headerBgCls}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-1.5 rounded-md transition ${
                isLightChrome
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop cycle sidebar button */}
            <button
              onClick={cycleSidebar}
              className={`hidden md:flex px-2.5 py-1.5 rounded-md border text-xs font-semibold items-center gap-1.5 cursor-pointer shrink-0 transition ${headerBtnCls}`}
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
                className={`font-black text-xs sm:text-sm tracking-tight truncate max-w-[150px] sm:max-w-[240px] md:max-w-[340px] xl:max-w-none ${
                  isLightChrome ? 'text-slate-900' : 'text-white'
                }`}
              >
                {companyName} <span className="text-slate-400 font-normal">·</span>{' '}
                {t('factory_andon_board')}
              </span>
              <span
                className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold shrink-0 ${versionPillCls}`}
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
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono ${
                isClassic
                  ? 'bg-slate-950 border-slate-800 text-slate-300'
                  : isLightChrome
                  ? 'bg-slate-100/90 border-slate-200 text-slate-700'
                  : 'bg-[#070b14] border-white/10 text-slate-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-ping ${
                  isClassic ? 'bg-emerald-400' : isGlass ? 'bg-blue-500' : 'bg-sky-400'
                }`}
              ></span>
              <span>
                {t('live_clock')} · {clockTime}
              </span>
            </div>

            {/* Light / Dark Mode Switcher for Modern Themes (Crystal Glass & Crystal Hybrid) */}
            {!isClassic && (
              <button
                type="button"
                onClick={() => toggleColorMode(resolvedMode)}
                className={`p-1.5 sm:px-2 sm:py-1 rounded-md border text-xs font-bold flex items-center gap-1 cursor-pointer transition ${headerBtnCls}`}
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
            )}

            {/* Dedicated Full TV Button - Hidden on mobile screens */}
            <button
              onClick={toggleFullTV}
              className={`hidden sm:flex px-2.5 py-1 rounded font-bold text-xs items-center gap-1 cursor-pointer transition ${fullTvBtnCls}`}
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
              className={`px-2 py-1 rounded border text-xs font-bold cursor-pointer transition ${headerBtnCls}`}
            >
              {lang.toUpperCase()}
            </button>

            {/* About App / Copyright Button */}
            <button
              onClick={() => setAboutOpen(true)}
              className={`p-1.5 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer ${
                isLightChrome
                  ? 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
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
            className={`md:hidden px-4 py-6 space-y-4 border-b z-40 ${
              isLightChrome
                ? 'bg-white/95 backdrop-blur-xl text-slate-900 border-slate-200'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      isLightChrome ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-slate-400" />
                    <span>{item.label}</span>
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
                        isLightChrome ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
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
          // On Dashboard: adaptive viewport fit on tall screens, smooth scroll on laptops
          <main
            className={`theme-tv-canvas flex-1 min-h-0 h-full flex flex-col overflow-y-auto ${
              isClassic ? 'bg-slate-950 text-slate-100' : ''
            }`}
          >
            {children}
          </main>
        ) : (
          // On other pages: adaptive high-contrast workspace for forms, tables, and cards
          <main
            className={`theme-workspace flex-1 min-h-0 overflow-y-auto ${
              isClassic
                ? 'bg-slate-50 text-slate-900'
                : resolvedMode === 'dark'
                ? 'text-slate-100'
                : 'text-slate-900'
            } ${isHybrid ? 'pb-20 md:pb-0' : ''}`}
          >
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</div>
          </main>
        )}

        {/* Mobile Bottom Navigation Bar (Enabled in Crystal Hybrid Adaptive Theme - Sample 4) */}
        {isHybrid && (
          <nav
            aria-label="Mobile navigation"
            className={`md:hidden fixed inset-x-0 bottom-0 z-30 h-16 px-2 border-t flex items-center justify-around backdrop-blur-xl select-none ${
              isLightChrome
                ? 'bg-white/92 border-slate-200/90 text-slate-500 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]'
                : 'bg-[#0b111e]/94 border-white/10 text-slate-400 shadow-[0_-4px_24px_rgba(0,0,0,0.45)]'
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
              <span className="truncate">{isAdmin ? t('nav_settings_short') : user ? t('profile') : t('login')}</span>
            </Link>
          </nav>
        )}
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
