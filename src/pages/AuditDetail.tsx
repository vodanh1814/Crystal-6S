import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Send,
  RotateCcw,
  Save,
  Loader2,
  AlertTriangle,
  Columns2,
  Table2,
  Search,
  Edit3,
  ZoomIn,
  ChevronRight,
  Minus,
} from 'lucide-react';
import { api } from '../api/client';
import type { Audit, AuditAreaScore, ChecklistItem, Finding, Photo } from '../api/types';
import { useI18n } from '../i18n/context';
import { formatScore } from '../lib/format';
import { formatMonthYear } from '../lib/date';
import { compressImage } from '../lib/imageCompression';
import { StatusBadge } from '../components/StatusBadge';
import { ScoreBadge } from '../components/ScoreBadge';
import { Modal } from '../components/Modal';
import { Lightbox, type LightboxPhoto } from '../components/Lightbox';

interface AuditDetailPayload {
  audit: Audit;
  target: number;
  warning_target: number;
  area_scores: AuditAreaScore[];
  checklist_items: ChecklistItem[];
  na_matrix: Array<{ area_id: number; item_id: number }>;
  findings: Finding[];
  prev_weeks_counts?: Record<string, number>;
  live_score?: { totalPenalty: number; score: number };
  permissions: {
    canEdit: boolean;
    canSubmit: boolean;
    canReopen: boolean;
    canDelete: boolean;
  };
}

const EXTERNAL_CODES = new Set(['S5.2-BOD', 'S5.2-CUS', 'S5.3']);

