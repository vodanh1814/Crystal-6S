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
  FileSpreadsheet,
  ExternalLink,
  Cloud,
  Database,
  HardDrive,
  Globe,
  Activity,
  Key,
  Settings2,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Download,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { Modal } from '../components/Modal';
import { fileToLogoDataUrl } from '../lib/imageCompression';
import {
  APP_VERSION,
  APP_RELEASE_DATE,
  APP_AUTHOR,
  APP_AUTHOR_GITHUB,
  APP_COPYRIGHT,
  GITHUB_REPO,
  GITHUB_REPO_URL,
} from '../version';
import type { YearlyTarget } from '../api/types';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

interface CfStatusData {
  connected: boolean;
  mode: 'cloud_worker' | 'local_emulation';
  account: {
    id_masked: string;
    name: string;
    plan: string;
    has_token: boolean;
  };
  domains: {
    worker_subdomain: string;
    worker_url: string;
    custom_domain: string | null;
    custom_domain_url: string | null;
    ssl_active: boolean;
  };
  quotas: {
    workers_requests_daily: {
      used: number;
      limit: number;
      percent: number;
      unit: string;
      status: 'safe' | 'warning' | 'danger';
    };
    d1_storage: {
      used: number;
      limit: number;
      percent: number;
      unit: string;
      status: 'safe' | 'warning' | 'danger';
    };
    d1_reads_daily: {
      used: number;
      limit: number;
      percent: number;
      unit: string;
      status: 'safe' | 'warning' | 'danger';
    };
    d1_writes_daily: {
      used: number;
      limit: number;
      percent: number;
      unit: string;
      status: 'safe' | 'warning' | 'danger';
    };
    r2_storage: {
      used: number;
      limit: number;
      percent: number;
      unit: string;
      status: 'safe' | 'warning' | 'danger';
    };
    r2_photos_count: number;
    r2_estimated_capacity_photos: number;
  };
  details: {
    d1_database_name: string;
    d1_database_id_masked: string;
    r2_bucket_name: string;
    worker_name: string;
    total_db_rows: number;
    activity_count_today: number;
  };
  last_checked: string;
  error?: string;
}

