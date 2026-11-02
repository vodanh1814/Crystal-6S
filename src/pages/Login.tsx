import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogIn, Loader2, Globe, ArrowLeft, Sun, Moon } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { APP_VERSION, APP_COPYRIGHT } from '../version';

export const Login: React.FC = () => {
  const { login, user, companyName, companyLogo } = useAuth();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const [dark, setDark] = useState(true);

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
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative transition-colors ${
        dark ? 'bg-slate-950' : 'bg-slate-100'
      }`}
    >
      {/* Back to Dashboard button in top left corner */}
      <Link
        to="/"
        className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
          dark
            ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
            : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('dashboard')}</span>
      </Link>

      {/* Language & Theme Switchers in top right corner */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
            dark
              ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
              : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800 shadow-xs'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-500" />
          <span>{lang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
        </button>

        <button
          onClick={() => setDark(!dark)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
            dark
              ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400'
              : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs'
          }`}
        >
          {dark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span>{dark ? 'Dark' : 'Light'}</span>
        </button>
      </div>

      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 transition-colors ${
          dark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="text-center space-y-2">
          {companyLogo && !logoBroken ? (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-md">
              <img
                src={companyLogo}
                alt={companyName}
                onError={() => setLogoBroken(true)}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-sky-600 text-white mx-auto flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/30">
              5S
            </div>
          )}
          <h2 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
            {companyName}
          </h2>
          <p className={`text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('appTitle')} — {t('login_welcome')} · <span className="font-mono font-bold text-emerald-500">v{APP_VERSION}</span>
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                dark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              {t('username')}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                dark
                  ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              placeholder="username"
            />
          </div>

          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                dark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              {t('password')}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                dark
                  ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            <span>{t('login')}</span>
          </button>
        </form>

        <div
          className={`mt-6 text-center text-xs font-mono ${
            dark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          {APP_COPYRIGHT}
        </div>
      </div>
    </div>
  );
};
