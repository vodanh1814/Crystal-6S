import React, { useState } from 'react';
import { User, Key, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';

export const Profile: React.FC = () => {
  const { user, areas } = useAuth();
  const { lang, setLang, t } = useI18n();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError(t('password_mismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('password_min_length'));
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(t('password_change_success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLangToggle = async (newLang: 'vi' | 'en') => {
    setLang(newLang);
    try {
      await api.put('/auth/lang', { lang: newLang });
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('profile')}</h1>
        <p className="text-sm text-slate-500 font-medium">{t('profile_subtitle')}</p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">{user?.full_name}</h2>
            <p className="text-xs text-slate-400 font-mono">@{user?.username} · Role: <span className="uppercase font-semibold text-slate-700">{user?.role}</span></p>
          </div>
        </div>

        {/* Assigned Areas (if not admin) */}
        {user?.role !== 'admin' && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('assigned_areas_label')}
            </span>
            {user?.role === 'auditor' ? (
              <p className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg inline-block">
                Toàn nhà máy (Auditor — Đi chấm 5S & Verify giải quyết lỗi tất cả khu vực)
              </p>
            ) : areas.length === 0 ? (
              <p className="text-xs text-slate-400 italic">{t('no_assigned_areas')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"
                  >
                    {a.area_code} (Area MNG)
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Language Preference Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Globe className="w-4 h-4 text-slate-500" />
          <span>{t('lang_toggle')}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleLangToggle('vi')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              lang === 'vi'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Tiếng Việt (VI)
          </button>
          <button
            onClick={() => handleLangToggle('en')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              lang === 'en'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            English (EN)
          </button>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Key className="w-4 h-4 text-slate-500" />
          <span>{t('change_password')}</span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('current_password')}
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('new_password')}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('confirm_new_password')}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{t('save')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