export const AdminTargets: React.FC = () => {
  const { t, lang } = useI18n();
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
    has_github_token?: boolean;
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
  const [showTokenConfig, setShowTokenConfig] = useState(false);
  const [ghTokenInput, setGhTokenInput] = useState('');
  const [savingGhToken, setSavingGhToken] = useState(false);
  const [ghTokenSuccess, setGhTokenSuccess] = useState<string | null>(null);
  const [ghTokenError, setGhTokenError] = useState<string | null>(null);

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

  const handleSaveGhToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGhToken(true);
    setGhTokenSuccess(null);
    setGhTokenError(null);
    try {
      await api.put('/settings', { github_token: ghTokenInput.trim() });
      setGhTokenSuccess(
        ghTokenInput.trim()
          ? 'Đã lưu và mã hóa GitHub Token thành công!'
          : 'Đã xóa cấu hình GitHub Token (chuyển sang chế độ Public).'
      );
      setGhTokenInput('');
      await checkGitUpdate();
      setTimeout(() => setGhTokenSuccess(null), 3500);
    } catch (err: any) {
      setGhTokenError(err.message || 'Lỗi khi lưu GitHub Token');
    } finally {
      setSavingGhToken(false);
    }
  };

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

  // ── 4. Demo Data Stats & Cleanup State ──
  const [demoStats, setDemoStats] = useState<{
    audits_count: number;
    findings_count: number;
    photos_count: number;
    historical_scores_count: number;
    areas_count: number;
    has_demo_data: boolean;
  } | null>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearAreasChecked, setClearAreasChecked] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [clearingDemo, setClearingDemo] = useState(false);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  const fetchDemoStats = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get<any>('/settings/demo-stats');
      setDemoStats(res);
    } catch (err: any) {
      console.warn('Failed to load demo stats:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchDemoStats();
  }, [fetchDemoStats]);

  const handleClearDemoData = async () => {
    if (!isAdmin) return;
    setClearingDemo(true);
    setClearError(null);
    setClearSuccess(null);
    try {
      const res = await api.post<{
        ok: boolean;
        message: string;
        cleared_areas: boolean;
        photos_deleted: number;
      }>('/settings/clear-demo-data', {
        clear_areas: clearAreasChecked,
      });
      setClearSuccess(res.message || t('clear_demo_success'));
      setClearModalOpen(false);
      setConfirmKeyword('');
      setClearAreasChecked(false);
      await fetchDemoStats();
      setTimeout(() => setClearSuccess(null), 6000);
    } catch (err: any) {
      setClearError(err.message || 'Failed to clear demo data');
    } finally {
      setClearingDemo(false);
    }
  };

  // ── 5. Cloudflare & Free Tier Monitoring State ──
  const [cfStatus, setCfStatus] = useState<CfStatusData | null>(null);
  const [loadingCfStatus, setLoadingCfStatus] = useState(false);
  const [cfModalOpen, setCfModalOpen] = useState(false);
  const [cfAccountIdInput, setCfAccountIdInput] = useState('');
  const [cfApiTokenInput, setCfApiTokenInput] = useState('');
  const [cfWorkerNameInput, setCfWorkerNameInput] = useState('');
  const [cfCustomDomainInput, setCfCustomDomainInput] = useState('');
  const [testingCfConn, setTestingCfConn] = useState(false);
  const [savingCfConfig, setSavingCfConfig] = useState(false);
  const [cfModalMessage, setCfModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cfSuccessBanner, setCfSuccessBanner] = useState<string | null>(null);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [predictedNewUrl, setPredictedNewUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showCustomDomainGuide, setShowCustomDomainGuide] = useState(false);

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      const res = await fetch('/api/settings/export-backup', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Lỗi tải backup: HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const dateStr = new Date().toISOString().slice(0, 10);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crystal5s_backup_${dateStr}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Không thể tải bản sao lưu');
    } finally {
      setDownloadingBackup(false);
    }
  };

  const copyPredictedUrl = () => {
    if (!predictedNewUrl) return;
    navigator.clipboard.writeText(predictedNewUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const fetchCfStatus = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingCfStatus(true);
    try {
      const res = await api.get<CfStatusData>('/settings/cloudflare-status');
      setCfStatus(res);
    } catch (err: any) {
      console.warn('Failed to load Cloudflare status:', err);
    } finally {
      setLoadingCfStatus(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchCfStatus();
  }, [fetchCfStatus]);

  const openCfModal = () => {
    if (cfStatus) {
      setCfWorkerNameInput(cfStatus.details.worker_name || '5s-audit');
      setCfCustomDomainInput(cfStatus.domains.custom_domain || '');
    }
    setCfAccountIdInput('');
    setCfApiTokenInput('');
    setPredictedNewUrl(null);
    setCopiedUrl(false);
    setCfModalMessage(null);
    setCfModalOpen(true);
  };

  const handleTestCfConnection = async () => {
    setTestingCfConn(true);
    setCfModalMessage(null);
    try {
      const res = await api.post<{
        ok: boolean;
        message: string;
        account_name?: string;
        plan?: string;
        predicted_worker_url?: string | null;
      }>(
        '/settings/cloudflare-test',
        {
          account_id: cfAccountIdInput.trim(),
          api_token: cfApiTokenInput.trim(),
          worker_name: cfWorkerNameInput.trim() || undefined,
        }
      );
      if (res.predicted_worker_url) {
        setPredictedNewUrl(res.predicted_worker_url);
      }
      setCfModalMessage({
        type: 'success',
        text: `${res.message} (${res.account_name || 'Cloudflare'} - ${res.plan || 'Free Tier'})`,
      });
    } catch (err: any) {
      setCfModalMessage({
        type: 'error',
        text: err.message || 'Không thể xác thực với Cloudflare API',
      });
    } finally {
      setTestingCfConn(false);
    }
  };

  const handleSaveCfConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCfConfig(true);
    setCfModalMessage(null);
    try {
      await api.put('/settings/cloudflare-config', {
        account_id: cfAccountIdInput.trim() || undefined,
        api_token: cfApiTokenInput.trim() || undefined,
        worker_name: cfWorkerNameInput.trim() || undefined,
        custom_domain: cfCustomDomainInput.trim() || undefined,
      });
      setCfModalOpen(false);
      setCfSuccessBanner(t('cf_saved_success'));
      setTimeout(() => setCfSuccessBanner(null), 5000);
      await fetchCfStatus();
    } catch (err: any) {
      setCfModalMessage({
        type: 'error',
        text: err.message || 'Lỗi khi lưu cấu hình Cloudflare',
      });
    } finally {
      setSavingCfConfig(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  const currentVer = updateInfo?.current_version || APP_VERSION;
  const latestVer = updateInfo?.latest_version || APP_VERSION;
  const hasNewUpdate = Boolean(updateInfo?.has_update);
  const isCloud = updateInfo?.mode === 'cloud_worker';

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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowTokenConfig(!showTokenConfig)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span>{showTokenConfig ? 'Ẩn cấu hình Token' : 'Cấu hình Token'}</span>
            </button>

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

        {showTokenConfig && (
          <form
            onSubmit={handleSaveGhToken}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Cấu hình GitHub Personal Access Token (PAT)
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  updateInfo?.has_github_token
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {updateInfo?.has_github_token ? 'Đã cấu hình Token' : 'Chưa cấu hình (Chế độ Public)'}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div>
                • <strong>Môi trường Local / Mạng LAN:</strong> Không cần Token khi repo là Public — hệ thống tự động kiểm tra và đồng bộ trực tiếp từ GitHub của Simon.
              </div>
              <div>
                • <strong>Nền tảng Cloudflare Workers:</strong> Cần Personal Access Token (PAT) có quyền <code>workflow</code> nếu muốn kích hoạt GitHub Actions Deploy tự động từ giao diện web này.
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={ghTokenInput}
                onChange={(e) => setGhTokenInput(e.target.value)}
                placeholder={
                  updateInfo?.has_github_token
                    ? '•••••••••••••••• (Nhập token mới hoặc để trống để gỡ)'
                    : 'ghp_... hoặc github_pat_...'
                }
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={savingGhToken}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {savingGhToken ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{savingGhToken ? 'Đang lưu...' : 'Lưu Token'}</span>
                </button>
                {updateInfo?.has_github_token && (
                  <button
                    type="button"
                    disabled={savingGhToken}
                    onClick={async () => {
                      setSavingGhToken(true);
                      try {
                        await api.put('/settings', { github_token: '' });
                        setGhTokenSuccess('Đã gỡ bỏ GitHub Token thành công.');
                        await checkGitUpdate();
                        setTimeout(() => setGhTokenSuccess(null), 3000);
                      } catch (err: any) {
                        setGhTokenError(err.message || 'Lỗi khi gỡ Token');
                      } finally {
                        setSavingGhToken(false);
                      }
                    }}
                    className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"
                  >
                    Gỡ Token
                  </button>
                )}
              </div>
            </div>
            {ghTokenSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{ghTokenSuccess}</span>
              </div>
            )}
            {ghTokenError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold">
                {ghTokenError}
              </div>
            )}
          </form>
        )}

        {/* Version Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('current_version_label')}
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isCloud
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isCloud ? 'Cloudflare Edge' : 'Local / Mạng LAN'}
              </span>
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

        {/* Status Banner & Multi-Environment Auto-Update Action */}
        {hasNewUpdate ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <ArrowUpCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <div className="text-sm font-black text-amber-900">
                    {t('new_version_found_msg', { v: latestVer })}
                  </div>
                  <div className="text-xs text-amber-800 mt-0.5">
                    {isCloud
                      ? 'Bản cập nhật mới trên GitHub của Simon đã sẵn sàng để triển khai lên Cloudflare Workers.'
                      : 'Tự động tải mã nguồn mới từ Git, cài đặt thư viện và nâng cấp cơ sở dữ liệu an toàn (giữ nguyên 100% dữ liệu).'}
                  </div>
                </div>
              </div>

              {!isCloud ? (
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
              ) : updateInfo?.has_github_token ? (
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
                      ? 'Đang kích hoạt CI/CD Deploy...'
                      : `Kích hoạt Auto-Deploy GitHub Actions (v${latestVer})`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTokenConfig(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md shadow-amber-600/25 flex items-center justify-center gap-2 shrink-0 cursor-pointer transition"
                >
                  <Key className="w-4 h-4" />
                  <span>Cấu hình Token để bật Auto-Deploy</span>
                </button>
              )}
            </div>

            {/* Cloudflare Guide Notice when token is missing */}
            {isCloud && !updateInfo?.has_github_token && (
              <div className="pt-3 border-t border-amber-200/80 text-xs text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-700" />
                  <span>Hướng dẫn 2 cách cập nhật lên Cloudflare cho Nhà máy:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 space-y-1">
                    <span className="font-bold text-slate-800">⚡ Cách 1: Deploy trực tiếp từ máy tính (Khuyên dùng)</span>
                    <p className="text-slate-600">
                      Mở terminal trên máy tính kỹ thuật và chạy lệnh: <code className="px-1 py-0.5 rounded bg-slate-100 font-mono text-emerald-700 font-bold">npx wrangler deploy</code>. Bản mới sẽ lên sóng trong 15 giây mà không cần token.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 space-y-1">
                    <span className="font-bold text-slate-800">🤖 Cách 2: Tự động qua GitHub Actions CI/CD</span>
                    <p className="text-slate-600">
                      Nhập GitHub Personal Access Token (quyền <code className="px-1 py-0.5 rounded bg-slate-100 font-mono text-indigo-700">workflow</code>) vào ô cấu hình bên trên để mở khóa nút bấm Auto-Deploy 1-click từ giao diện web.
                    </p>
                  </div>
                </div>
              </div>
            )}
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

        {updateInfo?.notice && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">{updateInfo.notice}</span>
              <div className="text-[11px] text-amber-700">
                Nếu kho lưu trữ đã chuyển sang <strong>Public</strong>, hệ thống sẽ tự động cập nhật trực tiếp. Nếu là <strong>Private</strong>, hãy bấm nút <strong>Cấu hình Token</strong> ở trên để nhập GitHub PAT.
              </div>
            </div>
          </div>
        )}

        {updateInfo?.error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{updateInfo.error}</span>
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

      {/* SECTION 2: CLOUDFLARE INFRASTRUCTURE & FREE TIER MONITORING */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {t('cf_monitoring_title')}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold">
                  {cfStatus?.account.plan || t('cf_plan_badge')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {t('cf_zero_cost_badge')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {t('cf_monitoring_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              title="Tải bản sao lưu toàn bộ dữ liệu (Audits, Lỗi 5S, Tiêu chí, Điểm...) dạng SQL"
            >
              <Download className={`w-3.5 h-3.5 text-slate-600 ${downloadingBackup ? 'animate-bounce' : ''}`} />
              <span>{downloadingBackup ? t('cf_downloading_backup') : t('cf_download_backup_btn')}</span>
            </button>

            <button
              type="button"
              onClick={fetchCfStatus}
              disabled={loadingCfStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCfStatus ? 'animate-spin' : ''}`} />
              <span>{t('cf_refresh_btn')}</span>
            </button>

            <button
              type="button"
              onClick={openCfModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-sm shadow-sky-600/20 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{t('cf_switch_account_btn')}</span>
            </button>
          </div>
        </div>

        {cfSuccessBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{cfSuccessBanner}</span>
          </div>
        )}

        {/* Account & Domains Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Account Details */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                {t('cf_account_name')}
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                {cfStatus?.account.id_masked || 'cf-account-id'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-base font-black text-slate-900">
                {cfStatus?.account.name || 'Crystal 5S Audit'}
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {cfStatus?.mode === 'cloud_worker' ? 'Cloudflare Workers (Edge)' : 'Local Emulation'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-600">Database:</span> {cfStatus?.details.d1_database_name} • <span className="font-semibold text-slate-600">Bucket:</span> {cfStatus?.details.r2_bucket_name}
            </div>
          </div>

          {/* Card B: Routing & Domains */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                {t('cf_default_domain')}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600" />
                {t('cf_ssl_active')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <a
                href={cfStatus?.domains.worker_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-bold text-sky-700 hover:text-sky-800 hover:underline truncate flex items-center gap-1"
              >
                <span>{cfStatus?.domains.worker_subdomain || '5s-audit.workers.dev'}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
            <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 flex items-center justify-between">
              <span className="font-semibold text-slate-500">{t('cf_custom_domain')}:</span>
              {cfStatus?.domains.custom_domain ? (
                <a
                  href={cfStatus.domains.custom_domain_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>{cfStatus.domains.custom_domain}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="italic text-slate-400">{t('cf_custom_domain_not_set')}</span>
              )}
            </div>

            <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setShowCustomDomainGuide(!showCustomDomainGuide)}
                className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 hover:underline font-bold cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{showCustomDomainGuide ? 'Ẩn hướng dẫn gắn tên miền' : 'Cách gắn tên miền riêng công ty (5s.congty.com)'}</span>
              </button>
            </div>

            {showCustomDomainGuide && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                <div className="font-bold text-slate-800">Hướng dẫn 3 bước gắn Tên miền riêng (Miễn phí 100%):</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Vào Cloudflare Dashboard &gt; Workers &gt; Chọn Worker &gt; Tab <strong>Settings</strong> &gt; <strong>Domains & Routes</strong>.</li>
                  <li>Bấm <strong>Add Custom Domain</strong> &gt; Nhập tên miền (vd: <code>5s.nhamaycrystal.vn</code>) &gt; Bấm Add. Cloudflare tự cấp SSL xanh trong 30 giây.</li>
                  <li>Bấm <strong>Cấu hình / Đổi tài khoản</strong> bên trên &gt; Nhập tên miền đó vào ô Custom Domain &gt; Lưu cấu hình.</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Free Tier Quota Gauges (3 Progress Bars) */}
        <div className="space-y-4">
          <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span>Tiêu chuẩn Hạn ngạch Free Tier & Mức dùng hiện tại</span>
            <span className="text-[11px] font-bold text-slate-400 lowercase">cập nhật lúc {cfStatus?.last_checked ? new Date(cfStatus.last_checked).toLocaleTimeString() : 'mới đây'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1: Workers Requests */}
            {cfStatus?.quotas && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-sky-600" />
                    {t('cf_workers_quota')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black font-mono ${
                    cfStatus.quotas.workers_requests_daily.status === 'danger'
                      ? 'bg-rose-100 text-rose-800'
                      : cfStatus.quotas.workers_requests_daily.status === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {cfStatus.quotas.workers_requests_daily.percent}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cfStatus.quotas.workers_requests_daily.status === 'danger'
                        ? 'bg-rose-500'
                        : cfStatus.quotas.workers_requests_daily.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(1, cfStatus.quotas.workers_requests_daily.percent))}%` }}
                  />
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-slate-900 font-mono">
                    {cfStatus.quotas.workers_requests_daily.used.toLocaleString()} req
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Hạn mức: 100,000 / ngày
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Tự động làm mới mỗi 00:00 UTC. Thời gian CPU tối đa: 10ms.
                </p>
              </div>
            )}

            {/* Metric 2: D1 Database */}
            {cfStatus?.quotas && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-600" />
                    {t('cf_d1_quota')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black font-mono ${
                    cfStatus.quotas.d1_storage.status === 'danger'
                      ? 'bg-rose-100 text-rose-800'
                      : cfStatus.quotas.d1_storage.status === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {cfStatus.quotas.d1_storage.percent}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cfStatus.quotas.d1_storage.status === 'danger'
                        ? 'bg-rose-500'
                        : cfStatus.quotas.d1_storage.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(1, cfStatus.quotas.d1_storage.percent))}%` }}
                  />
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-slate-900 font-mono">
                    {cfStatus.quotas.d1_storage.used} MB
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Hạn mức: 500 MB / DB
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Đọc: ~{cfStatus.quotas.d1_reads_daily.used} / 5M • Ghi: ~{cfStatus.quotas.d1_writes_daily.used} / 100k / ngày
                </p>
              </div>
            )}

            {/* Metric 3: R2 Storage */}
            {cfStatus?.quotas && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    {t('cf_r2_quota')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black font-mono ${
                    cfStatus.quotas.r2_storage.status === 'danger'
                      ? 'bg-rose-100 text-rose-800'
                      : cfStatus.quotas.r2_storage.status === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {cfStatus.quotas.r2_storage.percent}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cfStatus.quotas.r2_storage.status === 'danger'
                        ? 'bg-rose-500'
                        : cfStatus.quotas.r2_storage.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(1, cfStatus.quotas.r2_storage.percent))}%` }}
                  />
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-slate-900 font-mono">
                    {cfStatus.quotas.r2_storage.used} GB
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Hạn mức: 10 GB (Free trọn đời)
                  </span>
                </div>
                <p className="text-[10px] text-emerald-600 font-medium leading-tight">
                  {cfStatus.quotas.r2_photos_count} ảnh • {t('cf_estimated_photos', { n: cfStatus.quotas.r2_estimated_capacity_photos.toLocaleString() })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tip / Note on 0-cost operations */}
        <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-start gap-2.5 text-xs text-sky-900">
          <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {t('cf_storage_cost_note')}
          </p>
        </div>
      </div>

      {/* SECTION 3: COMPANY BRANDING */}
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

        {/* Protected Copyright & Author Card (Simon - Locked) */}
        <div className="pt-4 border-t border-slate-200/80">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Lock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">
                    {t('protected_copyright')}: <span className="text-emerald-700 font-black">{APP_AUTHOR}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono font-bold">
                    🔒 Cố định (Read-Only)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed">
                  Bản quyền mã nguồn và kiến trúc giải pháp thuộc về tác giả <strong>{APP_AUTHOR}</strong> ({APP_COPYRIGHT}). Bạn có thể tùy biến Tên công ty và Logo nhà máy ở trên, nhưng bản quyền tác giả được bảo vệ vĩnh viễn.
                </p>
              </div>
            </div>

            <a
              href={APP_AUTHOR_GITHUB}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
            >
              <GithubIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Liên hệ Simon (GitHub)</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
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

      {/* SECTION 4: DEMO DATA CLEANUP & RESET (ADMIN ONLY) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {t('demo_data_title')}
                </h2>
                {demoStats && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      demoStats.has_demo_data
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {demoStats.has_demo_data
                      ? t('has_demo_data_badge')
                      : t('no_demo_data_badge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {t('demo_data_desc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfirmKeyword('');
              setClearAreasChecked(false);
              setClearError(null);
              setClearModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/20 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('clear_demo_btn')}</span>
          </button>
        </div>

        {clearSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{clearSuccess}</span>
          </div>
        )}

        {clearError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {clearError}
          </div>
        )}

        {/* Current Data Overview Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('audits')}
            </div>
            <div className="mt-1 text-xl font-black font-mono text-slate-800">
              {demoStats?.audits_count ?? '-'}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('findings')}
            </div>
            <div className="mt-1 text-xl font-black font-mono text-slate-800">
              {demoStats?.findings_count ?? '-'}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kho ảnh R2
            </div>
            <div className="mt-1 text-xl font-black font-mono text-slate-800">
              {demoStats?.photos_count ?? '-'}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('areas')}
            </div>
            <div className="mt-1 text-xl font-black font-mono text-slate-800">
              {demoStats?.areas_count ?? '-'}
            </div>
          </div>
        </div>

        {/* Historical Scores Data & Update Link */}
        <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                <span>{t('admin_historical_manage')}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono text-xs font-bold">
                  {demoStats?.historical_scores_count ?? 0} {t('source_historical').toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 truncate sm:whitespace-normal">
                {t('admin_historical_desc')}
              </p>
            </div>
          </div>
          <a
            href="/reports?tab=monthly&import=1"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>{t('admin_historical_manage')}</span>
          </a>
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

      {/* Modal: Confirm Clear Demo Data */}
      <Modal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title={t('clear_demo_modal_title')}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-800">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{t('clear_demo_warning')}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-rose-700 pl-1 text-[11px]">
              <li>Xóa tất cả các đợt kiểm tra 5S ({demoStats?.audits_count || 0} đợt audit)</li>
              <li>Xóa tất cả lỗi 5S phát sinh ({demoStats?.findings_count || 0} lỗi)</li>
              <li>Xóa toàn bộ ảnh Before/After ({demoStats?.photos_count || 0} ảnh trong kho R2)</li>
              <li>Xóa điểm trung bình lịch sử nhập thử từ Excel</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer font-bold select-none">
              <input
                type="checkbox"
                checked={clearAreasChecked}
                onChange={(e) => setClearAreasChecked(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <span>{t('clear_areas_checkbox')}</span>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Chọn mục này nếu bạn muốn xóa sạch cả {demoStats?.areas_count || 16} khu vực mẫu ban đầu để tự khai báo danh sách khu vực thực tế của công ty.
                </p>
              </div>
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {t('clear_demo_confirm_prompt', { text: lang === 'en' ? 'CLEAR' : 'XOA DEMO' })}
            </label>
            <input
              type="text"
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              placeholder={lang === 'en' ? 'CLEAR' : 'XOA DEMO'}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setClearModalOpen(false)}
              disabled={clearingDemo}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleClearDemoData}
              disabled={
                clearingDemo ||
                confirmKeyword.trim().toUpperCase() !== (lang === 'en' ? 'CLEAR' : 'XOA DEMO')
              }
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/25 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {clearingDemo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{clearingDemo ? t('clearing_demo') : t('clear_demo_btn')}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cloudflare Account Configuration */}
      <Modal
        isOpen={cfModalOpen}
        onClose={() => setCfModalOpen(false)}
        title={t('cf_modal_title')}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCfConfig} className="space-y-4">
          <p className="text-xs text-slate-500">
            {t('cf_modal_desc')}
          </p>

          {cfModalMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                cfModalMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {cfModalMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{cfModalMessage.text}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('cf_account_id')}
              </label>
              <input
                type="text"
                value={cfAccountIdInput}
                onChange={(e) => setCfAccountIdInput(e.target.value)}
                placeholder="Ví dụ: e4c9a81b2f34567890abcdef12345678"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tìm thấy trong Cloudflare Dashboard &gt; Trang chủ &gt; Cột bên phải mục Account ID.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t('cf_api_token_label')}
                </label>
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Tạo token trên Cloudflare</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={cfApiTokenInput}
                onChange={(e) => setCfApiTokenInput(e.target.value)}
                placeholder={t('cf_api_token_placeholder')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Token được mã hóa bảo mật chuẩn AES-GCM-256 trước khi lưu. Cần quyền: Workers Scripts (Edit), D1 (Edit), R2 Storage (Edit).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t('cf_worker_name_label')}
                </label>
                <input
                  type="text"
                  value={cfWorkerNameInput}
                  onChange={(e) => setCfWorkerNameInput(e.target.value)}
                  placeholder="5s-audit"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t('cf_custom_domain_label')}
                </label>
                <input
                  type="text"
                  value={cfCustomDomainInput}
                  onChange={(e) => setCfCustomDomainInput(e.target.value)}
                  placeholder="5s.yourfactory.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {predictedNewUrl && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    {t('cf_predicted_new_url')}
                  </span>
                  <button
                    type="button"
                    onClick={copyPredictedUrl}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition shadow-xs"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? t('cf_copied') : t('cf_copy_url')}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-emerald-200 font-mono text-xs font-black text-emerald-900 break-all select-all flex items-center justify-between gap-2">
                  <span>{predictedNewUrl}</span>
                  <a
                    href={predictedNewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 p-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  {t('cf_new_url_notice')}
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestCfConnection}
              disabled={testingCfConn || !cfApiTokenInput.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-40"
            >
              {testingCfConn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
              <span>{testingCfConn ? t('cf_testing_conn') : t('cf_test_conn_btn')}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCfModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingCfConfig}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm shadow-sky-600/25 cursor-pointer disabled:opacity-50 transition"
              >
                {savingCfConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{savingCfConfig ? t('cf_saving_config') : t('cf_save_config_btn')}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
