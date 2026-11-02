import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  XCircle,
  Loader2,
  History,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { StatusBadge } from '../components/StatusBadge';
import { PhotoUpload } from '../components/PhotoUpload';
import type { Finding, Photo } from '../api/types';

export const FindingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, canAudit, canManage } = useAuth();
  const { lang, t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState<Finding | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fix Action Form (MNG)
  const [fixNote, setFixNote] = useState('');

  // Verify Action Form (Auditor)
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  const fetchFinding = useCallback(async () => {
    try {
      const res = await api.get<{ finding: Finding }>(`/findings/${id}`);
      setFinding(res.finding);
      setFixNote(res.finding.fix_note || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFinding();
  }, [fetchFinding]);

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

  const handleUploadAfterPhoto = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'after.jpg');
    formData.append('kind', 'after');

    await api.post(`/findings/${id}/photos`, formData);
    await fetchFinding();
  };

  const handleDeletePhoto = async (photoId: number) => {
    await api.delete(`/photos/${photoId}`);
    await fetchFinding();
  };

  const handleFixSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixNote.trim()) {
      alert(t('fix_note') + ' is required');
      return;
    }
    const afterPhotos = (finding.photos || []).filter((p) => p.kind === 'after');
    if (afterPhotos.length === 0) {
      alert(t('at_least_one_after_photo'));
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/findings/${id}/fix`, { note: fixNote });
      await fetchFinding();
    } catch (err: any) {
      alert(err.message || 'Failed to submit fix');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (action: 'close' | 'reject') => {
    if (action === 'reject' && !rejectNote.trim()) {
      alert(t('reject_reason') + ' is required');
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
      alert(err.message || 'Failed to verify');
    } finally {
      setActionLoading(false);
    }
  };

  const beforePhotos = (finding.photos || []).filter((p) => p.kind === 'before');
  const afterPhotos = (finding.photos || []).filter((p) => p.kind === 'after');

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Back button */}
      <div>
        <Link
          to="/findings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </Link>
      </div>

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
        {/* Before Photos */}
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
                <div
                  key={p.id}
                  className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
                >
                  <img
                    src={`/api/photos/${p.id}`}
                    alt="before"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* After Photos */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <PhotoUpload
            photos={finding.photos || []}
            kind="after"
            canUpload={canFix}
            canDelete={() => canFix}
            onUpload={handleUploadAfterPhoto}
            onDelete={handleDeletePhoto}
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

          <form onSubmit={handleFixSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('fix_note')}
              </label>
              <textarea
                required
                rows={3}
                value={fixNote}
                onChange={(e) => setFixNote(e.target.value)}
                placeholder={t('fix_note_placeholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleVerify('close')}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('btn_verify_close')}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRejectBox(true)}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{t('btn_verify_reject')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-800">
                {t('reject_reason')}
              </label>
              <textarea
                required
                rows={2}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={t('reject_reason_placeholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-rose-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVerify('reject')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                >
                  {t('confirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
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
            {finding.history.map((h: any, idx: number) => (
              <div key={h.id} className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">
                    {t('week')} {h.iso_week} ({h.audit_date})
                  </span>
                  <StatusBadge status={h.status} type="finding" />
                </div>
                <p className="text-xs text-slate-600">{h.description || t('no_description')}</p>
                {h.photos?.length > 0 && (
                  <div className="flex gap-2 py-1">
                    {h.photos.map((hp: Photo) => (
                      <img
                        key={hp.id}
                        src={`/api/photos/${hp.id}`}
                        alt={hp.kind}
                        className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
