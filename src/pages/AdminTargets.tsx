import React, { useState, useEffect, useRef } from 'react';
import { Target, Edit2, Loader2, Plus, Save, Building2, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { Modal } from '../components/Modal';
import { fileToLogoDataUrl } from '../lib/imageCompression';
import type { YearlyTarget } from '../api/types';

export const AdminTargets: React.FC = () => {
  const { t } = useI18n();
  const { companyName, companyLogo, updateBranding } = useAuth();

  // Branding State
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

  // Yearly Targets State
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

  return (
    <div className="space-y-8 max-w-3xl">
      {/* SECTION 1: COMPANY BRANDING */}
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
              <p className="text-xs text-slate-500 font-medium">
                {t('company_branding_desc')}
              </p>
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
                  <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                    {t('logo_help')}
                  </p>
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

      {/* SECTION 2: YEARLY TARGETS */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('admin_targets_title')}</h1>
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

        {/* Targets Table */}
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
                    <td className="py-3.5 px-4 font-bold text-emerald-600 text-base">{tgt.target}%</td>
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('admin_targets_title')}>
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
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{t('save')}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
