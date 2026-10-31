import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogIn, Loader2, Globe, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';

export const Login: React.FC = () => {
  const { login, user, companyName, companyLogo } = useAuth();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/');
      return;
    }

    api.get<{ needsSetup: boolean }>('/auth/setup')
      .then((res) => {
        if (res.needsSetup) {
          navigate('/setup');
        }
      })
      .catch(() => {});
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post<{ user: any }>('/auth/login', {
        username,
        password,
      });
      login(res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative">
      {/* Back to Dashboard button in top left corner */}
      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('dashboard')}</span>
      </Link>

      {/* Language Switcher in top right corner */}
      <button
        onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span>{lang.toUpperCase()}</span>
      </button>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          {companyLogo ? (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shadow-md">
              <img
                src={companyLogo}
                alt={companyName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/30">
              5S
            </div>
          )}
          <h2 className="text-2xl font-bold text-slate-900">{companyName}</h2>
          <p className="text-xs text-slate-500 font-medium">{t('appTitle')} — {t('login_welcome')}</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('username')}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="username"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('password')}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            <span>{t('login')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
