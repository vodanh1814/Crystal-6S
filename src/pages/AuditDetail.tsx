import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Send,
  Loader2,
  Camera,
  Image as ImageIcon,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { ScoreBadge } from '../components/ScoreBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Lightbox, type LightboxPhoto } from '../components/Lightbox';
import { compressImage } from '../lib/imageCompression';
import { formatMonthYear } from '../lib/date';
import { formatScore } from '../lib/format';
import type { Audit, Finding, ChecklistItem, AuditAreaScore } from '../api/types';

export const AuditDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, canAudit } = useAuth();
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState('');

  // Finding filter by area
  const [selectedFindingArea, setSelectedFindingArea] = useState<string>('');

  // Add Finding Modal state
  const [findingModalOpen, setFindingModalOpen] = useState(false);
  const [modalAreaId, setModalAreaId] = useState<number | ''>('');
  const [modalItemId, setModalItemId] = useState<number | ''>('');
  const [modalDescription, setModalDescription] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Saving external audit inputs indicator
  const [savingExternalAreaId, setSavingExternalAreaId] = useState<number | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<LightboxPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchAuditData = useCallback(async () => {
    try {
      const res = await api.get<any>(`/audits/${id}`);
      setData(res);
      setNote(res.audit?.note || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Clean up object URLs on modal close / photo change
  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  if (loading || !data) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const {
    audit,
    target,
    area_scores = [],
    checklist_items = [],
    na_matrix = [],
    findings = [],
    prev_weeks_counts = {},
    live_score,
    permissions,
  } = data;

  const isDraft = audit.status === 'draft';
  const canEdit = permissions.canEdit;

  // Filter out external items (S5.2-BOD, S5.2-CUS, S5.3) for field findings
  const fieldChecklistItems: ChecklistItem[] = checklist_items.filter(
    (item: ChecklistItem) => !['S5.2-BOD', 'S5.2-CUS', 'S5.3'].includes(item.code)
  );

  // NA Set for quick lookup `${area_id}_${item_id}`
  const naSet = new Set<string>(
    na_matrix.map((row: { area_id: number; item_id: number }) => `${row.area_id}_${row.item_id}`)
  );

  // Areas user can audit
  const auditableAreas = area_scores.filter((as: AuditAreaScore) => canAudit(as.area_id));

  // Handle external table input change (BOD, Customer, IE)
  const handleExternalCountChange = async (
    areaId: number,
    field: 'bod_count' | 'customer_count' | 'ie_count',
    val: number
  ) => {
    const current = area_scores.find((as: AuditAreaScore) => as.area_id === areaId);
    if (!current) return;

    const bodCount = field === 'bod_count' ? val : current.bod_count;
    const customerCount = field === 'customer_count' ? val : current.customer_count;
    const ieCount = field === 'ie_count' ? val : current.ie_count;

    try {
      setSavingExternalAreaId(areaId);
      const res = await api.put<any>(`/audits/${id}/external`, {
        area_id: areaId,
        bod_count: bodCount,
        customer_count: customerCount,
        ie_count: ieCount,
      });
      setData((prev: any) => ({
        ...prev,
        area_scores: res.area_scores,
        live_score: res.live_score,
        audit: {
          ...prev.audit,
          total_penalty: res.live_score.totalPenalty,
          score: res.live_score.score,
        },
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to update external scores');
    } finally {
      setSavingExternalAreaId(null);
    }
  };

  // Open Add Finding Modal (optionally pre-select area)
  const openAddFindingModal = (preselectedAreaId?: number) => {
    const initialAreaId =
      preselectedAreaId ||
      (auditableAreas.length > 0 ? auditableAreas[0].area_id : area_scores[0]?.area_id || '');
    setModalAreaId(initialAreaId);
    setModalItemId('');
    setModalDescription('');
    setSelectedPhotos([]);
    setPhotoPreviews([]);
    setModalError(null);
    setFindingModalOpen(true);
  };

  // Photo file picker handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const combined = [...selectedPhotos, ...files].slice(0, 6);
    setSelectedPhotos(combined);

    // Create object URLs
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    const urls = combined.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
  };

  // Remove photo from selection
  const handleRemovePhoto = (index: number) => {
    const updated = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(updated);

    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  // Submit Add Finding
  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAreaId || !modalItemId) {
      setModalError(t('error_select_area_and_item'));
      return;
    }

    setModalError(null);
    setModalSubmitting(true);

    try {
      // 1. Create finding in audit
      const createRes = await api.post<{ finding: Finding }>(`/audits/${id}/findings`, {
        area_id: Number(modalAreaId),
        item_id: Number(modalItemId),
        description: modalDescription,
      });

      const newFindingId = createRes.finding.id;

      // 2. Upload selected Before photos
      if (selectedPhotos.length > 0) {
        for (const file of selectedPhotos) {
          try {
            const compressedBlob = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedBlob, 'before.jpg');
            formData.append('kind', 'before');
            await api.post(`/findings/${newFindingId}/photos`, formData);
          } catch (uploadErr) {
            console.error('Failed to upload photo for finding:', uploadErr);
          }
        }
      }

      setFindingModalOpen(false);
      await fetchAuditData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add finding');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Delete Finding in Draft
  const handleDeleteFinding = async (findingId: number) => {
    if (!window.confirm(t('confirm_delete_finding'))) return;
    try {
      await api.delete(`/findings/${findingId}`);
      await fetchAuditData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete finding');
    }
  };

  // Submit Audit
  const handleSubmitAudit = async () => {
    if (!window.confirm(t('confirm_submit_audit'))) return;

    try {
      setActionLoading(true);
      await api.post(`/audits/${id}/submit`);
      await fetchAuditData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit audit');
    } finally {
      setActionLoading(false);
    }
  };

  // Reopen Audit
  const handleReopenAudit = async () => {
    if (!window.confirm(t('confirm_reopen_audit'))) return;

    try {
      setActionLoading(true);
      await api.post(`/audits/${id}/reopen`);
      await fetchAuditData();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen audit');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Draft Audit
  const handleDeleteAudit = async () => {
    if (!window.confirm(t('confirm_delete_draft_audit'))) return;

    try {
      setActionLoading(true);
      await api.delete(`/audits/${id}`);
      navigate('/audits');
    } catch (err: any) {
      alert(err.message || 'Failed to delete audit');
      setActionLoading(false);
    }
  };

  // Save Note
  const handleSaveNote = async () => {
    try {
      await api.put(`/audits/${id}`, { note });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Filtered findings for display
  const displayedFindings = selectedFindingArea
    ? findings.filter((f: Finding) => f.area_id === Number(selectedFindingArea))
    : findings;

  // Selected item in modal for escalation info preview
  const selectedItem = fieldChecklistItems.find((i) => i.id === Number(modalItemId));
  const selectedAreaObj = area_scores.find((as: AuditAreaScore) => as.area_id === Number(modalAreaId));
  const modalPrevCount =
    modalAreaId && modalItemId
      ? prev_weeks_counts[`${modalAreaId}_${modalItemId}`] || 0
      : 0;

  const modalRepeatLevel = selectedItem?.escalating === 1 ? 1 + modalPrevCount : 1;
  const modalPenalty = selectedItem
    ? selectedItem.escalating === 1
      ? selectedItem.penalty + modalPrevCount
      : selectedItem.penalty
    : 0;

  // Available criteria for selected area in modal (filter out NA items)
  const applicableItemsForModal = fieldChecklistItems.filter(
    (item) => !modalAreaId || !naSet.has(`${modalAreaId}_${item.id}`)
  );

  const currentPlantScore = isDraft ? live_score.score : audit.score;
  const currentPlantPenalty = isDraft ? live_score.totalPenalty : audit.total_penalty;

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <Link
            to="/audits"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back')}</span>
          </Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={audit.status} type="audit" />
            {isDraft && permissions.canDelete && (
              <button
                onClick={handleDeleteAudit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title={t('delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {audit.iso_year}-W{audit.iso_week < 10 ? `0${audit.iso_week}` : audit.iso_week}
              </h1>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                {formatMonthYear(audit.month)}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {t('audit_date')}: <strong className="text-slate-700">{audit.audit_date}</strong> · Auditor: <span className="font-bold text-slate-700">{audit.auditor_name}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('plant_score_label')}
              </div>
              <ScoreBadge score={currentPlantScore} target={target} size="lg" showStatusText />
            </div>
            <div className="pl-3.5 border-l border-slate-200 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('penalty')}
              </div>
              <div className="text-lg font-black text-rose-600">
                -{currentPlantPenalty || 0}{t('pts_unit')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: BOD / Customer / IE Table & Weekly Score Summary by Area */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {t('external_audit_summary_table')}
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {area_scores.length} {t('areas').toLowerCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {t('external_audit_subtitle')}
            </p>
          </div>

          {isDraft && canEdit && (
            <button
              onClick={() => openAddFindingModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add_5s_finding')}</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{t('area_column')}</th>
                <th className="py-3 px-4 text-center">{t('field_findings_count_penalty')}</th>
                <th className="py-3 px-3 text-center">{t('bod_audit_col')}</th>
                <th className="py-3 px-3 text-center">{t('customer_audit_col')}</th>
                <th className="py-3 px-3 text-center">{t('ie_audit_col')}</th>
                <th className="py-3 px-4 text-right">{t('penalty')}</th>
                <th className="py-3 px-4 text-center">{t('weekly_score_col')}</th>
                {isDraft && canEdit && <th className="py-3 px-4 text-center">{t('action')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {area_scores.map((as: AuditAreaScore) => {
                const isAuditable = canAudit(as.area_id);
                const areaFindings = findings.filter((f: Finding) => f.area_id === as.area_id);
                const isPassing = as.score >= target;
                const isSaving = savingExternalAreaId === as.area_id;

                return (
                  <tr
                    key={as.area_id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Area Code & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black px-2 py-0.5 rounded bg-slate-900 text-white text-xs">
                          {as.area_code}
                        </span>
                        <span className="font-semibold text-slate-700 truncate max-w-[140px] sm:max-w-[200px]">
                          {as.area_name}
                        </span>
                      </div>
                    </td>

                    {/* Field Findings */}
                    <td className="py-3 px-4 text-center">
                      <div className="font-semibold text-slate-800">
                        {areaFindings.length > 0 ? (
                          <span className="text-slate-800 font-bold">
                            {t('findings_count_short', { n: areaFindings.length })}{' '}
                            <span className="text-rose-600 font-black">
                              (-{as.finding_penalty}{t('pts_unit')})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">{t('zero_findings_short')}</span>
                        )}
                      </div>
                    </td>

                    {/* BOD (-4đ) Stepper Input */}
                    <td className="py-2.5 px-3 text-center">
                      {isDraft && isAuditable ? (
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={as.bod_count}
                          disabled={isSaving}
                          onChange={(e) =>
                            handleExternalCountChange(
                              as.area_id,
                              'bod_count',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-14 text-center py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      ) : (
                        <span className="font-bold text-slate-700">{as.bod_count}</span>
                      )}
                    </td>

                    {/* Customer (-6đ) Stepper Input */}
                    <td className="py-2.5 px-3 text-center">
                      {isDraft && isAuditable ? (
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={as.customer_count}
                          disabled={isSaving}
                          onChange={(e) =>
                            handleExternalCountChange(
                              as.area_id,
                              'customer_count',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-14 text-center py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      ) : (
                        <span className="font-bold text-slate-700">{as.customer_count}</span>
                      )}
                    </td>

                    {/* Internal IE (-1đ) Stepper Input */}
                    <td className="py-2.5 px-3 text-center">
                      {isDraft && isAuditable ? (
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={as.ie_count}
                          disabled={isSaving}
                          onChange={(e) =>
                            handleExternalCountChange(
                              as.area_id,
                              'ie_count',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-14 text-center py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      ) : (
                        <span className="font-bold text-slate-700">{as.ie_count}</span>
                      )}
                    </td>

                    {/* Total Penalty */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-black text-rose-600">
                        -{as.total_penalty || 0}{t('pts_unit')}
                      </span>
                    </td>

                    {/* Weekly Score */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-xs ${
                          isPassing
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {formatScore(as.score, lang)}
                      </span>
                    </td>

                    {/* Action */}
                    {isDraft && canEdit && (
                      <td className="py-3 px-4 text-center">
                        {isAuditable && (
                          <button
                            onClick={() => openAddFindingModal(as.area_id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{t('quick_add_finding')}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Field Findings Recorded in This Weekly Audit */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {t('findings_list')} ({findings.length})
            </h2>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
              {t('penalty')}: -{currentPlantPenalty || 0}{t('pts_unit')}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Filter by Area */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedFindingArea}
                onChange={(e) => setSelectedFindingArea(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('all_areas')}</option>
                {area_scores.map((as: AuditAreaScore) => (
                  <option key={as.area_id} value={as.area_id}>
                    {as.area_code} - {as.area_name}
                  </option>
                ))}
              </select>
            </div>

            {isDraft && canEdit && (
              <button
                onClick={() => openAddFindingModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('add_5s_finding')}</span>
              </button>
            )}
          </div>
        </div>

        {displayedFindings.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            {t('noData')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {displayedFindings.map((f: Finding) => {
              const isFindingAuditable = canAudit(f.area_id);

              return (
                <div
                  key={f.id}
                  className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                        {f.area_code}
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {f.item_code}
                      </span>
                      {f.repeat_level > 1 ? (
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          {t('repeat_level_badge', { w: f.repeat_level, pts: f.applied_penalty })}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          -{f.applied_penalty}{t('pts_unit')}
                        </span>
                      )}
                      <StatusBadge status={f.status} type="finding" />
                    </div>

                    {isDraft && isFindingAuditable && (
                      <button
                        onClick={() => handleDeleteFinding(f.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {lang === 'en' ? f.content_en || f.content_vi : f.content_vi}
                    </p>
                    {f.description && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 mt-2">
                        {f.description}
                      </p>
                    )}
                  </div>

                  {/* Photo Thumbnails with 2K Lightbox */}
                  {f.photos && f.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {f.photos.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setLightboxPhotos(
                              (f.photos || []).map((item: any) => ({
                                id: item.id,
                                kind: item.kind,
                                area_code: f.area_code,
                                item_code: f.item_code,
                                description: f.description,
                                finding_id: f.id,
                              }))
                            );
                            const idx = (f.photos || []).findIndex((item: any) => item.id === p.id);
                            setLightboxIndex(idx >= 0 ? idx : 0);
                            setLightboxOpen(true);
                          }}
                          className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group hover:border-blue-400 shrink-0"
                          title={t('zoom_photo_2k')}
                        >
                          <img
                            src={`/api/photos/${p.id}`}
                            alt={p.kind}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                            loading="lazy"
                          />
                          <span
                            className={`absolute bottom-0 inset-x-0 text-[8px] font-bold text-white text-center py-0.5 uppercase ${
                              p.kind === 'before' ? 'bg-rose-600/80' : 'bg-emerald-600/80'
                            }`}
                          >
                            {p.kind}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action row & link to FindingDetail */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    {f.status === 'fixed' ? (
                      <Link
                        to={`/findings/${f.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all"
                      >
                        <span>{t('verify_after_photo_action')}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        to={`/findings/${f.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <span>{t('finding_detail')}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    <span className="text-[11px] text-slate-400">
                      {t('due_date')}: {f.due_date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Audit Note */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3">
        <label className="block text-sm font-bold text-slate-900">{t('note')}</label>
        <textarea
          rows={3}
          value={note}
          disabled={!isDraft || !canEdit}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleSaveNote}
          placeholder={t('audit_note_placeholder')}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm disabled:bg-slate-50"
        />
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 max-w-7xl mx-auto shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-500 font-medium">
            {isDraft ? t('live_score') : t('score')}:
          </span>
          <ScoreBadge score={currentPlantScore} target={target} size="md" showStatusText />
          <span className="hidden sm:inline text-xs font-bold text-rose-600">
            (-{currentPlantPenalty || 0}{t('pts_unit')})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isDraft && permissions.canSubmit && (
            <button
              onClick={handleSubmitAudit}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{t('submit')}</span>
            </button>
          )}

          {!isDraft && permissions.canReopen && (
            <button
              onClick={handleReopenAudit}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold text-xs text-white shadow-md shadow-amber-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>{t('reopen')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal: Add 5S Finding (with Area, Criterion, Before Photos, Escalation Preview) */}
      <Modal
        isOpen={findingModalOpen}
        onClose={() => setFindingModalOpen(false)}
        title={t('add_5s_finding')}
      >
        <form onSubmit={handleCreateFinding} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {modalError}
            </div>
          )}

          {/* 1. Select Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('select_area')} <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={modalAreaId}
              onChange={(e) => {
                setModalAreaId(Number(e.target.value));
                setModalItemId('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm font-semibold"
            >
              <option value="">-- {t('select_area')} --</option>
              {auditableAreas.map((as: AuditAreaScore) => (
                <option key={as.area_id} value={as.area_id}>
                  {as.area_code} - {as.area_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Select 5S Criterion (Filtered by NA for this Area) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('select_criterion')} <span className="text-rose-500">*</span>
            </label>
            <select
              required
              disabled={!modalAreaId}
              value={modalItemId}
              onChange={(e) => setModalItemId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm font-semibold disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">-- {t('select_criterion')} --</option>
              {[1, 2, 3, 4, 5].map((g) => {
                const groupItems = applicableItemsForModal.filter((i) => i.s_group === g);
                if (groupItems.length === 0) return null;
                return (
                  <optgroup key={g} label={`S${g}`}>
                    {groupItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code}: {lang === 'en' ? item.content_en || item.content_vi : item.content_vi} (-{item.penalty}{t('pts_unit')})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* 3. Live Penalty Escalation Badge Preview */}
          {selectedItem && (
            <div
              className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                modalPrevCount > 0
                  ? 'bg-purple-50/80 border-purple-200 text-purple-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>{selectedItem.code}</span>
                <span className={modalPrevCount > 0 ? 'text-purple-700' : 'text-rose-600'}>
                  {modalPrevCount > 0
                    ? t('repeat_level_badge', { w: modalRepeatLevel, pts: modalPenalty })
                    : t('penalty_pts_badge', { pts: modalPenalty })}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {modalPrevCount > 0
                  ? t('escalation_alert_text', {
                      n: modalPrevCount,
                      pts: modalPenalty,
                      w: modalRepeatLevel,
                    })
                  : t('first_time_violation_text', { pts: modalPenalty })}
              </p>
            </div>
          )}

          {/* 4. Before Photo Upload (Camera / Pick, up to 6) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {t('before_photos')} ({photoPreviews.length}/6)
              </label>
              <span className="text-[11px] text-slate-400">{t('max_6_photos')}</span>
            </div>

            {/* Thumbnail previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2.5">
                {photoPreviews.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center cursor-pointer hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photoPreviews.length < 6 && (
              <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 text-xs font-bold text-slate-600 hover:text-blue-600 transition-all cursor-pointer">
                <Camera className="w-4 h-4 text-slate-400" />
                <span>{t('take_photo_or_upload')}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 5. Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('finding_description')}
            </label>
            <textarea
              rows={2}
              value={modalDescription}
              onChange={(e) => setModalDescription(e.target.value)}
              placeholder={t('finding_description_placeholder')}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setFindingModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={modalSubmitting || !modalAreaId || !modalItemId}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {modalSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{selectedPhotos.length > 0 ? t('uploading_photos') : t('loading')}</span>
                </>
              ) : (
                <span>{t('save')}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2K Fullscreen Lightbox Modal */}
      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={lightboxPhotos}
        currentIndex={lightboxIndex}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
};
