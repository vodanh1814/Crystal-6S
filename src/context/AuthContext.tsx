import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { User, UserAreaAssignment } from '../api/types';
import { useI18n } from '../i18n/context';

interface AuthContextType {
  user: User | null;
  areas: UserAreaAssignment[];
  loading: boolean;
  alarmCount: number;
  companyName: string;
  companyLogo: string;
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
  const { setLang } = useI18n();

  // Fetch company branding settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{ settings: { company_name: string; company_logo: string } }>('/settings');
      if (res?.settings) {
        if (res.settings.company_name) setCompanyName(res.settings.company_name);
        if (res.settings.company_logo !== undefined) setCompanyLogo(res.settings.company_logo);
      }
    } catch {
      // Default to CRYSTAL if settings cannot be fetched
    }
  }, []);

  const updateBranding = async (name: string, logo: string) => {
    const finalName = name || 'CRYSTAL';
    const finalLogo = logo || '';
    setCompanyName(finalName);
    setCompanyLogo(finalLogo);
    await api.put('/settings', { company_name: finalName, company_logo: finalLogo });
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
