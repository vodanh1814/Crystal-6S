import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Edit2,
  Loader2,
  Plus,
  Save,
  Building2,
  Upload,
  Trash2,
  CheckCircle2,
  RefreshCw,
  ArrowUpCircle,
  GitBranch,
  ShieldAlert,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { Modal } from '../components/Modal';
import { fileToLogoDataUrl } from '../lib/imageCompression';
import { APP_VERSION, APP_RELEASE_DATE, GITHUB_REPO, GITHUB_REPO_URL } from '../version';
import type { YearlyTarget } from '../api/types';

export const AdminTargets: React.FC = () => {
  const { t } = useI18n();
  const { isAdmin, companyName, companyLogo, updateBranding } = useAuth();

  // ── 1. System Version & Admin-Only Git Auto-Update State ──
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    current_version: string;
    latest_version: string;
    current_commit?: string;
    latest_commit?: string;
    has_update: boolean;
    changelog?: string;
    mode?: string;
    checked_at?: string;
    notice?: string;
    error?: string;
  } | null>(null);
  const [updateLog, setUpdateLog] = useState<string>('');
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);

  const checkGitUpdate = useCallback(async () => {
    if (!isAdmin) return;
    setCheckingUpdate(true);
    setUpdateError(null);
    try {
      const res = await api
        .get<any>('/settings/local-update-check')
        .catch(() => api.get<any>('/settings/update-check'));
      setUpdateInfo(res);
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to check for updates');
    } finally {
      setCheckingUpdate(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    checkGitUpdate();
  }, [checkGitUpdate]);

  const handleApplyAutoUpdate = async () => {
    if (!isAdmin) return;
    setApplyingUpdate(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    const isCloud = updateInfo?.mode === 'cloud_worker';
    setUpdateLog(
      isCloud
        ? '▶ Đang gửi lệnh kích hoạt CI/CD Auto-Update lên GitHub Actions & Cloudflare...'
        : '▶ Đang chạy quy trình cập nhật an toàn 5 bước (Preflight -> Backup -> Fast-Forward -> Migration Verify)...'
    );

    try {
      const endpoint = isCloud ? '/settings/cloud-update-apply' : '/settings/local-update-apply';
      const res = await api
        .post<{
          ok: boolean;
          previous_version: string;
          new_version: string;
          log: string;
        }>(endpoint, {})
        .catch(async (primaryErr) => {
          if (!isCloud && primaryErr?.status === 404) {
            return await api.post<{
              ok: boolean;
              previous_version: string;
              new_version: string;
              log: string;
            }>('/settings/cloud-update-apply', {});
          }
          throw primaryErr;
        });

      setUpdateLog(res.log || '✔ Đã cập nhật thành công!');
      setUpdateSuccess(t('update_success_msg', { v: res.new_version || APP_VERSION }));
      if (!isCloud) {
        setTimeout(() => {
          window.location.reload();
        }, 2500);
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Auto-update failed');
    } finally {
      setApplyingUpdate(false);
    }
  };

  // ── 2. Branding State ──
  const [brandName, setBrandName] = useState(companyName);
  const [brandLogo, setBrandLogo] = useState(companyLogo);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSuccess, setBrandSuccess] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBrandName(companyName);
    setBrandLogo(companyLogo);
  }, [companyName, companyLogo]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const dataUrl = await fileToLogoDataUrl(file);
      setBrandLogo(dataUrl);
    } catch (err: any) {
      setBrandError(err.message || 'Failed to process logo image');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandSaving(true);
    setBrandSuccess(false);
    setBrandError(null);
    try {
      await updateBranding(brandName.trim() || 'CRYSTAL', brandLogo);
      setBrandSuccess(true);
      setTimeout(() => setBrandSuccess(false), 3500);
    } catch (err: any) {
      setBrandError(err.message || 'Failed to update branding');
    } finally {
      setBrandSaving(false);
    }
  };

  // ── 3. Yearly Targets State ──
  const [targets, setTargets] = useState<YearlyTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [targetScore, setTargetScore] = useState(95);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ targets: YearlyTarget[] }>('/targets');
      setTargets(res.targets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const openModal = (initialYear?: number, initialTarget?: number) => {
    setYear(initialYear || new Date().getFullYear());
    setTargetScore(initialTarget !== undefined ? initialTarget : 95);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.put(`/targets/${year}`, { target: targetScore });
      setModalOpen(false);
      await fetchTargets();
    } catch (err: any) {
      setError(err.message || 'Failed to save target');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  const currentVer = updateInfo?.current_version || APP_VERSION;
  const latestVer = updateInfo?.latest_version || APP_VERSION;
  const hasNewUpdate = Boolean(updateInfo?.has_update);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* SECTION 1: SYSTEM VERSION & ADMIN-ONLY GIT AUTO-UPDATE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-emerald-500 to-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm font-black text-sm">
              v{currentVer}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {t('system_version_title')}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold font-mono">
                  v{currentVer} ({APP_RELEASE_DATE})
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {t('system_version_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChangelog(!showChangelog)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('view_changelog')}</span>
            </button>

            <button
              type="button"
              onClick={checkGitUpdate}
              disabled={checkingUpdate || applyingUpdate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? t('checking_updates') : t('check_for_updates')}</span>
            </button>
          </div>
        </div>

        {/* Version Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('current_version_label')}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black font-mono text-slate-900">v{currentVer}</span>
              {updateInfo?.current_commit && (
                <span className="text-xs font-mono text-slate-500">
                  ({updateInfo.current_commit})
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('latest_git_version')}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-xl font-black font-mono ${
                  hasNewUpdate ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                v{latestVer}
              </span>
              {updateInfo?.latest_commit && (
                <span className="text-xs font-mono text-slate-500">
                  ({updateInfo.latest_commit})
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Git Repository
            </div>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline truncate"
            >
              <GitBranch className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{GITHUB_REPO}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        {/* Status Banner & One-Click Auto-Update Action */}
        {hasNewUpdate ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ArrowUpCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <div className="text-sm font-black text-amber-900">
                  {t('new_version_found_msg', { v: latestVer })}
                </div>
                <div className="text-xs text-amber-700 mt-0.5">
                  Tự động tải mã nguồn mới từ Git, cài đặt thư viện và nâng cấp Database D1 an toàn (giữ nguyên 100% dữ liệu).
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyAutoUpdate}
              disabled={applyingUpdate}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 transition"
            >
              {applyingUpdate ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="w-4 h-4" />
              )}
              <span>
                {applyingUpdate
                  ? t('updating_system')
                  : t('auto_update_now_btn', { v: latestVer })}
              </span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {t('up_to_date_msg')} (v{currentVer})
              </span>
            </div>

            {updateInfo?.mode === 'local_git' && (
              <button
                type="button"
                onClick={handleApplyAutoUpdate}
                disabled={applyingUpdate}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
              >
                {applyingUpdate ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Đồng bộ lại từ Git (Force Sync)</span>
              </button>
            )}
          </div>
        )}

        {updateSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{updateSuccess}</span>
          </div>
        )}

        {updateError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {updateError}
          </div>
        )}

        {updateLog && (
          <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-48">
            {updateLog}
          </pre>
        )}

        {showChangelog && updateInfo?.changelog && (
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              CHANGELOG.md ({GITHUB_REPO})
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap overflow-y-auto max-h-64 text-slate-300 leading-relaxed">
              {updateInfo.changelog}
            </pre>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{t('admin_only_update_note')}</span>
        </div>
      </div>

      {/* SECTION 2: COMPANY BRANDING */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {t('company_branding')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">{t('company_branding_desc')}</p>
            </div>
          </div>
        </div>

        {brandSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{t('branding_updated')}</span>
          </div>
        )}

        {brandError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {brandError}
          </div>
        )}

        <form onSubmit={handleSaveBranding} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t('company_name')}
              </label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-bold text-sm"
                placeholder="CRYSTAL"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Hiển thị trên Header, Login, Sidebar, Page Title.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t('company_logo')}
              </label>
              <div className="flex items-center gap-3">
                {brandLogo ? (
                  <div className="relative w-16 h-16 rounded-xl border border-slate-300 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                    <img
                      src={brandLogo}
                      alt="Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setBrandLogo('')}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-md cursor-pointer transition"
                      title={t('remove_logo')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{brandLogo ? t('edit') : t('upload_logo')}</span>
                  </button>
                  <p className="text-[11px] text-slate-500 mt-1 leading-tight">{t('logo_help')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={brandSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {brandSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{t('save_branding')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: YEARLY TARGETS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {t('admin_targets_title')}
            </h1>
            <p className="text-xs text-slate-500 font-medium">{t('targets_subtitle')}</p>
          </div>

          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('create')}</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">{t('year')}</th>
                  <th className="py-3.5 px-4">{t('target_score')}</th>
                  <th className="py-3.5 px-4 text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targets.map((tgt) => (
                  <tr key={tgt.year} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">{tgt.year}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 text-base">
                      {tgt.target}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openModal(tgt.year, tgt.target)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{t('edit')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Set Target */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('admin_targets_title')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('year')}
            </label>
            <input
              type="number"
              required
              min={2020}
              max={2050}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('target_score')} (%)
            </label>
            <input
              type="number"
              step="0.5"
              min={0}
              max={100}
              required
              value={targetScore}
              onChange={(e) => setTargetScore(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{t('save')}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
