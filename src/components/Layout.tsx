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
  Bell,
  Globe,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Tv,
  ArrowUpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { api } from '../api/client';
import { APP_VERSION } from '../version';

type SidebarState = 'expanded' | 'collapsed' | 'hidden';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, alarmCount, logout, companyName, companyLogo } = useAuth();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname === '/';

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
      if (!isFs && sidebarState === 'hidden') {
        // User exited fullscreen via ESC key, restore sidebar
        setSidebarState('expanded');
        localStorage.setItem('crystal5s_sidebar', 'expanded');
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
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
    { to: '/', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/audits', label: t('audits'), icon: ClipboardCheck },
    { to: '/findings', label: t('findings'), icon: AlertCircle },
    { to: '/reports', label: t('reports'), icon: BarChart3 },
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased flex flex-col md:flex-row">
      {/* COLLAPSIBLE / HIDABLE LEFT SIDEBAR (Desktop) */}
      {sidebarState !== 'hidden' && (
        <aside
          className={`sidebar-transition hidden md:flex flex-col shrink-0 h-full bg-slate-900 border-r border-slate-800 justify-between z-30 select-none ${
            sidebarState === 'expanded' ? 'w-56' : 'w-14'
          }`}
        >
          <div>
            {/* Sidebar Brand Header */}
            <div className="h-12 px-3 flex items-center justify-between border-b border-slate-800">
              <Link to="/" className="flex items-center gap-2 overflow-hidden group">
                {companyLogo && !logoBroken ? (
                  <img
                    src={companyLogo}
                    alt={companyName}
                    onError={() => setLogoBroken(true)}
                    className="w-7 h-7 rounded-md object-contain bg-white/95 p-0.5 shrink-0 border border-white/20 shadow-xs"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-sm shadow-emerald-500/20">
                    5S
                  </div>
                )}
                {sidebarState === 'expanded' && (
                  <div className="truncate">
                    <div className="font-bold text-xs tracking-wider leading-none text-white truncate flex items-center gap-1.5">
                      <span className="truncate">{companyName} 5S</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[9px] font-bold shrink-0">
                        v{APP_VERSION}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight truncate mt-0.5">
                      Andon System · v{APP_VERSION}
                    </div>
                  </div>
                )}
              </Link>
              <button
                onClick={cycleSidebar}
                title={sidebarBtnText}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
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
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                      active
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
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
                    <div className="pt-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                          active
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
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
          <div className="p-2.5 border-t border-slate-800 space-y-2">
            <button
              onClick={() => {
                setSidebarState('hidden');
                localStorage.setItem('crystal5s_sidebar', 'hidden');
              }}
              title={t('sidebar_hide')}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition"
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              {sidebarState === 'expanded' && (
                <span className="truncate">{t('sidebar_hide')}</span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                {sidebarState === 'expanded' && (
                  <div className="truncate text-xs min-w-0 flex-1">
                    <div className="font-semibold text-slate-200 leading-none truncate">
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
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
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
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-semibold transition"
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0" />
                {sidebarState === 'expanded' && <span className="truncate">{t('login')}</span>}
              </Link>
            )}
          </div>
        </aside>
      )}

      {/* RIGHT MAIN VIEWPORT */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {/* COMPACT TOP HEADER BAR (h-12 = 48px) */}
        <header className="h-12 shrink-0 px-3 md:px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 z-20 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md text-slate-300 hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop cycle sidebar button */}
            <button
              onClick={cycleSidebar}
              className="hidden md:flex px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 items-center gap-1.5 cursor-pointer shrink-0 transition"
              title={sidebarBtnText}
            >
              <Menu className="w-3.5 h-3.5 text-emerald-400" />
              <span>{sidebarBtnText}</span>
            </button>

            {/* Title / Banner */}
            <div className="flex items-center gap-2 truncate">
              {companyLogo && !logoBroken && (
                <img
                  src={companyLogo}
                  alt={companyName}
                  onError={() => setLogoBroken(true)}
                  className="w-5 h-5 object-contain rounded shrink-0 bg-white/95 p-0.5"
                />
              )}
              <span className="font-black text-xs sm:text-sm tracking-tight text-white truncate">
                {companyName} <span className="text-slate-500 font-normal">·</span> {t('factory_andon_board')}
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                v{APP_VERSION}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Admin-only Auto-Update Available Notification Pill */}
            {isAdmin && availableUpdateVer && (
              <Link
                to="/admin/targets"
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm shadow-amber-500/30 animate-pulse transition"
                title={t('new_version_found_msg', { v: availableUpdateVer })}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>{t('update_available_badge', { v: availableUpdateVer })}</span>
              </Link>
            )}
            {/* Live Clock Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>
                {t('live_clock')} · {clockTime}
              </span>
            </div>

            {/* Dedicated Full TV Button */}
            <button
              onClick={toggleFullTV}
              className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-sm shadow-emerald-500/20"
              title={t('full_tv_mode')}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isFullscreen ? t('exit_full_tv') : t('full_tv_mode')}
              </span>
            </button>

            {/* Alarm Bell Button */}
            <Link
              to="/findings?overdue=1"
              className="relative p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={t('alarms')}
            >
              <Bell className="w-4 h-4" />
              {alarmCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {alarmCount > 99 ? '99+' : alarmCount}
                </span>
              )}
            </Link>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition"
            >
              {lang.toUpperCase()}
            </button>

            {/* Profile / Login icon in top-right header */}
            <Link
              to={user ? '/profile' : '/login'}
              className={`p-1.5 rounded-lg transition flex items-center gap-1.5 ${
                user
                  ? 'text-emerald-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-xs font-semibold'
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
          <div className="md:hidden bg-slate-900 text-white px-4 py-6 space-y-4 border-b border-slate-800 z-40">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800"
                  >
                    <Icon className="w-5 h-5 text-slate-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {isAdmin && (
              <div className="space-y-1 pt-3 border-t border-slate-800">
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
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800"
                    >
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              {user ? (
                <>
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
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>{t('login')}</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Main Workspace */}
        {isDashboard ? (
          // On Dashboard: 100% viewport fit, zero scroll on lg:
          <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col bg-slate-950 text-slate-100">
            {children}
          </main>
        ) : (
          // On other pages: clean high-contrast light workspace for forms, tables, and cards
          <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50 text-slate-900">
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  );
};
