import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  ShieldCheck,
  Loader2,
  Upload,
  Trash2,
  Building2,
  Sun,
  Moon,
  Globe,
  Sliders,
  UserCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { fileToLogoDataUrl } from '../lib/imageCompression';
import { APP_VERSION } from '../version';

export const Setup: React.FC = () => {
  const { login, updateBranding, activeTheme, colorModeOverride, setColorModeOverride } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const isClassic = activeTheme === 'classic';
  const isGlass = activeTheme === 'crystal-glass';

  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState<boolean>(() => {
    if (!isClassic && colorModeOverride) {
      return colorModeOverride === 'dark';
    }
    return true;
  });

  useEffect(() => {
    const mode = dark ? 'dark' : 'light';
    document.documentElement.dataset.colorMode = mode;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (meta) meta.content = mode;
    return () => {
      if (meta && isClassic) meta.content = 'light dark';
    };
  }, [dark, isClassic]);

  const handleToggleDark = () => {
    const next = !dark;
    setDark(next);
    if (!isClassic) {
      setColorModeOverride(next ? 'dark' : 'light');
    }
  };

  // 1. Branding
  const [companyName, setCompanyName] = useState('CRYSTAL');
  const [companyLogo, setCompanyLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Factory Initial Config
  const [defaultTarget, setDefaultTarget] = useState<number>(90);
  const [seedSampleAreas, setSeedSampleAreas] = useState<boolean>(true);

  // 3. Admin Account
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('System Administrator');

  useEffect(() => {
    api
      .get<{ needsSetup: boolean; settings?: { company_name: string; company_logo: string } }>(
        '/auth/setup'
      )
      .then((res) => {
        if (!res.needsSetup) {
          navigate('/login');
        } else if (res.settings) {
          if (res.settings.company_name) setCompanyName(res.settings.company_name);
          if (res.settings.company_logo) setCompanyLogo(res.settings.company_logo);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [navigate]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const dataUrl = await fileToLogoDataUrl(file);
      setCompanyLogo(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to process logo image');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post<{ user: any }>('/auth/setup', {
        username,
        password,
        full_name: fullName,
        company_name: companyName.trim() || 'CRYSTAL',
        company_logo: companyLogo,
        default_target: defaultTarget,
        seed_sample_areas: seedSampleAreas,
        lang,
      });
      updateBranding(companyName.trim() || 'CRYSTAL', companyLogo);
      login(res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          dark ? (isClassic ? 'bg-slate-950' : 'bg-[#070b14]') : 'bg-slate-100'
        }`}
      >
        <Loader2
          className={`w-8 h-8 animate-spin ${
            isClassic ? 'text-emerald-500' : isGlass ? 'text-blue-500' : 'text-sky-500'
          }`}
        />
      </div>
    );
  }

  const outerBg = isClassic
    ? dark
      ? 'bg-slate-950'
      : 'bg-slate-100'
    : isGlass
    ? dark
      ? 'bg-[#060c1a]'
      : 'bg-[#eef4fb]'
    : dark
    ? 'bg-[#070b14]'
    : 'bg-[#f4f7fb]';

  const cardBg = isClassic
    ? dark
      ? 'bg-slate-900 border-slate-800 text-slate-100'
      : 'bg-white border-slate-200 text-slate-900'
    : isGlass
    ? dark
      ? 'bg-[#091226]/85 backdrop-blur-xl border-white/15 text-slate-100'
      : 'bg-white/85 backdrop-blur-xl border-blue-200/70 text-slate-900'
    : dark
    ? 'bg-[#0f1624] border-white/10 text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-900';

  const sectionBg = isClassic
    ? dark
      ? 'bg-slate-950/60 border-slate-800'
      : 'bg-slate-50 border-slate-200/80'
    : dark
    ? 'bg-[#080d18]/80 border-white/10'
    : 'bg-slate-50/80 border-slate-200/80';

  const inputBg = isClassic
    ? dark
      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:ring-emerald-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-emerald-500'
    : dark
    ? 'bg-[#0f1624] border-white/15 text-white placeholder-slate-500 focus:ring-sky-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-blue-500';

  const subText = dark ? 'text-slate-400' : 'text-slate-500';
  const labelText = dark ? 'text-slate-300' : 'text-slate-700';

  const accentHeadingCls = isClassic
    ? 'text-emerald-500'
    : isGlass
    ? dark
      ? 'text-sky-400'
      : 'text-blue-600'
    : dark
    ? 'text-sky-400'
    : 'text-sky-600';

  const heroBadgeCls = isClassic
    ? 'bg-emerald-600 shadow-emerald-500/30'
    : isGlass
    ? 'bg-linear-to-br from-blue-600 to-sky-500 shadow-blue-600/30'
    : 'bg-linear-to-br from-sky-500 to-blue-600 shadow-sky-500/30';

  const versionPillCls = isClassic
    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
    : isGlass
    ? dark
      ? 'bg-blue-500/20 border-blue-400/40 text-sky-300'
      : 'bg-blue-50 border-blue-200 text-blue-700'
    : dark
    ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
    : 'bg-sky-50 border-sky-200 text-sky-700';

  const sampleToggleActiveCls = isClassic
    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-500'
    : isGlass
    ? 'border-blue-500/50 bg-blue-500/15 text-blue-500'
    : 'border-sky-500/50 bg-sky-500/15 text-sky-500';

  const submitBtnCls = isClassic
    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
    : isGlass
    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
    : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/30';

  return (
    <div
      className={`min-h-screen w-full overflow-y-auto flex items-center justify-center p-4 transition-colors ${outerBg}`}
    >
      <div
        className={`w-full max-w-4xl rounded-3xl border shadow-2xl p-6 transition-colors ${cardBg}`}
      >
        {/* Top Header Bar: Title + Bilingual Switch + Light/Dark Switch */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-500/20">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0 ${heroBadgeCls}`}
            >
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{t('first_run_setup')}</h1>
                <span
                  className={`px-2 py-0.5 rounded-full border font-mono text-xs font-bold ${versionPillCls}`}
                >
                  v{APP_VERSION}
                </span>
              </div>
              <p className={`text-xs ${subText}`}>{t('setup_description')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bilingual Toggle (VI / EN) */}
            <button
              type="button"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                dark
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
              title="Switch Language (VI / EN)"
            >
              <Globe className={`w-3.5 h-3.5 ${accentHeadingCls}`} />
              <span>{lang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}</span>
            </button>

            {/* Theme Toggle (Light / Dark) */}
            <button
              type="button"
              onClick={handleToggleDark}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                dark
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-400'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Toggle Light / Dark Theme"
            >
              {dark ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Giao diện Tối' : 'Dark Mode'}</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>{lang === 'vi' ? 'Giao diện Sáng' : 'Light Mode'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Single-Screen 2-Column Configuration Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Column: 1. Branding & 2. Factory Parameters */}
          <div className="space-y-4">
            {/* Card 1: Company Branding */}
            <div className={`p-4 rounded-2xl border space-y-3 ${sectionBg}`}>
              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${accentHeadingCls}`}>
                <Building2 className="w-4 h-4" />
                <span>1. {t('company_branding')}</span>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${labelText}`}>
                  {t('company_name')}
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 text-sm ${inputBg}`}
                  placeholder="CRYSTAL"
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${labelText}`}>
                  {t('company_logo')}
                </label>
                <div className="flex items-center gap-3">
                  {companyLogo ? (
                    <div
                      className={`logo-well relative w-14 h-14 rounded-xl border bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm ${
                        isClassic ? 'border-emerald-500/40' : 'border-blue-500/40'
                      }`}
                    >
                      <img
                        src={companyLogo}
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setCompanyLogo('')}
                        className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow cursor-pointer transition"
                        title={t('remove_logo')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`w-14 h-14 rounded-xl border-2 border-dashed flex items-center justify-center shrink-0 ${
                        dark
                          ? 'border-slate-700 bg-slate-900 text-slate-500'
                          : 'border-slate-300 bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition ${
                        dark
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{companyLogo ? t('edit') : t('upload_logo')}</span>
                    </button>
                    <p className={`text-[11px] mt-1 leading-tight ${subText}`}>{t('logo_help')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Factory Initial Settings */}
            <div className={`p-4 rounded-2xl border space-y-3 ${sectionBg}`}>
              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${accentHeadingCls}`}>
                <Sliders className="w-4 h-4" />
                <span>
                  2. {lang === 'vi' ? 'Cấu hình Nhà máy & Khu vực' : 'Factory & Area Settings'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${labelText}`}>
                    {lang === 'vi' ? 'Chỉ tiêu KPI 5S (%)' : 'Default KPI Target (%)'}
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={defaultTarget}
                    onChange={(e) => setDefaultTarget(Number(e.target.value) || 90)}
                    className={`w-full px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 text-sm font-bold ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${labelText}`}>
                    {lang === 'vi' ? 'Dữ liệu Khu vực mẫu' : 'Sample Areas (16)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setSeedSampleAreas(!seedSampleAreas)}
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      seedSampleAreas
                        ? sampleToggleActiveCls
                        : dark
                        ? 'border-slate-700 bg-slate-900 text-slate-400'
                        : 'border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    {seedSampleAreas
                      ? lang === 'vi'
                        ? '✔ Giữ 16 khu vực mẫu'
                        : '✔ Keep 16 sample areas'
                      : lang === 'vi'
                      ? '✕ Xóa trống (Tự tạo mới)'
                      : '✕ Start empty (Custom)'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3. Initial Admin Account & Submit */}
          <div className="flex flex-col justify-between space-y-4">
            <div className={`p-4 rounded-2xl border space-y-3 flex-1 ${sectionBg}`}>
              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${accentHeadingCls}`}>
                <UserCheck className="w-4 h-4" />
                <span>
                  3.{' '}
                  {lang === 'vi'
                    ? 'Tài khoản Quản trị viên (Admin)'
                    : 'Administrator Account (Admin)'}
                </span>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${labelText}`}>
                  {t('full_name')}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 text-sm ${inputBg}`}
                  placeholder="System Administrator"
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${labelText}`}>
                  {t('username')}
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 text-sm ${inputBg}`}
                  placeholder="admin"
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${labelText}`}>
                  {t('password')}{' '}
                  <span className="opacity-60 font-normal">
                    ({lang === 'vi' ? 'tối thiểu 6 ký tự' : 'min 6 chars'})
                  </span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 text-sm ${inputBg}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm ${submitBtnCls}`}
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>
                {lang === 'vi'
                  ? '🚀 HOÀN TẤT CẤU HÌNH & VÀO HỆ THỐNG'
                  : '🚀 COMPLETE SETUP & LAUNCH SYSTEM'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
