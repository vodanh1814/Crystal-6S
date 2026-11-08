import React from 'react';
import {
  ShieldCheck,
  ExternalLink,
  Lock,
  Layers,
  Cpu,
  Database,
  Cloud,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { Modal } from './Modal';
import {
  APP_VERSION,
  APP_RELEASE_DATE,
  APP_AUTHOR,
  APP_AUTHOR_GITHUB,
  APP_COPYRIGHT,
  GITHUB_REPO,
  GITHUB_REPO_URL,
} from '../version';
import { useI18n } from '../i18n/context';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  companyName = 'CRYSTAL',
}) => {
  const { t } = useI18n();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="lg">
      <div className="space-y-6 text-slate-800 -mt-2">
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white border border-emerald-500/30 shadow-lg">
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <ShieldCheck className="w-48 h-48 text-emerald-400" />
          </div>

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>v{APP_VERSION} · {APP_RELEASE_DATE}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Crystal 5S Audit
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-md leading-relaxed">
                {t('about_app_desc')}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Protected Author & Copyright Card */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/60 p-4 sm:p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  {t('author')} & {t('copyright')}
                </span>
                <div className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>{APP_AUTHOR}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-bold font-mono">
                    {t('protected_copyright')}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs font-mono font-bold text-slate-600">
              {APP_COPYRIGHT}
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">
            {t('about_app_note')}
          </p>

          {/* Direct GitHub Contact Actions */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
            <a
              href={APP_AUTHOR_GITHUB}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700/80 shadow-md transition cursor-pointer"
            >
              <GithubIcon className="w-4 h-4 text-emerald-400" />
              <span>{t('contact_author_github')}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>{GITHUB_REPO}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* System Architecture Highlights */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-600" />
            <span>{t('system_architecture')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Cloud className="w-4 h-4 text-sky-600" />
                <span>Cloudflare Workers</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {t('about_feature_edge')}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>D1 Database</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {t('about_feature_d1')}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Cloudflare R2</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {t('about_feature_r2')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{companyName} Smart Factory Andon System</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
