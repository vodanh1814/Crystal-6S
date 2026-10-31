import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ShieldCheck, Loader2, Upload, Trash2, Building2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { fileToLogoDataUrl } from '../lib/imageCompression';

export const Setup: React.FC = () => {
  const { login, updateBranding } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Branding
  const [companyName, setCompanyName] = useState('CRYSTAL');
  const [companyLogo, setCompanyLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin Account
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    api.get<{ needsSetup: boolean; settings?: { company_name: string; company_logo: string } }>('/auth/setup')
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{t('first_run_setup')}</h2>
          <p className="text-xs text-slate-500">{t('setup_description')}</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Company Branding */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>{t('company_branding')}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('company_name')}
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 text-sm"
                placeholder="CRYSTAL"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('company_logo')}
              </label>
              <div className="flex items-center gap-3">
                {companyLogo ? (
                  <div className="relative w-16 h-16 rounded-xl border border-slate-300 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                    <img
                      src={companyLogo}
                      alt="Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setCompanyLogo('')}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-md cursor-pointer transition"
                      title={t('remove_logo')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    <Building2 className="w-6 h-6" />
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
                    className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{companyLogo ? t('edit') : t('upload_logo')}</span>
                  </button>
                  <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                    {t('logo_help')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Admin Account */}
          <div className="space-y-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t('role_admin')}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('full_name')}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 text-sm"
                placeholder="Administrator"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('username')}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 text-sm"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('password')} (min 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>{t('create')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
