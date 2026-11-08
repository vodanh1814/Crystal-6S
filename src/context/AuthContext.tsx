import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { User, UserAreaAssignment, UiThemeId, ColorMode } from '../api/types';
import { useI18n } from '../i18n/context';

function normalizeThemeValue(val: unknown): UiThemeId {
  if (val === 'crystal-glass' || val === 'crystal-hybrid') return val;
  return 'classic';
}

function readCachedTheme(): UiThemeId {
  try {
    return normalizeThemeValue(localStorage.getItem('crystal5s_ui_theme_cache'));
  } catch {
    return 'classic';
  }
}

function readStoredColorMode(): ColorMode | null {
  try {
    const raw = localStorage.getItem('crystal5s_color_mode');
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: User | null;
  areas: UserAreaAssignment[];
  loading: boolean;
  alarmCount: number;
  companyName: string;
  companyLogo: string;
  uiTheme: UiThemeId;
  previewTheme: UiThemeId | null;
  activeTheme: UiThemeId;
  colorModeOverride: ColorMode | null;
  setPreviewTheme: (theme: UiThemeId | null) => void;
  updateUiTheme: (theme: UiThemeId) => Promise<void>;
  setColorModeOverride: (mode: ColorMode | null) => void;
  toggleColorMode: (currentResolvedMode: ColorMode) => void;
  refreshAlarms: () => Promise<void>;
  updateBranding: (name: string, logo: string) => Promise<void>;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isViewer: boolean;
  isAuditor: boolean;
  isManager: boolean;
  canAudit: (areaId: number) => boolean;
  canManage: (areaId: number) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [areas, setAreas] = useState<UserAreaAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [alarmCount, setAlarmCount] = useState(0);
  const [companyName, setCompanyName] = useState('CRYSTAL');
  const [companyLogo, setCompanyLogo] = useState('');
  const [uiTheme, setUiTheme] = useState<UiThemeId>(readCachedTheme);
  const [previewTheme, setPreviewTheme] = useState<UiThemeId | null>(null);
  const [colorModeOverride, setColorModeOverrideState] = useState<ColorMode | null>(readStoredColorMode);
  const { setLang } = useI18n();

  const activeTheme: UiThemeId = previewTheme ?? uiTheme;

  // Sync active theme & color-scheme meta hint to <html> attributes
  useEffect(() => {
    document.documentElement.dataset.uiTheme = activeTheme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (activeTheme === 'classic') {
      if (meta) meta.content = 'light dark';
    } else if (colorModeOverride === 'light' || colorModeOverride === 'dark') {
      if (meta) meta.content = colorModeOverride;
    } else {
      if (meta) meta.content = 'light dark';
    }
  }, [activeTheme, colorModeOverride]);

  // Listen for cross-tab theme / color-mode changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'crystal5s_color_mode') {
        setColorModeOverrideState(e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : null);
      } else if (e.key === 'crystal5s_ui_theme_cache') {
        setUiTheme(normalizeThemeValue(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setColorModeOverride = useCallback((mode: ColorMode | null) => {
    setColorModeOverrideState(mode);
    try {
      if (mode) {
        localStorage.setItem('crystal5s_color_mode', mode);
      } else {
        localStorage.removeItem('crystal5s_color_mode');
      }
    } catch {}
  }, []);

  const toggleColorMode = useCallback(
    (currentResolvedMode: ColorMode) => {
      const target: ColorMode = currentResolvedMode === 'dark' ? 'light' : 'dark';
      setColorModeOverride(target);
    },
    [setColorModeOverride]
  );

  // Fetch company branding & global UI theme settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{
        settings: { company_name: string; company_logo: string; ui_theme?: UiThemeId };
      }>('/settings');
      if (res?.settings) {
        if (res.settings.company_name) setCompanyName(res.settings.company_name);
        if (res.settings.company_logo !== undefined) setCompanyLogo(res.settings.company_logo);
        if (res.settings.ui_theme !== undefined) {
          const normalized = normalizeThemeValue(res.settings.ui_theme);
          setUiTheme(normalized);
          try {
            localStorage.setItem('crystal5s_ui_theme_cache', normalized);
          } catch {}
        }
      }
    } catch {
      // Default to CRYSTAL / classic if settings cannot be fetched
    }
  }, []);

  const updateBranding = async (name: string, logo: string) => {
    const finalName = name || 'CRYSTAL';
    const finalLogo = logo || '';
    setCompanyName(finalName);
    setCompanyLogo(finalLogo);
    await api.put('/settings', { company_name: finalName, company_logo: finalLogo });
  };

  const updateUiTheme = async (nextTheme: UiThemeId) => {
    const normalized = normalizeThemeValue(nextTheme);
    await api.put('/settings', { ui_theme: normalized });
    setUiTheme(normalized);
    setPreviewTheme(null);
    try {
      localStorage.setItem('crystal5s_ui_theme_cache', normalized);
    } catch {}
  };

  // Sync document title and favicon dynamically
  useEffect(() => {
    document.title = `${companyName} · 5S Audit`;
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (companyLogo) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = companyLogo;
    } else if (link) {
      link.href = '/vite.svg';
    }
  }, [companyName, companyLogo]);

  const refreshAlarms = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/findings/alarms');
      setAlarmCount(res.count || 0);
    } catch {
      // ignore alarm fetch error if logged out
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{ user: User; areas: UserAreaAssignment[] }>('/auth/me');
      setUser(res.user);
      setAreas(res.areas || []);
      if (res.user.lang) {
        setLang(res.user.lang);
      }
      await refreshAlarms();
    } catch {
      setUser(null);
      setAreas([]);
      setAlarmCount(0);
    } finally {
      setLoading(false);
    }
  }, [setLang, refreshAlarms]);

  useEffect(() => {
    fetchSettings();
    refreshUser();
    const timer = setInterval(fetchSettings, 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchSettings, refreshUser]);

  const login = (loggedUser: User) => {
    setUser(loggedUser);
    if (loggedUser.lang) {
      setLang(loggedUser.lang);
    }
    refreshUser();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setUser(null);
    setAreas([]);
    setAlarmCount(0);
  };

  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';
  const isAuditor = user?.role === 'auditor';
  const isManager = user?.role === 'manager';

  const canAudit = (_areaId: number): boolean => {
    return isAdmin || isAuditor;
  };

  const canManage = (areaId: number): boolean => {
    if (isAdmin) return true;
    if (user?.role !== 'manager') return false;
    return areas.some((a) => a.area_id === areaId && a.role === 'manager');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        areas,
        loading,
        alarmCount,
        companyName,
        companyLogo,
        uiTheme,
        previewTheme,
        activeTheme,
        colorModeOverride,
        setPreviewTheme,
        updateUiTheme,
        setColorModeOverride,
        toggleColorMode,
        refreshAlarms,
        updateBranding,
        login,
        logout,
        refreshUser,
        isAdmin,
        isViewer,
        isAuditor,
        isManager,
        canAudit,
        canManage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