export const AuditDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [detail, setDetail] = useState<AuditDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sample A Workspace Mode: Split-Screen Inspector by default, Matrix table toggle available
  const [workspaceMode, setWorkspaceMode] = useState<'split' | 'matrix'>('split');
  const [activeAreaId, setActiveAreaId] = useState<number | null>(null);
  const [areaSearch, setAreaSearch] = useState('');
  const [checklistSearch, setChecklistSearch] = useState('');
  const [sGroupFilter, setSGroupFilter] = useState<number | 'all'>('all');

  // Action states
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingExternalAreaId, setSavingExternalAreaId] = useState<number | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [uploadingFindingId, setUploadingFindingId] = useState<number | null>(null);
  const [savingDescId, setSavingDescId] = useState<number | null>(null);
  const [inlineDescs, setInlineDescs] = useState<Record<number, string>>({});

  // Add / Edit Finding Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalAreaId, setModalAreaId] = useState<number | ''>('');
  const [modalItemId, setModalItemId] = useState<number | ''>('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalPhotos, setModalPhotos] = useState<Blob[]>([]);
  const [savingModalFinding, setSavingModalFinding] = useState(false);

  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [editAreaId, setEditAreaId] = useState<number | ''>('');
  const [editItemId, setEditItemId] = useState<number | ''>('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEditFinding, setSavingEditFinding] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<LightboxPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchAudit = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get<AuditDetailPayload>(`/audits/${id}`);
      setDetail(res);
      setNoteInput(res.audit.note || '');
      const nextDescs: Record<number, string> = {};
      for (const f of res.findings || []) {
        nextDescs[f.id] = f.description || '';
      }
      setInlineDescs(nextDescs);
      setActiveAreaId((prev) => {
        if (prev && res.area_scores.some((a) => a.area_id === prev)) return prev;
        return res.area_scores[0]?.area_id ?? null;
      });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAudit(false);
  }, [fetchAudit]);

  const naSet = useMemo(() => {
    const s = new Set<string>();
    for (const pair of detail?.na_matrix || []) {
      s.add(`${pair.area_id}_${pair.item_id}`);
    }
    return s;
  }, [detail?.na_matrix]);

  const fieldChecklistItems = useMemo(() => {
    return (detail?.checklist_items || []).filter((item) => !EXTERNAL_CODES.has(item.code));
  }, [detail?.checklist_items]);

  const filteredAreas = useMemo(() => {
    const q = areaSearch.trim().toLowerCase();
    const list = detail?.area_scores || [];
    if (!q) return list;
    return list.filter(
      (a) =>
        String(a.area_code || '').toLowerCase().includes(q) ||
        String(a.area_name || '').toLowerCase().includes(q)
    );
  }, [detail?.area_scores, areaSearch]);

  const filteredChecklistItems = useMemo(() => {
    const q = checklistSearch.trim().toLowerCase();
    return fieldChecklistItems.filter((item) => {
      if (sGroupFilter !== 'all' && Number(item.s_group) !== sGroupFilter) return false;
      if (q) {
        const hay = `${item.code} ${item.location_vi} ${item.location_en} ${item.content_vi} ${item.content_en}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fieldChecklistItems, sGroupFilter, checklistSearch]);

  if (loading && !detail) {
    return (
      <div className="w-full h-full flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="surface-card p-6 text-center space-y-3 max-w-lg mx-auto mt-10">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold">{error || 'Audit not found'}</p>
        <Link to="/audits" className="inline-block text-xs font-bold text-sky-400 hover:underline">
          {t('back')}
        </Link>
      </div>
    );
  }

  const { audit, target, warning_target: warningTarget, area_scores, findings, prev_weeks_counts, permissions } = detail;
  const isDraft = audit.status === 'draft';
  const canEdit = permissions.canEdit;
  const currentPlantScore = detail.live_score?.score ?? audit.score ?? 100;
  const currentPlantPenalty = detail.live_score?.totalPenalty ?? audit.total_penalty ?? 0;

  const activeAreaScore = area_scores.find((a) => a.area_id === activeAreaId) || area_scores[0] || null;
  const activeAreaFindings = activeAreaScore
    ? findings.filter((f) => f.area_id === activeAreaScore.area_id)
    : [];

  // Map findings by item_id for active area
  const activeFindingsByItem = new Map<number, Finding[]>();
  for (const f of activeAreaFindings) {
    const arr = activeFindingsByItem.get(f.item_id) || [];
    arr.push(f);
    activeFindingsByItem.set(f.item_id, arr);
  }

  const handleExternalStep = async (
    areaScore: AuditAreaScore,
    field: 'bod_count' | 'customer_count' | 'ie_count',
    delta: number
  ) => {
    if (!isDraft || !canEdit) return;
    const nextVal = Math.max(0, Number(areaScore[field] || 0) + delta);
    if (nextVal === Number(areaScore[field] || 0)) return;

    const payload = {
      area_id: areaScore.area_id,
      bod_count: field === 'bod_count' ? nextVal : areaScore.bod_count,
      customer_count: field === 'customer_count' ? nextVal : areaScore.customer_count,
      ie_count: field === 'ie_count' ? nextVal : areaScore.ie_count,
    };

    try {
      setSavingExternalAreaId(areaScore.area_id);
      const res = await api.put<{ area_scores: AuditAreaScore[]; live_score: { totalPenalty: number; score: number } }>(
        `/audits/${audit.id}/external`,
        payload
      );
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              area_scores: res.area_scores || prev.area_scores,
              live_score: res.live_score || prev.live_score,
            }
          : prev
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to update external counts');
    } finally {
      setSavingExternalAreaId(null);
    }
  };

  const handleMarkPass = async (areaId: number, itemFindings: Finding[]) => {
    if (!isDraft || !canEdit || itemFindings.length === 0) return;
    const hasData = itemFindings.some((f) => (f.description || '').trim() !== '' || (f.photos || []).length > 0);
    if (hasData) {
      const ok = window.confirm(
        lang === 'en'
          ? 'Mark this criterion as PASS? Existing finding notes/photos on this row will be removed.'
          : 'Chuyển tiêu chí này về ĐẠT? Các ghi chú/ảnh lỗi hiện tại trên dòng này sẽ bị xóa.'
      );
      if (!ok) return;
    }

    try {
      setTogglingKey(`${areaId}_${itemFindings[0].item_id}`);
      for (const f of itemFindings) {
        await api.delete(`/findings/${f.id}`);
      }
      await fetchAudit(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to clear finding');
    } finally {
      setTogglingKey(null);
    }
  };

  const handleMarkFail = async (areaId: number, item: ChecklistItem, existing: Finding[]) => {
    if (!isDraft || !canEdit) return;
    if (existing.length > 0) return; // already marked fail; user can use + Add if needing another finding
    try {
      setTogglingKey(`${areaId}_${item.id}`);
      await api.post(`/audits/${audit.id}/findings`, {
        area_id: areaId,
        item_id: item.id,
        description: '',
      });
      await fetchAudit(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to record finding');
    } finally {
      setTogglingKey(null);
    }
  };

  const handleSaveInlineDesc = async (findingId: number) => {
    try {
      setSavingDescId(findingId);
      await api.put(`/findings/${findingId}`, {
        description: inlineDescs[findingId] ?? '',
      });
      await fetchAudit(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to save note');
    } finally {
      setSavingDescId(null);
    }
  };

  const handleDeleteFinding = async (findingId: number) => {
    const ok = window.confirm(t('confirm_delete_finding'));
    if (!ok) return;
    try {
      await api.delete(`/findings/${findingId}`);
      await fetchAudit(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete finding');
    }
  };

  const handleInlinePhotoUpload = async (findingId: number, file: File | undefined) => {
    if (!file) return;
    try {
      setUploadingFindingId(findingId);
      const blob = await compressImage(file);
      const form = new FormData();
      form.append('file', blob, 'before.jpg');
      form.append('kind', 'before');
      await api.post(`/findings/${findingId}/photos`, form);
      await fetchAudit(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to upload photo');
    } finally {
      setUploadingFindingId(null);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    const ok = window.confirm(lang === 'en' ? 'Delete this photo?' : 'Xóa ảnh này?');
    if (!ok) return;
    try {
      await api.delete(`/photos/${photoId}`);
      await fetchAudit(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete photo');
    }
  };

  const handleSaveNote = async () => {
    try {
      setSavingNote(true);
      await api.put(`/audits/${audit.id}`, { note: noteInput });
      await fetchAudit(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to save audit note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSubmitAudit = async () => {
    const ok = window.confirm(
      lang === 'en'
        ? 'Submit this weekly audit? Scores will be finalized and published to the Dashboard.'
        : 'Nộp kỳ chấm điểm tuần này? Điểm sẽ được chốt và công bố lên Bảng theo dõi.'
    );
    if (!ok) return;
    try {
      setSubmitting(true);
      await api.put(`/audits/${audit.id}`, { note: noteInput });
      await api.post(`/audits/${audit.id}/submit`);
      await fetchAudit(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit audit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenAudit = async () => {
    const ok = window.confirm(
      lang === 'en' ? 'Reopen this submitted audit back to Draft?' : 'Mở lại kỳ chấm điểm này về trạng thái Bản nháp?'
    );
    if (!ok) return;
    try {
      setSubmitting(true);
      await api.post(`/audits/${audit.id}/reopen`);
      await fetchAudit(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to reopen audit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAudit = async () => {
    const ok = window.confirm(
      lang === 'en' ? 'Delete this draft audit permanently?' : 'Xóa vĩnh viễn kỳ chấm bản nháp này?'
    );
    if (!ok) return;
    try {
      await api.delete(`/audits/${audit.id}`);
      navigate('/audits');
    } catch (err: any) {
      alert(err?.message || 'Failed to delete audit');
    }
  };

  const openAddFindingModal = (presetAreaId?: number, presetItemId?: number) => {
    setModalAreaId(presetAreaId ?? activeAreaScore?.area_id ?? area_scores[0]?.area_id ?? '');
    setModalItemId(presetItemId ?? fieldChecklistItems[0]?.id ?? '');
    setModalDesc('');
    setModalPhotos([]);
    setAddModalOpen(true);
  };

  const handleModalPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const compressed: Blob[] = [];
    for (const f of files.slice(0, 6 - modalPhotos.length)) {
      compressed.push(await compressImage(f));
    }
    setModalPhotos((prev) => [...prev, ...compressed].slice(0, 6));
    e.target.value = '';
  };

  const handleCreateFindingFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAreaId || !modalItemId) return;
    try {
      setSavingModalFinding(true);
      const res = await api.post<{ finding: Finding }>(`/audits/${audit.id}/findings`, {
        area_id: Number(modalAreaId),
        item_id: Number(modalItemId),
        description: modalDesc,
      });
      const createdId = res.finding?.id;
      if (createdId && modalPhotos.length > 0) {
        for (const blob of modalPhotos) {
          const form = new FormData();
          form.append('file', blob, 'before.jpg');
          form.append('kind', 'before');
          await api.post(`/findings/${createdId}/photos`, form);
        }
      }
      setAddModalOpen(false);
      await fetchAudit(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to create finding');
    } finally {
      setSavingModalFinding(false);
    }
  };

  const openEditModal = (finding: Finding) => {
    setEditingFinding(finding);
    setEditAreaId(finding.area_id);
    setEditItemId(finding.item_id);
    setEditDesc(finding.description || '');
  };

  const handleUpdateFindingFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFinding || !editAreaId || !editItemId) return;
    try {
      setSavingEditFinding(true);
      await api.put(`/findings/${editingFinding.id}`, {
        area_id: Number(editAreaId),
        item_id: Number(editItemId),
        description: editDesc,
      });
      setEditingFinding(null);
      await fetchAudit(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to update finding');
    } finally {
      setSavingEditFinding(false);
    }
  };

  const openPhotoLightbox = (photos: Photo[], targetId: number, f?: Finding) => {
    const mapped: LightboxPhoto[] = photos.map((p) => ({
      id: p.id,
      kind: p.kind,
      area_code: f?.area_code,
      item_code: f?.item_code,
      description: f?.description,
      finding_id: f?.id,
    }));
    const idx = mapped.findIndex((p) => p.id === targetId);
    setLightboxPhotos(mapped);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-3 sm:gap-4 pb-24">
      {/* ── TOP AUDIT COMMAND HEADER ─────────────────────────────────────────────────────── */}
      <header className="surface-card p-3.5 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <Link
            to="/audits"
            className="surface-muted inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold hover:border-[var(--app-border-strong)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back')}</span>
          </Link>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black font-mono-kpi tracking-tight">
                {audit.iso_year}-W{audit.iso_week < 10 ? `0${audit.iso_week}` : audit.iso_week}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                {formatMonthYear(audit.month)}
              </span>
              <StatusBadge status={audit.status} type="audit" />
              {isDraft && permissions.canDelete && (
                <button
                  onClick={handleDeleteAudit}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                  title={t('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--app-text-muted)] mt-0.5 truncate">
              {audit.audit_date} · Auditor: <strong className="text-[var(--app-text)]">{audit.auditor_name}</strong> ·{' '}
              <span className="font-mono-kpi">{findings.length} CAPA</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2.5">
          {/* Split-Screen vs Matrix Overview Switcher */}
          <div className="surface-muted p-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWorkspaceMode('split')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                workspaceMode === 'split'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Split Inspector' : 'Kiểm tra Split-Screen'}</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode('matrix')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                workspaceMode === 'matrix'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? '15-Area Matrix' : 'Bảng 15 Khu vực'}</span>
            </button>
          </div>

          <div className="surface-elevated px-3 py-1.5 flex items-center gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                {lang === 'en' ? 'PLANT SCORE' : 'ĐIỂM NHÀ MÁY'}
              </div>
              <ScoreBadge score={currentPlantScore} target={target} warningTarget={warningTarget} size="sm" />
            </div>
            <div className="pl-3 border-l border-[var(--app-border)] text-right">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                {t('penalty')}
              </div>
              <div className="text-sm font-black font-mono-kpi text-rose-400">
                -{currentPlantPenalty || 0}{t('pts_unit')}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── WORKSPACE BODY: SPLIT-SCREEN INSPECTOR OR FULL MATRIX ────────────────────────── */}
      {workspaceMode === 'split' ? (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 flex-1 min-h-0">
          {/* LEFT RAIL (4 Cols): 15-Area Switcher & Telemetry Mini Cards */}
          <aside className="lg:col-span-4 flex flex-col min-h-0">
            <div className="surface-card p-3 flex flex-col gap-2.5 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-195px)]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-black uppercase tracking-wider">
                  {lang === 'en' ? 'AREAS INSPECTOR' : 'CHỌN KHU VỰC'} ({area_scores.length})
                </h2>
                <div className="relative flex-1 max-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-[var(--app-text-muted)] absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={areaSearch}
                    onChange={(e) => setAreaSearch(e.target.value)}
                    placeholder={lang === 'en' ? 'Find area...' : 'Tìm KV...'}
                    className="surface-muted w-full pl-7 pr-2 py-1 text-[11px] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div className="scroll-pane flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {filteredAreas.map((a) => {
                  const isActive = activeAreaScore?.area_id === a.area_id;
                  const areaFindingCount = findings.filter((f) => f.area_id === a.area_id).length;
                  const extTotal = (a.bod_count || 0) + (a.customer_count || 0) + (a.ie_count || 0);
                  const tierColor =
                    a.score >= target ? 'text-emerald-400' : a.score >= warningTarget ? 'text-amber-400' : 'text-rose-400';

                  return (
                    <button
                      type="button"
                      key={a.area_id}
                      onClick={() => setActiveAreaId(a.area_id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-[var(--app-accent-soft)] border-[var(--app-accent)] shadow-sm'
                          : 'surface-elevated hover:border-[var(--app-border-strong)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black font-mono-kpi">{a.area_code}</span>
                          {areaFindingCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-kpi font-bold bg-rose-500/20 text-rose-300">
                              {areaFindingCount} {lang === 'en' ? 'err' : 'lỗi'}
                            </span>
                          )}
                          {extTotal > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-kpi font-bold bg-amber-500/15 text-amber-300">
                              EXT:{extTotal}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--app-text-muted)] truncate mt-0.5">
                          {a.area_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-sm font-black font-mono-kpi ${tierColor}`}>
                          {formatScore(a.score, lang)}
                        </span>
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[var(--app-accent)]' : 'opacity-30'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* RIGHT PANE (8 Cols): Active Area Steppers + Interactive 5S Checklist Cards */}
          <div className="lg:col-span-8 flex flex-col gap-3 min-h-0">
            {activeAreaScore && (
              <>
                {/* Active Area Command Banner & Inline BOD/CUS/IE Steppers */}
                <div className="surface-card p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-black font-mono-kpi bg-sky-500/20 text-sky-300">
                          {activeAreaScore.area_code}
                        </span>
                        <h2 className="text-base sm:text-lg font-black tracking-tight">
                          {activeAreaScore.area_name}
                        </h2>
                      </div>
                      <p className="text-xs text-[var(--app-text-muted)] mt-0.5 font-mono-kpi">
                        {lang === 'en' ? 'Field' : 'Hiện trường'}: -{activeAreaScore.finding_penalty || 0} ·{' '}
                        {lang === 'en' ? 'External' : 'Ngoại quan'}: -{activeAreaScore.external_penalty || 0} ·{' '}
                        {lang === 'en' ? 'Total Penalty' : 'Tổng trừ'}: -{activeAreaScore.total_penalty || 0}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <ScoreBadge score={activeAreaScore.score} target={target} warningTarget={warningTarget} size="md" />
                      {isDraft && canEdit && (
                        <button
                          type="button"
                          onClick={() => openAddFindingModal(activeAreaScore.area_id)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black cursor-pointer min-h-[38px]"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{lang === 'en' ? 'Add Finding' : 'Thêm lỗi'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* External Audit Steppers (BOD, Customer, Internal IE) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--app-border)]">
                    {(
                      [
                        { field: 'bod_count' as const, label: 'BOD', val: activeAreaScore.bod_count || 0 },
                        { field: 'customer_count' as const, label: 'Customer', val: activeAreaScore.customer_count || 0 },
                        { field: 'ie_count' as const, label: 'IE Audit', val: activeAreaScore.ie_count || 0 },
                      ] as const
                    ).map((ext) => (
                      <div
                        key={ext.field}
                        className="surface-muted px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-bold text-[var(--app-text-muted)]">{ext.label}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!isDraft || !canEdit || ext.val <= 0 || savingExternalAreaId === activeAreaScore.area_id}
                            onClick={() => handleExternalStep(activeAreaScore, ext.field, -1)}
                            className="w-8 h-8 rounded-lg surface-elevated flex items-center justify-center disabled:opacity-35 cursor-pointer"
                            aria-label={`Decrease ${ext.label}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-black font-mono-kpi">{ext.val}</span>
                          <button
                            type="button"
                            disabled={!isDraft || !canEdit || savingExternalAreaId === activeAreaScore.area_id}
                            onClick={() => handleExternalStep(activeAreaScore, ext.field, 1)}
                            className="w-8 h-8 rounded-lg surface-elevated flex items-center justify-center disabled:opacity-35 cursor-pointer"
                            aria-label={`Increase ${ext.label}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checklist Filter Strip */}
                <div className="surface-card p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {(['all', 1, 2, 3, 4, 5] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSGroupFilter(g)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono-kpi font-bold cursor-pointer transition-colors ${
                          sGroupFilter === g
                            ? 'bg-sky-500 text-slate-950'
                            : 'surface-muted text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                        }`}
                      >
                        {g === 'all' ? (lang === 'en' ? 'All 5S' : 'Tất cả') : `S${g}`}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <Search className="w-3.5 h-3.5 text-[var(--app-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={checklistSearch}
                      onChange={(e) => setChecklistSearch(e.target.value)}
                      placeholder={lang === 'en' ? 'Search criterion...' : 'Tìm hạng mục...'}
                      className="surface-muted w-full pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--app-accent)]"
                    />
                  </div>
                </div>

                {/* Interactive Checklist Cards */}
                <div className="space-y-2.5">
                  {filteredChecklistItems.map((item) => {
                    const isNA = naSet.has(`${activeAreaScore.area_id}_${item.id}`);
                    const itemFindings = activeFindingsByItem.get(item.id) || [];
                    const isFail = !isNA && itemFindings.length > 0;
                    const busyKey = `${activeAreaScore.area_id}_${item.id}`;
                    const prevWeeksCount = prev_weeks_counts?.[`${activeAreaScore.area_id}_${item.id}`] || 0;

                    return (
                      <div
                        key={item.id}
                        className={`surface-card p-3.5 transition-colors ${
                          isFail
                            ? 'border-rose-500/45'
                            : isNA
                            ? 'opacity-65'
                            : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono-kpi font-black bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                                {item.code}
                              </span>
                              <span className="text-[11px] font-bold text-[var(--app-text-muted)]">
                                S{item.s_group} · {lang === 'en' ? item.location_en || item.location_vi : item.location_vi}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-kpi font-bold bg-rose-500/15 text-rose-400">
                                -{item.penalty}{t('pts_unit')}
                              </span>
                              {prevWeeksCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                                  {t('repeat_week', { n: prevWeeksCount + (isFail ? 0 : 1) })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold leading-snug">
                              {lang === 'en' ? item.content_en || item.content_vi : item.content_vi}
                            </p>
                          </div>

                          {/* Thumb-friendly Segmented Evaluation Controls */}
                          <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-start">
                            {isNA ? (
                              <span className="px-3 py-2 rounded-xl surface-muted text-xs font-mono-kpi font-bold text-[var(--app-text-muted)] min-h-[40px] flex items-center">
                                N/A
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={!isDraft || !canEdit || togglingKey === busyKey || !isFail}
                                  onClick={() => handleMarkPass(activeAreaScore.area_id, itemFindings)}
                                  className={`px-3 py-2 rounded-xl text-xs font-black min-h-[40px] flex items-center gap-1 transition-all cursor-pointer disabled:cursor-default ${
                                    !isFail
                                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                      : 'surface-muted text-[var(--app-text-muted)] hover:text-emerald-400'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{lang === 'en' ? 'PASS' : 'ĐẠT'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={!isDraft || !canEdit || togglingKey === busyKey}
                                  onClick={() => handleMarkFail(activeAreaScore.area_id, item, itemFindings)}
                                  className={`px-3 py-2 rounded-xl text-xs font-black min-h-[40px] flex items-center gap-1 transition-all cursor-pointer disabled:cursor-default ${
                                    isFail
                                      ? 'bg-rose-500 text-white shadow-sm'
                                      : 'surface-muted text-[var(--app-text-muted)] hover:text-rose-400'
                                  }`}
                                >
                                  {togglingKey === busyKey ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <span>
                                      {lang === 'en' ? `FAIL (-${item.penalty})` : `LỖI (-${item.penalty}đ)`}
                                    </span>
                                  )}
                                </button>
                                {isFail && isDraft && canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => openAddFindingModal(activeAreaScore.area_id, item.id)}
                                    className="p-2 rounded-xl surface-muted hover:border-[var(--app-border-strong)] min-h-[40px] cursor-pointer"
                                    title={lang === 'en' ? 'Add another finding for this criterion' : 'Thêm thêm lỗi cho tiêu chí này'}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Inline Finding Evidence Drawer (when failed) */}
                        {itemFindings.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[var(--app-border)] space-y-2.5">
                            {itemFindings.map((f) => {
                              const beforePhotos = (f.photos || []).filter((p) => p.kind === 'before');
                              return (
                                <div key={f.id} className="surface-muted p-3 space-y-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                      <StatusBadge status={f.status} type="finding" />
                                      <span className="font-mono-kpi font-bold text-rose-400">
                                        -{f.applied_penalty}{t('pts_unit')}
                                      </span>
                                      {f.repeat_level > 1 && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                                          {t('repeat_week', { n: f.repeat_level })}
                                        </span>
                                      )}
                                      <Link
                                        to={`/findings/${f.id}`}
                                        className="text-[11px] font-bold text-[var(--app-accent)] hover:underline ml-1"
                                      >
                                        CAPA #{f.id}
                                      </Link>
                                    </div>
                                    {canEdit && (isDraft || f.status === 'open') && (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => openEditModal(f)}
                                          className="p-1.5 rounded-lg surface-elevated hover:text-sky-400 cursor-pointer"
                                          title={t('edit')}
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        {isDraft && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteFinding(f.id)}
                                            className="p-1.5 rounded-lg surface-elevated hover:text-rose-400 cursor-pointer"
                                            title={t('delete')}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Inline description editor */}
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <textarea
                                      rows={2}
                                      disabled={!canEdit || (!isDraft && f.status !== 'open')}
                                      value={inlineDescs[f.id] ?? ''}
                                      onChange={(e) =>
                                        setInlineDescs((prev) => ({ ...prev, [f.id]: e.target.value }))
                                      }
                                      placeholder={
                                        lang === 'en'
                                          ? 'Describe specific violation & machine/line location...'
                                          : 'Mô tả cụ thể lỗi vi phạm, vị trí máy/line...'
                                      }
                                      className="surface-elevated flex-1 px-3 py-2 text-xs focus:outline-none focus:border-[var(--app-accent)]"
                                    />
                                    {canEdit && (isDraft || f.status === 'open') && (
                                      <button
                                        type="button"
                                        onClick={() => handleSaveInlineDesc(f.id)}
                                        disabled={savingDescId === f.id}
                                        className="px-3 py-2 rounded-xl surface-elevated hover:border-[var(--app-accent)] text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                      >
                                        {savingDescId === f.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Save className="w-3.5 h-3.5 text-sky-400" />
                                        )}
                                        <span>{lang === 'en' ? 'Save Note' : 'Lưu mô tả'}</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Inline Before Photo strip + 2K Camera Upload */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    {beforePhotos.map((p) => (
                                      <div
                                        key={p.id}
                                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--app-border)] group"
                                      >
                                        <img
                                          src={`/api/photos/${p.id}`}
                                          alt="Before"
                                          onClick={() => openPhotoLightbox(f.photos || [], p.id, f)}
                                          className="w-full h-full object-cover cursor-pointer"
                                        />
                                        {canEdit && (isDraft || f.status === 'open') && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeletePhoto(p.id)}
                                            className="absolute top-0.5 right-0.5 p-1 rounded bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            title={t('delete')}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    ))}

                                    {canEdit && (isDraft || f.status === 'open') && beforePhotos.length < 6 && (
                                      <label className="w-24 h-16 rounded-xl border border-dashed border-[var(--app-border-strong)] flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-[var(--app-accent)] hover:bg-[var(--app-accent-soft)] cursor-pointer">
                                        {uploadingFindingId === f.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <>
                                            <Camera className="w-4 h-4" />
                                            <span>{lang === 'en' ? '+ 2K Photo' : '+ Chụp 2K'}</span>
                                          </>
                                        )}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          capture="environment"
                                          className="hidden"
                                          onChange={(e) => {
                                            handleInlinePhotoUpload(f.id, e.target.files?.[0]);
                                            e.target.value = '';
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      ) : (
        /* MATRIX OVERVIEW MODE: FULL 15-AREA TABLE + FINDINGS SUMMARY */
        <section className="space-y-4">
          <div className="surface-card overflow-hidden">
            <div className="p-4 border-b border-[var(--app-border)] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider">
                  {t('external_audit_summary_table')}
                </h2>
                <p className="text-xs text-[var(--app-text-muted)]">{t('external_audit_subtitle')}</p>
              </div>
              {isDraft && canEdit && (
                <button
                  type="button"
                  onClick={() => openAddFindingModal()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-black cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('add_5s_finding')}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto scroll-pane">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--app-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                    <th className="py-3 px-4">{t('area_column')}</th>
                    <th className="py-3 px-3 text-center">BOD</th>
                    <th className="py-3 px-3 text-center">Customer</th>
                    <th className="py-3 px-3 text-center">IE Audit</th>
                    <th className="py-3 px-3 text-center">{lang === 'en' ? 'Field Pen' : 'Trừ HT'}</th>
                    <th className="py-3 px-3 text-center">{lang === 'en' ? 'Ext Pen' : 'Trừ NQ'}</th>
                    <th className="py-3 px-4 text-right">{t('score')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--app-border)]">
                  {area_scores.map((a) => (
                    <tr key={a.area_id} className="hover:bg-[var(--app-surface-muted)] transition-colors">
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAreaId(a.area_id);
                            setWorkspaceMode('split');
                          }}
                          className="font-bold hover:text-[var(--app-accent)] cursor-pointer text-left"
                        >
                          <span className="font-mono-kpi">{a.area_code}</span> · {a.area_name}
                        </button>
                      </td>
                      {(['bod_count', 'customer_count', 'ie_count'] as const).map((field) => (
                        <td key={field} className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!isDraft || !canEdit || (a[field] || 0) <= 0}
                              onClick={() => handleExternalStep(a, field, -1)}
                              className="w-6 h-6 rounded surface-muted flex items-center justify-center disabled:opacity-30 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 font-mono-kpi font-bold">{a[field] || 0}</span>
                            <button
                              type="button"
                              disabled={!isDraft || !canEdit}
                              onClick={() => handleExternalStep(a, field, 1)}
                              className="w-6 h-6 rounded surface-muted flex items-center justify-center disabled:opacity-30 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-center font-mono-kpi text-rose-400 font-bold">
                        -{a.finding_penalty || 0}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono-kpi text-amber-400 font-bold">
                        -{a.external_penalty || 0}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <ScoreBadge score={a.score} target={target} warningTarget={warningTarget} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* All recorded findings list in matrix mode */}
          <div className="surface-card p-4 space-y-3">
            <h3 className="text-sm font-black">
              {t('findings')} ({findings.length})
            </h3>
            {findings.length === 0 ? (
              <p className="text-xs text-[var(--app-text-muted)]">{t('noData')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {findings.map((f) => (
                  <div key={f.id} className="surface-muted p-3 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono-kpi font-black text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                          {f.area_code}
                        </span>
                        <span className="font-mono-kpi font-bold text-xs">{f.item_code}</span>
                        <StatusBadge status={f.status} type="finding" />
                        <span className="font-mono-kpi text-xs font-bold text-rose-400">
                          -{f.applied_penalty}{t('pts_unit')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold line-clamp-2">
                        {lang === 'en' ? f.content_en || f.content_vi : f.content_vi}
                      </p>
                      {f.description && (
                        <p className="text-xs text-[var(--app-text-muted)] italic line-clamp-2">
                          {f.description}
                        </p>
                      )}
                      {(f.photos || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => openPhotoLightbox(f.photos || [], f.photos![0].id, f)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--app-accent)] hover:underline cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>{f.photos!.length} photos</span>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAreaId(f.area_id);
                        setWorkspaceMode('split');
                      }}
                      className="text-xs font-bold text-[var(--app-accent)] hover:underline shrink-0 cursor-pointer"
                    >
                      Inspect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── AUDIT GENERAL NOTE CARD ──────────────────────────────────────────────────────── */}
      <section className="surface-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-[var(--app-text-muted)]">
            {t('note')}
          </label>
          {isDraft && canEdit && (
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={savingNote}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg surface-elevated text-xs font-bold cursor-pointer"
            >
              {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-sky-400" />}
              <span>{t('save')}</span>
            </button>
          )}
        </div>
        <textarea
          rows={2}
          disabled={!isDraft || !canEdit}
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder={lang === 'en' ? 'Weekly shift summary / special observations...' : 'Ghi chú tổng kết tuần audit...'}
          className="surface-muted w-full px-3 py-2 text-xs focus:outline-none focus:border-[var(--app-accent)]"
        />
      </section>

      {/* ── FULL-WIDTH STICKY ACTION BAR (NO max-w-7xl) ─────────────────────────────────── */}
      <div className="sticky bottom-2 z-20 surface-elevated px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-[var(--app-border-strong)]">
        <div className="flex items-center gap-3 text-xs font-mono-kpi">
          <ScoreBadge score={currentPlantScore} target={target} warningTarget={warningTarget} size="md" showStatusText />
          <span className="text-[var(--app-text-muted)]">
            {findings.length} {lang === 'en' ? 'findings' : 'lỗi'} · -{currentPlantPenalty || 0}{t('pts_unit')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isDraft && canEdit && (
            <button
              type="button"
              onClick={() => openAddFindingModal()}
              className="px-3.5 py-2 rounded-xl surface-muted hover:border-[var(--app-border-strong)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add_5s_finding')}</span>
            </button>
          )}

          {isDraft && permissions.canSubmit && (
            <button
              type="button"
              onClick={handleSubmitAudit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{t('submit')}</span>
            </button>
          )}

          {!isDraft && permissions.canReopen && (
            <button
              type="button"
              onClick={handleReopenAudit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>{t('reopen')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Finding Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={t('add_5s_finding')}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateFindingFromModal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t('area_column')}</label>
              <select
                required
                value={modalAreaId}
                onChange={(e) => setModalAreaId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
              >
                {area_scores.map((a) => (
                  <option key={a.area_id} value={a.area_id}>
                    {a.area_code} - {a.area_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{t('checklist')}</label>
              <select
                required
                value={modalItemId}
                onChange={(e) => setModalItemId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
              >
                {fieldChecklistItems.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    [{ci.code}] {lang === 'en' ? ci.content_en || ci.content_vi : ci.content_vi} (-{ci.penalty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t('finding_description')}</label>
            <textarea
              rows={3}
              value={modalDesc}
              onChange={(e) => setModalDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
              placeholder={lang === 'en' ? 'Describe location & issue...' : 'Mô tả chi tiết lỗi vi phạm...'}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t('before_photos')} ({modalPhotos.length}/6)</label>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-sky-700 cursor-pointer">
              <ImageIcon className="w-4 h-4" />
              <span>{lang === 'en' ? 'Select / Capture 2K Photos' : 'Chọn / Chụp ảnh 2K'}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleModalPhotoSelect} />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={savingModalFinding}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold cursor-pointer"
            >
              {savingModalFinding ? t('loading') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Finding Modal */}
      <Modal
        isOpen={!!editingFinding}
        onClose={() => setEditingFinding(null)}
        title={t('edit')}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateFindingFromModal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t('area_column')}</label>
              <select
                required
                value={editAreaId}
                onChange={(e) => setEditAreaId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
              >
                {area_scores.map((a) => (
                  <option key={a.area_id} value={a.area_id}>
                    {a.area_code} - {a.area_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{t('checklist')}</label>
              <select
                required
                value={editItemId}
                onChange={(e) => setEditItemId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
              >
                {fieldChecklistItems.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    [{ci.code}] {lang === 'en' ? ci.content_en || ci.content_vi : ci.content_vi}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t('finding_description')}</label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingFinding(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={savingEditFinding}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold cursor-pointer"
            >
              {savingEditFinding ? t('loading') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

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
