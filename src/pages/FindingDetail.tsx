import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  XCircle,
  Loader2,
  History,
  ZoomIn,
  AlertCircle,
  Circle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { StatusBadge } from '../components/StatusBadge';
import { PhotoUpload } from '../components/PhotoUpload';
import { Lightbox, type LightboxPhoto } from '../components/Lightbox';
import type { Finding, Photo } from '../api/types';

export const FindingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, canAudit, canManage } = useAuth();
  const { lang, t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState<Finding | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fix Action Form (MNG) with dirty guard so photo uploads never wipe typed text
  const [fixNote, setFixNote] = useState('');
  const fixNoteDirtyRef = useRef(false);

  // Verify Action Form (Auditor)
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  // Unified 2K Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<LightboxPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchFinding = useCallback(async () => {
    try {
      const res = await api.get<{ finding: Finding }>(`/findings/${id}`);
      setFinding(res.finding);
      if (!fixNoteDirtyRef.current) {
        setFixNote(res.finding.fix_note || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fixNoteDirtyRef.current = false;
    setShowRejectBox(false);
    setRejectNote('');
    setActionError(null);
    setLightboxOpen(false);
    setLoading(true);
    fetchFinding();
  }, [id, fetchFinding]);

  if (loading || !finding) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const isAreaManager = canManage(finding.area_id);
  const isAreaAuditor = canAudit(finding.area_id);

  const canFix = finding.status === 'open' && isAreaManager;
  const canVerify = finding.status === 'fixed' && isAreaAuditor;

  const beforePhotos = (finding.photos || []).filter((p) => p.kind === 'before');
  const afterPhotos = (finding.photos || []).filter((p) => p.kind === 'after');
  const hasAfterPhoto = afterPhotos.length > 0;
  const hasFixNote = fixNote.trim() !== '';

  const openLightbox = (photos: Photo[], targetId: number, overrideDescription?: string) => {
    const mapped: LightboxPhoto[] = photos.map((p) => ({
      id: p.id,
      kind: p.kind,
      area_code: finding.area_code,
      item_code: finding.item_code,
      description: overrideDescription ?? finding.description,
      finding_id: finding.id,
    }));
    const idx = mapped.findIndex((p) => p.id === targetId);
    setLightboxPhotos(mapped);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  const handleUploadAfterPhoto = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'after.jpg');
    formData.append('kind', 'after');

    await api.post(`/findings/${id}/photos`, formData);
    await fetchFinding();
  };

  const handleUploadAfterPhotoBatch = async (
    blobs: Blob[],
    onProgress?: (done: number, total: number) => void
  ) => {
    let uploadedAny = false;
    try {
      for (let i = 0; i < blobs.length; i++) {
        const formData = new FormData();
        formData.append('file', blobs[i], 'after.jpg');
        formData.append('kind', 'after');
        await api.post(`/findings/${id}/photos`, formData);
        uploadedAny = true;
        onProgress?.(i + 1, blobs.length);
      }
      setActionError(null);
    } finally {
      if (uploadedAny) {
        await fetchFinding();
      }
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      setActionError(null);
      await api.delete(`/photos/${photoId}`);
      await fetchFinding();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete photo');
    }
  };

  const handleFixSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!hasAfterPhoto) {
      setActionError(t('at_least_one_after_photo'));
      return;
    }
    if (!hasFixNote) {
      setActionError(`${t('fix_note')} is required`);
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/findings/${id}/fix`, { note: fixNote });
      fixNoteDirtyRef.current = false;
      await fetchFinding();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to submit fix');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (action: 'close' | 'reject') => {
    setActionError(null);
    if (action === 'reject' && !rejectNote.trim()) {
      setActionError(`${t('reject_reason')} is required`);
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/findings/${id}/verify`, {
        action,
        note: action === 'reject' ? rejectNote : undefined,
      });
      setShowRejectBox(false);
      await fetchFinding();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to verify');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 md:pb-16">
      {/* Back button */}
      <div>
        <Link
          to={finding?.area_id ? `/findings?area_id=${finding.area_id}` : '/findings'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </Link>
      </div>

      {/* Inline error notice */}
      {actionError && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Guest Notice */}
      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="text-xs sm:text-sm font-semibold">
            {t('read_only_view_notice')}
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition shrink-0"
          >
            {t('login')}
          </Link>
        </div>
      )}

      {/* Main Info Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800">
              {finding.area_code}
            </span>
            <span className="text-sm font-bold text-slate-600">{finding.item_code}</span>
            <StatusBadge status={finding.status} type="finding" />
            {finding.repeat_level > 1 && (
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                {t('repeat_week', { n: finding.repeat_level })}
              </span>
            )}
          </div>

          <div className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 inline-block">
            {t('penalty')}: -{finding.applied_penalty}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {lang === 'en' ? finding.content_en || finding.content_vi : finding.content_vi}
          </h1>
          {finding.description && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700">
              <span className="font-semibold text-xs text-slate-400 block mb-1">
                {t('finding_description')}:
              </span>
              {finding.description}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">{t('date')}</span>
            <span className="font-semibold text-slate-700">{finding.audit_date}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">{t('due_date')}</span>
            <span className={`font-bold ${finding.is_overdue ? 'text-rose-600' : 'text-slate-700'}`}>
              {finding.due_date} {finding.is_overdue && t('overdue_tag')}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Auditor</span>
            <span className="font-semibold text-slate-700">{finding.creator_name}</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Photos: Before & After */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Before Photos (clickable 2K Lightbox) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">{t('before_photos')}</h3>
            <span className="text-xs text-slate-400 font-medium">({beforePhotos.length})</span>
          </div>

          {beforePhotos.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">{t('noData')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {beforePhotos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openLightbox(finding.photos || [], p.id)}
                  title={t('click_to_zoom')}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer block"
                >
                  <img
                    src={`/api/photos/${p.id}`}
                    alt="before"
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1.5 right-1.5 p-1.5 rounded-lg bg-slate-950/70 text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* After Photos (with Pre-Upload Preview & Approval Modal + Unified Lightbox) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <PhotoUpload
            photos={finding.photos || []}
            kind="after"
            canUpload={canFix}
            canDelete={() => canFix}
            onUpload={handleUploadAfterPhoto}
            onUploadBatch={handleUploadAfterPhotoBatch}
            onDelete={handleDeletePhoto}
            onPhotoClick={(photo) => openLightbox(finding.photos || [], photo.id)}
            contextLabel={`${finding.area_code || ''} · ${finding.item_code || ''} · CAPA #${finding.id}`}
          />
        </div>
      </div>

      {/* Area MNG Action Section: Record Improvement */}
      {canFix && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span>{t('fix_finding_title')}</span>
          </div>

          {/* 2-Step Readiness Checklist */}
          <div className="p-3 rounded-2xl bg-white/80 border border-blue-200/80 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('fix_checklist_title')}
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              <div
                className={`inline-flex items-center gap-1.5 ${
                  hasAfterPhoto ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {hasAfterPhoto ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Circle className="w-4 h-4 text-amber-500" />
                )}
                <span>{t('fix_req_photo')}</span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 ${
                  hasFixNote ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {hasFixNote ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Circle className="w-4 h-4 text-amber-500" />
                )}
                <span>{t('fix_req_note')}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleFixSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="finding-fix-note"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                {t('fix_note')}
              </label>
              <textarea
                id="finding-fix-note"
                required
                rows={3}
                value={fixNote}
                onChange={(e) => {
                  fixNoteDirtyRef.current = true;
                  setFixNote(e.target.value);
                }}
                placeholder={t('fix_note_placeholder')}
                className="auto-grow-textarea w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{t('btn_mark_fixed')}</span>
            </button>
          </form>
        </div>
      )}

      {/* Improvement Summary (if already fixed or closed) */}
      {(finding.status === 'fixed' || finding.status === 'closed') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3">
          <h3 className="font-bold text-sm text-slate-900">{t('fix_note')}</h3>
          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
            {finding.fix_note || t('no_fix_note')}
          </p>
          <div className="text-xs text-slate-400">
            {t('fixed_by_label')}: <span className="font-semibold text-slate-700">{finding.fixer_name}</span> ({finding.fixed_at})
          </div>
        </div>
      )}

      {/* Auditor Verification Section */}
      {canVerify && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{t('verify_finding_title')}</span>
          </div>

          {!showRejectBox ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleVerify('close')}
                disabled={actionLoading}
                className="px-5 py-2.5 min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('btn_verify_close')}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRejectBox(true)}
                disabled={actionLoading}
                className="px-5 py-2.5 min-h-[42px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{t('btn_verify_reject')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <label
                htmlFor="finding-reject-note"
                className="block text-xs font-bold uppercase tracking-wider text-rose-800"
              >
                {t('reject_reason')}
              </label>
              <textarea
                id="finding-reject-note"
                required
                rows={2}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={t('reject_reason_placeholder')}
                className="auto-grow-textarea w-full px-4 py-2.5 rounded-xl border border-rose-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVerify('reject')}
                  disabled={actionLoading}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                >
                  {t('confirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="px-4 py-2 min-h-[40px] rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Chain of Previous Weeks (if carried) */}
      {finding.history && finding.history.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <History className="w-5 h-5 text-slate-500" />
            <span>{t('history_chain')} ({finding.history.length})</span>
          </div>

          <div className="space-y-4 border-l-2 border-slate-200 pl-4 ml-2">
            {finding.history.map((h: any) => (
              <div key={h.id} className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">
                    {t('week')} {h.iso_week} ({h.audit_date})
                  </span>
                  <StatusBadge status={h.status} type="finding" />
                </div>
                <p className="text-xs text-slate-600">{h.description || t('no_description')}</p>
                {h.photos?.length > 0 && (
                  <div className="flex flex-wrap gap-2 py-1">
                    {h.photos.map((hp: Photo) => (
                      <button
                        key={hp.id}
                        type="button"
                        onClick={() => openLightbox(h.photos, hp.id, h.description)}
                        title={t('click_to_zoom')}
                        className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group"
                      >
                        <img
                          src={`/api/photos/${hp.id}`}
                          alt={hp.kind}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={lightboxPhotos}
        currentIndex={lightboxIndex}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
};
