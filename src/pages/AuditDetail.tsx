import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Minus,
  EyeOff,
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import type { Audit, AuditAreaScore, ChecklistItem, Finding, Photo } from '../api/types';
import { useI18n } from '../i18n/context';
import { formatScore } from '../lib/format';
import { formatMonthYear } from '../lib/date';
import {
  EXTERNAL_CHECKLIST_CODES,
  EXTERNAL_PENALTY_WEIGHTS,
  MAX_PHOTOS_PER_KIND,
  applyOptimisticExternalCounts,
  clampNonNegativeInt,
  computePreviewEscalation,
  getEligibleChecklistItems,
  mergeServerDescriptions,
  summarizeAuditReadiness,
} from '../lib/auditEntry';
import { StatusBadge } from '../components/StatusBadge';
import { ScoreBadge } from '../components/ScoreBadge';
import { Modal } from '../components/Modal';
import { Lightbox, type LightboxPhoto } from '../components/Lightbox';
import {
  PhotoApprovalModal,
  StagedPhotoTray,
  revokeStagedPhotos,
  type StagedPhoto,
} from '../components/PhotoApprovalModal';

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

type ExternalField = 'bod_count' | 'customer_count' | 'ie_count';

interface CriterionPickerProps {
  areaId: number | '';
  selectedItemId: number | '';
  onSelect: (itemId: number) => void;
  items: ChecklistItem[];
  naSet: ReadonlySet<string>;
  prevWeeksCounts?: Record<string, number>;
  disabled?: boolean;
  lang: 'vi' | 'en';
  t: (key: any, params?: Record<string, string | number>) => string;
}

const CriterionPicker: React.FC<CriterionPickerProps> = ({
  areaId,
  selectedItemId,
  onSelect,
  items,
  naSet,
  prevWeeksCounts,
  disabled = false,
  lang,
  t,
}) => {
  const [groupFilter, setGroupFilter] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');

  const eligible = useMemo(
    () => getEligibleChecklistItems(items, naSet, areaId),
    [items, naSet, areaId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return eligible.filter((ci) => {
      if (groupFilter !== 'all' && Number(ci.s_group) !== groupFilter) return false;
      if (q) {
        const hay = `${ci.code} ${ci.location_vi} ${ci.location_en} ${ci.content_vi} ${ci.content_en}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [eligible, groupFilter, query]);

  const selectedItem = eligible.find((ci) => ci.id === Number(selectedItemId)) || null;
  const selectedPrevCount =
    areaId && selectedItem ? prevWeeksCounts?.[`${areaId}_${selectedItem.id}`] || 0 : 0;
  const escalation = selectedItem
    ? computePreviewEscalation(selectedItem.penalty, selectedItem.escalating, selectedPrevCount)
    : null;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700">{t('select_criterion')}</span>
        <span className="text-[11px] font-mono text-slate-500">
          {filtered.length}/{eligible.length}
        </span>
      </div>

      {/* Group pills + search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {(['all', 1, 2, 3, 4, 5] as const).map((g) => (
            <button
              key={g}
              type="button"
              disabled={disabled}
              onClick={() => setGroupFilter(g)}
              className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 ${
                groupFilter === g
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {g === 'all' ? t('all') : `S${g}`}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            disabled={disabled}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                e.preventDefault();
              }
            }}
            placeholder={t('search_criterion_placeholder')}
            aria-label={t('search_criterion_placeholder')}
            className="w-full pl-8 pr-3 py-1.5 min-h-[36px] rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Scrollable criterion list */}
      <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/60">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">{t('no_eligible_criteria')}</div>
        ) : (
          filtered.map((ci) => {
            const isSelected = Number(selectedItemId) === ci.id;
            const prevCount = areaId ? prevWeeksCounts?.[`${areaId}_${ci.id}`] || 0 : 0;
            const preview = computePreviewEscalation(ci.penalty, ci.escalating, prevCount);
            const content = lang === 'en' ? ci.content_en || ci.content_vi : ci.content_vi;
            const loc = lang === 'en' ? ci.location_en || ci.location_vi : ci.location_vi;

            return (
              <button
                key={ci.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(ci.id)}
                className={`w-full text-left px-3 py-2.5 transition-colors flex items-start justify-between gap-2 cursor-pointer disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-sky-50 border-l-4 border-l-sky-600'
                    : 'hover:bg-white'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-black bg-sky-100 text-sky-800">
                      {ci.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      S{ci.s_group} · {loc}
                    </span>
                    {prevCount > 0 && ci.escalating === 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                        {t('repeat_week', { n: preview.repeatLevel })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 leading-snug">{content}</p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-mono font-black bg-rose-50 text-rose-600 border border-rose-200">
                  -{preview.appliedPenalty}
                  {t('pts_unit')}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Selected criterion escalation preview */}
      {selectedItem && escalation && (
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
            selectedPrevCount > 0 && selectedItem.escalating === 1
              ? 'bg-purple-50 border-purple-200 text-purple-900'
              : 'bg-sky-50/70 border-sky-200 text-sky-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">
              {t('selected_criterion_preview')}: [{selectedItem.code}]{' '}
              {lang === 'en'
                ? selectedItem.content_en || selectedItem.content_vi
                : selectedItem.content_vi}
            </div>
            <div className="text-[11px] font-medium">
              {selectedPrevCount > 0 && selectedItem.escalating === 1
                ? t('escalation_alert_text', {
                    n: selectedPrevCount,
                    pts: escalation.appliedPenalty,
                    w: escalation.repeatLevel,
                  })
                : t('first_time_violation_text', { pts: escalation.appliedPenalty })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AuditDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [detail, setDetail] = useState<AuditDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast feedback replacing blocking window.alert()
  const [toast, setToast] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(
    null
  );
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((type: 'error' | 'success' | 'info', message: string) => {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(
      () => setToast(null),
      type === 'error' ? 7000 : 4000
    );
  }, []);

  // Sample A Workspace Mode: Split-Screen Inspector by default, Matrix table toggle available
  const [workspaceMode, setWorkspaceMode] = useState<'split' | 'matrix'>('split');
  const [activeAreaId, setActiveAreaId] = useState<number | null>(null);
  const [areaSearch, setAreaSearch] = useState('');
  const [checklistSearch, setChecklistSearch] = useState('');
  const [sGroupFilter, setSGroupFilter] = useState<number | 'all'>('all');
  const [checklistStatusFilter, setChecklistStatusFilter] = useState<'all' | 'fail'>('all');
  const [hideNA, setHideNA] = useState(true);

  // Action & dirty-tracking states
  const [noteInput, setNoteInput] = useState('');
  const [noteDirty, setNoteDirty] = useState(false);
  const noteDirtyRef = useRef(false);
  const noteInputRef = useRef('');

  const [savingNote, setSavingNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingExternalAreaId, setSavingExternalAreaId] = useState<number | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const togglingKeyRef = useRef<string | null>(null);
  const [savingDescId, setSavingDescId] = useState<number | null>(null);

  const [inlineDescs, setInlineDescs] = useState<Record<number, string>>({});
  const inlineDescsRef = useRef<Record<number, string>>({});
  const [dirtyDescIds, setDirtyDescIds] = useState<Set<number>>(new Set());
  const dirtyDescIdsRef = useRef<Set<number>>(new Set());
  const [savedDescIds, setSavedDescIds] = useState<Record<number, boolean>>({});
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const pendingFocusFindingIdRef = useRef<number | null>(null);
  const inFlightDescSaveRef = useRef<
    Record<number, { text: string; promise: Promise<boolean> }>
  >({});
  const inFlightNoteSaveRef = useRef<{ text: string; promise: Promise<boolean> } | null>(null);

  // External counts optimistic + serialized per-area persistence refs
  const lastConfirmedAreaScoresRef = useRef<Record<number, AuditAreaScore>>({});
  const externalSeqCounterRef = useRef(0);
  const externalDesiredRef = useRef<
    Record<number, { counts: { bod_count: number; customer_count: number; ie_count: number }; seq: number }>
  >({});
  const externalSentSeqRef = useRef<Record<number, number>>({});
  const externalInFlightRef = useRef<Record<number, Promise<void>>>({});
  const externalTimersRef = useRef<Record<number, number>>({});
  const [editingExternalDraft, setEditingExternalDraft] = useState<{
    key: string;
    text: string;
  } | null>(null);

  // Inline Photo Approval Modal states (finding derived live from detail.findings)
  const [inlineApprovalFindingId, setInlineApprovalFindingId] = useState<number | null>(null);
  const [inlineApprovalFiles, setInlineApprovalFiles] = useState<File[]>([]);

  // Add / Edit Finding Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalAreaId, setModalAreaId] = useState<number | ''>('');
  const [modalItemId, setModalItemId] = useState<number | ''>('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalStagedPhotos, setModalStagedPhotos] = useState<StagedPhoto[]>([]);
  const modalStagedPhotosRef = useRef<StagedPhoto[]>([]);
  const [createdFindingIdInModal, setCreatedFindingIdInModal] = useState<number | null>(null);
  const [savingModalFinding, setSavingModalFinding] = useState(false);

  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [editAreaId, setEditAreaId] = useState<number | ''>('');
  const [editItemId, setEditItemId] = useState<number | ''>('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEditFinding, setSavingEditFinding] = useState(false);

  // Pre-Submit Review Modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<LightboxPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    modalStagedPhotosRef.current = modalStagedPhotos;
  }, [modalStagedPhotos]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      for (const timerId of Object.values(externalTimersRef.current)) {
        window.clearTimeout(timerId);
      }
      revokeStagedPhotos(modalStagedPhotosRef.current);
    };
  }, []);

  const fetchAudit = useCallback(
    async (silent = false): Promise<AuditDetailPayload | null> => {
      if (!id) return null;
      if (!silent) setLoading(true);
      try {
        const res = await api.get<AuditDetailPayload>(`/audits/${id}`);
        // Keep baseline confirmed scores for rollback, preserving any unsynced optimistic edits
        const confirmedMap: Record<number, AuditAreaScore> = {};
        for (const a of res.area_scores || []) {
          confirmedMap[a.area_id] = a;
        }
        lastConfirmedAreaScoresRef.current = confirmedMap;

        let mergedAreaScores = res.area_scores || [];
        let mergedLiveScore = res.live_score;
        for (const [aidStr, desired] of Object.entries(externalDesiredRef.current)) {
          const aid = Number(aidStr);
          if (desired.seq > (externalSentSeqRef.current[aid] || 0)) {
            const applied = applyOptimisticExternalCounts(
              mergedAreaScores,
              aid,
              desired.counts
            );
            mergedAreaScores = applied.areaScores;
            mergedLiveScore = applied.liveScore;
          }
        }

        setDetail({
          ...res,
          area_scores: mergedAreaScores,
          live_score: mergedLiveScore,
        });

        if (!noteDirtyRef.current) {
          const nextNote = res.audit.note || '';
          setNoteInput(nextNote);
          noteInputRef.current = nextNote;
        }

        setInlineDescs((prev) => {
          const merged = mergeServerDescriptions(
            prev,
            dirtyDescIdsRef.current,
            res.findings || []
          );
          inlineDescsRef.current = merged;
          return merged;
        });

        setActiveAreaId((prev) => {
          if (prev && res.area_scores.some((a) => a.area_id === prev)) return prev;
          return res.area_scores[0]?.area_id ?? null;
        });
        setError(null);
        return res;
      } catch (err: any) {
        setError(err?.message || 'Failed to load audit');
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    void fetchAudit(false);
  }, [fetchAudit]);

  // Auto-focus newly created finding textarea after FAIL click
  useEffect(() => {
    const targetId = pendingFocusFindingIdRef.current;
    if (!targetId) return;
    const el = textareaRefs.current[targetId];
    if (el) {
      pendingFocusFindingIdRef.current = null;
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [detail?.findings]);

  // Keep edit modal finding synced with fresh photos after upload/delete inside edit modal
  useEffect(() => {
    if (!editingFinding || !detail?.findings) return;
    const updated = detail.findings.find((f) => f.id === editingFinding.id);
    if (updated && updated !== editingFinding) {
      setEditingFinding(updated);
    }
  }, [detail?.findings, editingFinding]);

  const inlineApprovalFinding = useMemo(() => {
    if (inlineApprovalFindingId === null || !detail?.findings) return null;
    return detail.findings.find((f) => f.id === inlineApprovalFindingId) || null;
  }, [detail?.findings, inlineApprovalFindingId]);

  const naSet = useMemo(() => {
    const s = new Set<string>();
    for (const pair of detail?.na_matrix || []) {
      s.add(`${pair.area_id}_${pair.item_id}`);
    }
    return s;
  }, [detail?.na_matrix]);

  const fieldChecklistItems = useMemo(() => {
    return (detail?.checklist_items || []).filter(
      (item) => !EXTERNAL_CHECKLIST_CODES.has(item.code)
    );
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

  const activeAreaScore = useMemo(() => {
    const scores = detail?.area_scores || [];
    return scores.find((a) => a.area_id === activeAreaId) || scores[0] || null;
  }, [detail?.area_scores, activeAreaId]);

  const activeAreaFindings = useMemo(() => {
    if (!activeAreaScore || !detail?.findings) return [];
    return detail.findings.filter((f) => f.area_id === activeAreaScore.area_id);
  }, [activeAreaScore, detail?.findings]);

  const activeFindingsByItem = useMemo(() => {
    const map = new Map<number, Finding[]>();
    for (const f of activeAreaFindings) {
      const arr = map.get(f.item_id) || [];
      arr.push(f);
      map.set(f.item_id, arr);
    }
    return map;
  }, [activeAreaFindings]);

  const naCountForActiveArea = useMemo(() => {
    if (!activeAreaScore) return 0;
    let cnt = 0;
    for (const item of fieldChecklistItems) {
      if (naSet.has(`${activeAreaScore.area_id}_${item.id}`)) cnt++;
    }
    return cnt;
  }, [activeAreaScore, fieldChecklistItems, naSet]);

  const failCriteriaCountForActiveArea = useMemo(() => {
    if (!activeAreaScore) return 0;
    let cnt = 0;
    for (const item of fieldChecklistItems) {
      const isNA = naSet.has(`${activeAreaScore.area_id}_${item.id}`);
      if (!isNA && (activeFindingsByItem.get(item.id)?.length || 0) > 0) {
        cnt++;
      }
    }
    return cnt;
  }, [activeAreaScore, fieldChecklistItems, naSet, activeFindingsByItem]);

  const filteredChecklistItems = useMemo(() => {
    const q = checklistSearch.trim().toLowerCase();
    return fieldChecklistItems.filter((item) => {
      if (sGroupFilter !== 'all' && Number(item.s_group) !== sGroupFilter) return false;
      if (activeAreaScore) {
        const isNA = naSet.has(`${activeAreaScore.area_id}_${item.id}`);
        if (hideNA && isNA) return false;
        if (checklistStatusFilter === 'fail') {
          const hasFindings = (activeFindingsByItem.get(item.id)?.length || 0) > 0;
          if (isNA || !hasFindings) return false;
        }
      }
      if (q) {
        const hay = `${item.code} ${item.location_vi} ${item.location_en} ${item.content_vi} ${item.content_en}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    fieldChecklistItems,
    sGroupFilter,
    checklistSearch,
    activeAreaScore,
    naSet,
    hideNA,
    checklistStatusFilter,
    activeFindingsByItem,
  ]);

  // Keep modalItemId valid (non-N/A) whenever modalAreaId changes
  useEffect(() => {
    if (!addModalOpen || !modalAreaId) return;
    const eligible = getEligibleChecklistItems(fieldChecklistItems, naSet, modalAreaId);
    if (eligible.length > 0 && !eligible.some((ci) => ci.id === Number(modalItemId))) {
      setModalItemId(eligible[0].id);
    }
  }, [addModalOpen, modalAreaId, fieldChecklistItems, naSet, modalItemId]);

  useEffect(() => {
    if (!editingFinding || !editAreaId) return;
    const eligible = getEligibleChecklistItems(fieldChecklistItems, naSet, editAreaId);
    if (eligible.length > 0 && !eligible.some((ci) => ci.id === Number(editItemId))) {
      setEditItemId(eligible[0].id);
    }
  }, [editingFinding, editAreaId, fieldChecklistItems, naSet, editItemId]);

  const markFindingDirty = useCallback((findingId: number, dirty: boolean) => {
    const next = new Set(dirtyDescIdsRef.current);
    if (dirty) {
      next.add(findingId);
    } else {
      next.delete(findingId);
    }
    dirtyDescIdsRef.current = next;
    setDirtyDescIds(next);
  }, []);

  const flushExternalArea = useCallback(
    async (areaId: number): Promise<boolean> => {
      if (!detail?.audit) return true;
      const auditId = detail.audit.id;
      const timer = externalTimersRef.current[areaId];
      if (timer) {
        window.clearTimeout(timer);
        delete externalTimersRef.current[areaId];
      }

      const existingPromise = externalInFlightRef.current[areaId];
      if (existingPromise) {
        await existingPromise;
        const stillDirty =
          externalDesiredRef.current[areaId] &&
          externalDesiredRef.current[areaId].seq > (externalSentSeqRef.current[areaId] || 0);
        if (!stillDirty) return true;
        return flushExternalArea(areaId);
      }

      const desired = externalDesiredRef.current[areaId];
      if (!desired || desired.seq <= (externalSentSeqRef.current[areaId] || 0)) {
        return true;
      }

      let allOk = true;
      const run = (async () => {
        setSavingExternalAreaId(areaId);
        let attemptSeq = 0;
        try {
          while (
            externalDesiredRef.current[areaId] &&
            externalDesiredRef.current[areaId].seq > (externalSentSeqRef.current[areaId] || 0)
          ) {
            const snapshot = externalDesiredRef.current[areaId];
            attemptSeq = snapshot.seq;
            const res = await api.put<{
              area_scores: AuditAreaScore[];
              live_score: { totalPenalty: number; score: number };
            }>(`/audits/${auditId}/external`, {
              area_id: areaId,
              ...snapshot.counts,
            });

            externalSentSeqRef.current[areaId] = snapshot.seq;
            for (const a of res.area_scores || []) {
              if (a.area_id === areaId) {
                lastConfirmedAreaScoresRef.current[areaId] = a;
              }
            }
            if (externalDesiredRef.current[areaId]?.seq === snapshot.seq) {
              delete externalDesiredRef.current[areaId];
            }

            setDetail((prev) => {
              if (!prev) return prev;
              let mergedScores = res.area_scores || prev.area_scores;
              let computedLive = res.live_score || prev.live_score;
              for (const [pendingIdStr, pendingDesired] of Object.entries(
                externalDesiredRef.current
              )) {
                const pid = Number(pendingIdStr);
                if (pendingDesired.seq > (externalSentSeqRef.current[pid] || 0)) {
                  const pRes = applyOptimisticExternalCounts(
                    mergedScores,
                    pid,
                    pendingDesired.counts
                  );
                  mergedScores = pRes.areaScores;
                  computedLive = pRes.liveScore;
                }
              }
              return {
                ...prev,
                area_scores: mergedScores,
                live_score: computedLive,
              };
            });
          }
        } catch (err: any) {
          allOk = false;
          if (externalDesiredRef.current[areaId]?.seq === attemptSeq) {
            delete externalDesiredRef.current[areaId];
            const baseline = lastConfirmedAreaScoresRef.current[areaId];
            if (baseline) {
              setDetail((prev) => {
                if (!prev) return prev;
                const rolled = applyOptimisticExternalCounts(prev.area_scores, areaId, {
                  bod_count: baseline.bod_count,
                  customer_count: baseline.customer_count,
                  ie_count: baseline.ie_count,
                });
                return {
                  ...prev,
                  area_scores: rolled.areaScores,
                  live_score: rolled.liveScore,
                };
              });
            }
          }
          showToast('error', err?.message || 'Failed to update external counts');
        } finally {
          delete externalInFlightRef.current[areaId];
          setSavingExternalAreaId((cur) => (cur === areaId ? null : cur));
        }
      })();

      externalInFlightRef.current[areaId] = run;
      await run;
      return allOk;
    },
    [detail?.audit, showToast]
  );

  const flushAllPendingExternal = useCallback(async (): Promise<boolean> => {
    const areaIds = Array.from(
      new Set([
        ...Object.keys(externalTimersRef.current).map(Number),
        ...Object.keys(externalDesiredRef.current).map(Number),
        ...Object.keys(externalInFlightRef.current).map(Number),
      ])
    );
    if (areaIds.length === 0) return true;
    const results = await Promise.all(areaIds.map((aid) => flushExternalArea(aid)));
    return results.every(Boolean);
  }, [flushExternalArea]);

  const scheduleExternalUpdate = useCallback(
    (
      areaScore: AuditAreaScore,
      field: ExternalField,
      nextVal: number,
      immediate = false
    ) => {
      if (!detail || detail.audit.status !== 'draft' || !detail.permissions.canEdit) return;
      const clamped = clampNonNegativeInt(nextVal, 999);
      const currentPending = externalDesiredRef.current[areaScore.area_id]?.counts || {
        bod_count: areaScore.bod_count || 0,
        customer_count: areaScore.customer_count || 0,
        ie_count: areaScore.ie_count || 0,
      };
      const nextCounts = {
        ...currentPending,
        [field]: clamped,
      };

      externalSeqCounterRef.current += 1;
      externalDesiredRef.current[areaScore.area_id] = {
        counts: nextCounts,
        seq: externalSeqCounterRef.current,
      };

      // Instant optimistic update
      setDetail((prev) => {
        if (!prev) return prev;
        const optimistic = applyOptimisticExternalCounts(
          prev.area_scores,
          areaScore.area_id,
          nextCounts
        );
        return {
          ...prev,
          area_scores: optimistic.areaScores,
          live_score: optimistic.liveScore,
        };
      });

      const prevTimer = externalTimersRef.current[areaScore.area_id];
      if (prevTimer) {
        window.clearTimeout(prevTimer);
        delete externalTimersRef.current[areaScore.area_id];
      }

      if (immediate) {
        void flushExternalArea(areaScore.area_id);
      } else {
        externalTimersRef.current[areaScore.area_id] = window.setTimeout(() => {
          void flushExternalArea(areaScore.area_id);
        }, 350);
      }
    },
    [detail, flushExternalArea]
  );

  const handleSaveInlineDesc = useCallback(
    async (findingId: number): Promise<boolean> => {
      const sentText = inlineDescsRef.current[findingId] ?? '';
      const existingInFlight = inFlightDescSaveRef.current[findingId];
      if (existingInFlight && existingInFlight.text === sentText) {
        return existingInFlight.promise;
      }

      const entry: { text: string; promise: Promise<boolean> } = {
        text: sentText,
        promise: Promise.resolve(true),
      };
      entry.promise = (async () => {
        try {
          setSavingDescId(findingId);
          const res = await api.put<{ finding?: Finding }>(`/findings/${findingId}`, {
            description: sentText,
          });
          const latestLocal = inlineDescsRef.current[findingId] ?? '';
          const unchangedSinceSend = latestLocal === sentText;
          if (unchangedSinceSend) {
            markFindingDirty(findingId, false);
            setSavedDescIds((prev) => ({ ...prev, [findingId]: true }));
          }
          setDetail((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              findings: prev.findings.map((f) =>
                f.id === findingId
                  ? { ...f, description: res.finding?.description ?? sentText.trim() }
                  : f
              ),
            };
          });
          return true;
        } catch (err: any) {
          showToast('error', err?.message || 'Failed to save note');
          return false;
        } finally {
          if (inFlightDescSaveRef.current[findingId] === entry) {
            delete inFlightDescSaveRef.current[findingId];
          }
          setSavingDescId((cur) => (cur === findingId ? null : cur));
        }
      })();

      inFlightDescSaveRef.current[findingId] = entry;
      return entry.promise;
    },
    [markFindingDirty, showToast]
  );

  const handleBlurInlineDesc = useCallback(
    (finding: Finding) => {
      if (!dirtyDescIdsRef.current.has(finding.id)) return;
      const localTrimmed = (inlineDescsRef.current[finding.id] ?? '').trim();
      const serverTrimmed = (finding.description ?? '').trim();
      if (localTrimmed === serverTrimmed) {
        markFindingDirty(finding.id, false);
        return;
      }
      void handleSaveInlineDesc(finding.id);
    },
    [handleSaveInlineDesc, markFindingDirty]
  );

  const saveAuditNoteInternal = useCallback(
    async (showSuccessToast: boolean): Promise<boolean> => {
      if (!detail?.audit) return true;
      const sentNote = noteInputRef.current;
      const existing = inFlightNoteSaveRef.current;
      if (existing && existing.text === sentNote) {
        return existing.promise;
      }

      const entry: { text: string; promise: Promise<boolean> } = {
        text: sentNote,
        promise: Promise.resolve(true),
      };
      entry.promise = (async () => {
        try {
          setSavingNote(true);
          await api.put(`/audits/${detail.audit.id}`, { note: sentNote });
          if (noteInputRef.current === sentNote) {
            noteDirtyRef.current = false;
            setNoteDirty(false);
          }
          setDetail((prev) =>
            prev
              ? {
                  ...prev,
                  audit: {
                    ...prev.audit,
                    note: sentNote.trim(),
                  },
                }
              : prev
          );
          if (showSuccessToast) {
            showToast('success', t('saved_badge'));
          }
          return true;
        } catch (err: any) {
          showToast('error', err?.message || 'Failed to save audit note');
          return false;
        } finally {
          if (inFlightNoteSaveRef.current === entry) {
            inFlightNoteSaveRef.current = null;
          }
          setSavingNote(false);
        }
      })();

      inFlightNoteSaveRef.current = entry;
      return entry.promise;
    },
    [detail?.audit, showToast, t]
  );

  const flushDirtyFindingsAndNote = useCallback(async (): Promise<boolean> => {
    const dirtyIds = Array.from(dirtyDescIdsRef.current);
    for (const fid of dirtyIds) {
      const ok = await handleSaveInlineDesc(fid);
      if (!ok) return false;
    }
    if (noteDirtyRef.current) {
      const ok = await saveAuditNoteInternal(false);
      if (!ok) return false;
    }
    return true;
  }, [handleSaveInlineDesc, saveAuditNoteInternal]);

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

  const activeAreaIndex = activeAreaScore
    ? area_scores.findIndex((a) => a.area_id === activeAreaScore.area_id)
    : -1;
  const prevAreaObj = activeAreaIndex > 0 ? area_scores[activeAreaIndex - 1] : null;
  const nextAreaObj =
    activeAreaIndex >= 0 && activeAreaIndex < area_scores.length - 1
      ? area_scores[activeAreaIndex + 1]
      : null;

  const readiness = summarizeAuditReadiness(findings);
  const allBeforePhotos = findings.flatMap((f) =>
    (f.photos || [])
      .filter((p) => p.kind === 'before')
      .map((p) => ({
        id: p.id,
        kind: p.kind,
        area_code: f.area_code,
        item_code: f.item_code,
        description: f.description,
        finding_id: f.id,
      }))
  );

  const handleMarkPass = async (areaId: number, itemFindings: Finding[]) => {
    if (!isDraft || !canEdit || itemFindings.length === 0) return;
    const busyKey = `${areaId}_${itemFindings[0].item_id}`;
    if (togglingKeyRef.current) return;

    const hasData = itemFindings.some(
      (f) =>
        (inlineDescsRef.current[f.id] ?? f.description ?? '').trim() !== '' ||
        (f.photos || []).length > 0
    );
    if (hasData) {
      const ok = window.confirm(
        lang === 'en'
          ? 'Mark this criterion as PASS? Existing finding notes/photos on this row will be removed.'
          : 'Chuyển tiêu chí này về ĐẠT? Các ghi chú/ảnh lỗi hiện tại trên dòng này sẽ bị xóa.'
      );
      if (!ok) return;
    }

    togglingKeyRef.current = busyKey;
    try {
      setTogglingKey(busyKey);
      for (const f of itemFindings) {
        markFindingDirty(f.id, false);
        await api.delete(`/findings/${f.id}`);
      }
      await fetchAudit(true);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to clear finding');
    } finally {
      togglingKeyRef.current = null;
      setTogglingKey(null);
    }
  };

  const handleMarkFail = async (areaId: number, item: ChecklistItem, existing: Finding[]) => {
    if (!isDraft || !canEdit) return;
    if (existing.length > 0) return;
    const busyKey = `${areaId}_${item.id}`;
    if (togglingKeyRef.current) return;

    togglingKeyRef.current = busyKey;
    try {
      setTogglingKey(busyKey);
      const res = await api.post<{ finding?: Finding }>(`/audits/${audit.id}/findings`, {
        area_id: areaId,
        item_id: item.id,
        description: '',
      });
      if (res.finding?.id) {
        pendingFocusFindingIdRef.current = res.finding.id;
      }
      await fetchAudit(true);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to record finding');
    } finally {
      togglingKeyRef.current = null;
      setTogglingKey(null);
    }
  };

  const handleDeleteFinding = async (findingId: number) => {
    const ok = window.confirm(t('confirm_delete_finding'));
    if (!ok) return;
    try {
      markFindingDirty(findingId, false);
      await api.delete(`/findings/${findingId}`);
      await fetchAudit(true);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete finding');
    }
  };

  const handleInlinePhotoUploadBatch = async (
    findingId: number,
    blobs: Blob[],
    onProgress?: (done: number, total: number) => void
  ) => {
    let uploadedAny = false;
    try {
      for (let i = 0; i < blobs.length; i++) {
        const form = new FormData();
        form.append('file', blobs[i], 'before.jpg');
        form.append('kind', 'before');
        await api.post(`/findings/${findingId}/photos`, form);
        uploadedAny = true;
        onProgress?.(i + 1, blobs.length);
      }
    } finally {
      if (uploadedAny) {
        await fetchAudit(true);
      }
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    const ok = window.confirm(t('confirm_delete_photo'));
    if (!ok) return;
    try {
      await api.delete(`/photos/${photoId}`);
      await fetchAudit(true);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete photo');
    }
  };

  const handleSaveNote = async () => {
    await saveAuditNoteInternal(true);
  };

  const handleOpenSubmitReview = async () => {
    try {
      const extOk = await flushAllPendingExternal();
      if (!extOk) return;
      const ok = await flushDirtyFindingsAndNote();
      if (!ok) return;
      await fetchAudit(true);
      setSubmitModalOpen(true);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to flush pending edits');
    }
  };

  const handleConfirmSubmitAudit = async () => {
    try {
      setSubmitting(true);
      const extOk = await flushAllPendingExternal();
      if (!extOk) return;
      const ok = await flushDirtyFindingsAndNote();
      if (!ok) return;
      await api.put(`/audits/${audit.id}`, { note: noteInputRef.current });
      await api.post(`/audits/${audit.id}/submit`);
      setSubmitModalOpen(false);
      await fetchAudit(false);
      showToast('success', t('success'));
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to submit audit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenAudit = async () => {
    const ok = window.confirm(t('confirm_reopen_audit'));
    if (!ok) return;
    try {
      setSubmitting(true);
      await api.post(`/audits/${audit.id}/reopen`);
      await fetchAudit(false);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to reopen audit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAudit = async () => {
    const ok = window.confirm(t('confirm_delete_draft_audit'));
    if (!ok) return;
    try {
      await api.delete(`/audits/${audit.id}`);
      navigate('/audits');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete audit');
    }
  };

  const closeAddModal = () => {
    if (savingModalFinding) return;
    revokeStagedPhotos(modalStagedPhotos);
    setModalStagedPhotos([]);
    setCreatedFindingIdInModal(null);
    setAddModalOpen(false);
  };

  const openAddFindingModal = (presetAreaId?: number, presetItemId?: number) => {
    const targetAreaId = presetAreaId ?? activeAreaScore?.area_id ?? area_scores[0]?.area_id ?? '';
    const eligible = getEligibleChecklistItems(fieldChecklistItems, naSet, targetAreaId);
    const chosenItem =
      presetItemId && eligible.some((ci) => ci.id === presetItemId)
        ? presetItemId
        : eligible[0]?.id ?? '';

    revokeStagedPhotos(modalStagedPhotos);
    setModalStagedPhotos([]);
    setCreatedFindingIdInModal(null);
    setModalAreaId(targetAreaId);
    setModalItemId(chosenItem);
    setModalDesc('');
    setAddModalOpen(true);
  };

  const handleCreateFindingFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAreaId || !modalItemId) {
      showToast('error', t('error_select_area_and_item'));
      return;
    }
    try {
      setSavingModalFinding(true);
      let findingId = createdFindingIdInModal;

      if (!findingId) {
        const res = await api.post<{ finding: Finding }>(`/audits/${audit.id}/findings`, {
          area_id: Number(modalAreaId),
          item_id: Number(modalItemId),
          description: modalDesc,
        });
        findingId = res.finding?.id ?? null;
        if (findingId) {
          setCreatedFindingIdInModal(findingId);
        }
      } else if (modalDesc.trim() !== '') {
        await api.put(`/findings/${findingId}`, { description: modalDesc });
      }

      if (findingId && modalStagedPhotos.length > 0) {
        const queue = [...modalStagedPhotos];
        for (const staged of queue) {
          const form = new FormData();
          form.append('file', staged.blob, 'before.jpg');
          form.append('kind', 'before');
          await api.post(`/findings/${findingId}/photos`, form);
          setModalStagedPhotos((prev) => {
            const target = prev.find((p) => p.localId === staged.localId);
            if (target) revokeStagedPhotos([target]);
            return prev.filter((p) => p.localId !== staged.localId);
          });
        }
      }

      setCreatedFindingIdInModal(null);
      setAddModalOpen(false);
      await fetchAudit(true);
    } catch (err: any) {
      await fetchAudit(true);
      showToast('error', err?.message || 'Failed to save finding / photos');
    } finally {
      setSavingModalFinding(false);
    }
  };

  const openEditModal = (finding: Finding) => {
    setEditingFinding(finding);
    setEditAreaId(finding.area_id);
    setEditItemId(finding.item_id);
    setEditDesc(inlineDescsRef.current[finding.id] ?? finding.description ?? '');
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
      markFindingDirty(editingFinding.id, false);
      setEditingFinding(null);
      await fetchAudit(true);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update finding');
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

  const jumpToIncompleteFinding = (finding: Finding) => {
    setSubmitModalOpen(false);
    setWorkspaceMode('split');
    setActiveAreaId(finding.area_id);
    setSGroupFilter('all');
    setChecklistSearch('');
    setChecklistStatusFilter('all');
    pendingFocusFindingIdRef.current = finding.id;
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-3 sm:gap-4 pb-28 md:pb-24">
      {/* Inline Status Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-14 right-3 left-3 sm:left-auto sm:max-w-md z-[70] px-3.5 py-2.5 rounded-xl border shadow-xl flex items-center justify-between gap-3 text-xs font-bold ${
            toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/60 text-rose-100'
              : toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100'
              : 'bg-slate-900/95 border-sky-500/60 text-sky-100'
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label={t('close')}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                  type="button"
                  onClick={handleDeleteAudit}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                  title={t('delete')}
                  aria-label={t('delete')}
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
            {/* Mobile Horizontal Touch Area Selector (< 1024px) */}
            <div className="lg:hidden surface-card p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--app-text-muted)]">
                  {lang === 'en' ? 'SELECT AREA' : 'CHỌN KHU VỰC'} ({filteredAreas.length})
                </span>
                <select
                  value={activeAreaScore?.area_id || ''}
                  onChange={(e) => setActiveAreaId(Number(e.target.value))}
                  aria-label={lang === 'en' ? 'Select area' : 'Chọn khu vực'}
                  className="surface-muted px-2.5 py-1.5 text-xs font-bold text-[var(--app-accent)] focus:outline-none"
                >
                  {filteredAreas.map((a) => (
                    <option key={a.area_id} value={a.area_id}>
                      {a.area_name || a.area_code} ({formatScore(a.score, lang)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {filteredAreas.map((a) => {
                  const isActive = activeAreaScore?.area_id === a.area_id;
                  const areaFindings = findings.filter((f) => f.area_id === a.area_id);
                  const areaMissingPhoto = summarizeAuditReadiness(areaFindings).missingPhotoCount;
                  return (
                    <button
                      type="button"
                      key={a.area_id}
                      onClick={() => setActiveAreaId(a.area_id)}
                      className={`shrink-0 px-3 py-1.5 min-h-[38px] rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-xs'
                          : 'surface-elevated text-[var(--app-text)]'
                      }`}
                    >
                      <span className="truncate max-w-[120px]">{a.area_name || a.area_code}</span>
                      <span className={`font-mono-kpi text-[11px] font-black ${isActive ? 'text-slate-950' : 'text-[var(--app-accent)]'}`}>
                        {formatScore(a.score, lang)}
                      </span>
                      {areaFindings.length > 0 && (
                        <span className={`px-1 py-0.2 rounded text-[9px] font-mono-kpi font-black ${isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-rose-500/20 text-rose-400'}`}>
                          {areaFindings.length}
                        </span>
                      )}
                      {areaMissingPhoto > 0 && (
                        <span
                          title={t('readiness_missing_photos', { n: areaMissingPhoto })}
                          className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-900' : 'bg-amber-400'}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="surface-card p-3 hidden lg:flex flex-col gap-2.5 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-195px)]">
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
                    aria-label={lang === 'en' ? 'Find area' : 'Tìm khu vực'}
                    className="surface-muted w-full pl-7 pr-2 py-1 text-[11px] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div className="scroll-pane flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {filteredAreas.map((a) => {
                  const isActive = activeAreaScore?.area_id === a.area_id;
                  const areaFindings = findings.filter((f) => f.area_id === a.area_id);
                  const areaSummary = summarizeAuditReadiness(areaFindings);
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-black tracking-tight truncate">{a.area_name || a.area_code}</span>
                          {areaFindings.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-kpi font-bold bg-rose-500/20 text-rose-400">
                              {areaFindings.length} {lang === 'en' ? 'err' : 'lỗi'}
                            </span>
                          )}
                          {extTotal > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-kpi font-bold bg-amber-500/15 text-amber-400">
                              EXT:{extTotal}
                            </span>
                          )}
                          {areaSummary.missingPhotoCount > 0 && (
                            <span
                              title={t('readiness_missing_photos', { n: areaSummary.missingPhotoCount })}
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                            >
                              {t('missing_photo_tag')}
                            </span>
                          )}
                        </div>
                        {a.area_code && a.area_code !== a.area_name && (
                          <div className="text-[11px] font-mono-kpi text-[var(--app-text-muted)] truncate mt-0.5">
                            {a.area_code}
                          </div>
                        )}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-black font-mono-kpi bg-sky-500/20 text-sky-400">
                          {activeAreaScore.area_code}
                        </span>
                        <h2 className="text-base sm:text-lg font-black tracking-tight">
                          {activeAreaScore.area_name}
                        </h2>
                        <span className="text-[11px] font-mono-kpi text-[var(--app-text-muted)]">
                          ({activeAreaIndex + 1}/{area_scores.length})
                        </span>
                      </div>
                      <p className="text-xs text-[var(--app-text-muted)] mt-0.5 font-mono-kpi">
                        {lang === 'en' ? 'Field' : 'Hiện trường'}: -{activeAreaScore.finding_penalty || 0} ·{' '}
                        {lang === 'en' ? 'External' : 'Ngoại quan'}: -{activeAreaScore.external_penalty || 0} ·{' '}
                        {lang === 'en' ? 'Total Penalty' : 'Tổng trừ'}: -{activeAreaScore.total_penalty || 0}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Quick Prev / Next Area */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={!prevAreaObj}
                          onClick={() => prevAreaObj && setActiveAreaId(prevAreaObj.area_id)}
                          title={prevAreaObj ? `${t('prev_area')}: ${prevAreaObj.area_name}` : t('prev_area')}
                          aria-label={t('prev_area')}
                          className="p-2 min-w-[38px] min-h-[38px] rounded-xl surface-muted hover:border-[var(--app-border-strong)] disabled:opacity-35 cursor-pointer flex items-center justify-center"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={!nextAreaObj}
                          onClick={() => nextAreaObj && setActiveAreaId(nextAreaObj.area_id)}
                          title={nextAreaObj ? `${t('next_area')}: ${nextAreaObj.area_name}` : t('next_area')}
                          aria-label={t('next_area')}
                          className="p-2 min-w-[38px] min-h-[38px] rounded-xl surface-muted hover:border-[var(--app-border-strong)] disabled:opacity-35 cursor-pointer flex items-center justify-center"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

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

                  {/* External Audit Steppers (BOD, Customer, Internal IE) with direct numeric input + optimistic UI */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--app-border)]">
                    {(
                      [
                        {
                          field: 'bod_count' as const,
                          label: 'BOD',
                          weight: EXTERNAL_PENALTY_WEIGHTS.bod_count,
                          val: activeAreaScore.bod_count || 0,
                        },
                        {
                          field: 'customer_count' as const,
                          label: 'Customer',
                          weight: EXTERNAL_PENALTY_WEIGHTS.customer_count,
                          val: activeAreaScore.customer_count || 0,
                        },
                        {
                          field: 'ie_count' as const,
                          label: 'IE Audit',
                          weight: EXTERNAL_PENALTY_WEIGHTS.ie_count,
                          val: activeAreaScore.ie_count || 0,
                        },
                      ] as const
                    ).map((ext) => {
                      const inputId = `ext-split-${activeAreaScore.area_id}-${ext.field}`;
                      return (
                        <div
                          key={ext.field}
                          className="surface-muted px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <label htmlFor={inputId} className="text-xs font-bold text-[var(--app-text-muted)] flex flex-col">
                            <span>{ext.label}</span>
                            <span className="text-[10px] font-mono-kpi text-amber-400">
                              -{ext.weight}{t('pts_unit')}
                            </span>
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!isDraft || !canEdit || ext.val <= 0}
                              onClick={() =>
                                scheduleExternalUpdate(activeAreaScore, ext.field, ext.val - 1)
                              }
                              className="w-10 h-10 rounded-lg surface-elevated flex items-center justify-center disabled:opacity-35 cursor-pointer"
                              aria-label={`Decrease ${ext.label}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              id={inputId}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              disabled={!isDraft || !canEdit}
                              value={
                                editingExternalDraft?.key === inputId
                                  ? editingExternalDraft.text
                                  : String(ext.val)
                              }
                              onFocus={(e) => {
                                setEditingExternalDraft({ key: inputId, text: String(ext.val) });
                                e.currentTarget.select();
                              }}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                                setEditingExternalDraft({ key: inputId, text: cleaned });
                                if (cleaned !== '') {
                                  scheduleExternalUpdate(
                                    activeAreaScore,
                                    ext.field,
                                    clampNonNegativeInt(cleaned)
                                  );
                                }
                              }}
                              onBlur={() => {
                                if (editingExternalDraft?.key === inputId) {
                                  const finalNum = clampNonNegativeInt(editingExternalDraft.text);
                                  setEditingExternalDraft(null);
                                  if (finalNum !== ext.val) {
                                    scheduleExternalUpdate(activeAreaScore, ext.field, finalNum, true);
                                    return;
                                  }
                                }
                                void flushExternalArea(activeAreaScore.area_id);
                              }}
                              className="w-12 h-10 rounded-lg surface-elevated text-center text-sm font-black font-mono-kpi focus:outline-none focus:border-[var(--app-accent)]"
                            />
                            <button
                              type="button"
                              disabled={!isDraft || !canEdit}
                              onClick={() =>
                                scheduleExternalUpdate(activeAreaScore, ext.field, ext.val + 1)
                              }
                              className="w-10 h-10 rounded-lg surface-elevated flex items-center justify-center disabled:opacity-35 cursor-pointer"
                              aria-label={`Increase ${ext.label}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                        className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-mono-kpi font-bold cursor-pointer transition-colors ${
                          sGroupFilter === g
                            ? 'bg-sky-500 text-slate-950'
                            : 'surface-muted text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                        }`}
                      >
                        {g === 'all' ? (lang === 'en' ? 'All 5S' : 'Tất cả') : `S${g}`}
                      </button>
                    ))}

                    <span className="h-4 w-px bg-[var(--app-border)] mx-1 hidden sm:inline-block" />

                    <button
                      type="button"
                      onClick={() =>
                        setChecklistStatusFilter((prev) => (prev === 'all' ? 'fail' : 'all'))
                      }
                      className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        checklistStatusFilter === 'fail'
                          ? 'bg-rose-500 text-white'
                          : 'surface-muted text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                      }`}
                    >
                      {t('filter_fail_only', { n: failCriteriaCountForActiveArea })}
                    </button>

                    {naCountForActiveArea > 0 && (
                      <button
                        type="button"
                        onClick={() => setHideNA((prev) => !prev)}
                        className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                          hideNA
                            ? 'bg-sky-500/20 text-[var(--app-accent)] border border-[var(--app-accent)]/40'
                            : 'surface-muted text-[var(--app-text-muted)]'
                        }`}
                      >
                        {hideNA ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{t('toggle_hide_na', { n: naCountForActiveArea })}</span>
                      </button>
                    )}
                  </div>

                  <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <Search className="w-3.5 h-3.5 text-[var(--app-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={checklistSearch}
                      onChange={(e) => setChecklistSearch(e.target.value)}
                      placeholder={lang === 'en' ? 'Search criterion...' : 'Tìm hạng mục...'}
                      aria-label={lang === 'en' ? 'Search criterion' : 'Tìm hạng mục'}
                      className="surface-muted w-full pl-8 pr-2.5 py-1.5 min-h-[36px] text-xs focus:outline-none focus:border-[var(--app-accent)]"
                    />
                  </div>
                </div>

                {/* Interactive Checklist Cards */}
                <div className="space-y-2.5">
                  {filteredChecklistItems.length === 0 ? (
                    <div className="surface-card p-6 text-center text-xs text-[var(--app-text-muted)]">
                      {t('no_eligible_criteria')}
                    </div>
                  ) : (
                    filteredChecklistItems.map((item) => {
                      const isNA = naSet.has(`${activeAreaScore.area_id}_${item.id}`);
                      const itemFindings = activeFindingsByItem.get(item.id) || [];
                      const isFail = !isNA && itemFindings.length > 0;
                      const busyKey = `${activeAreaScore.area_id}_${item.id}`;
                      const prevWeeksCount = prev_weeks_counts?.[`${activeAreaScore.area_id}_${item.id}`] || 0;
                      const escalationPreview = computePreviewEscalation(
                        item.penalty,
                        item.escalating,
                        prevWeeksCount
                      );

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
                                  -{escalationPreview.appliedPenalty}{t('pts_unit')}
                                </span>
                                {prevWeeksCount > 0 && item.escalating === 1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    {t('repeat_week', { n: escalationPreview.repeatLevel })}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold leading-snug">
                                {lang === 'en' ? item.content_en || item.content_vi : item.content_vi}
                              </p>
                            </div>

                            {/* Thumb-friendly Segmented Evaluation Controls */}
                            <div className="shrink-0 flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end sm:self-start pt-1 sm:pt-0">
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
                                    className={`px-3 py-2 rounded-xl text-xs font-black min-h-[42px] flex-1 sm:flex-initial justify-center flex items-center gap-1 transition-all cursor-pointer disabled:cursor-default ${
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
                                    className={`px-3 py-2 rounded-xl text-xs font-black min-h-[42px] flex-1 sm:flex-initial justify-center flex items-center gap-1 transition-all cursor-pointer disabled:cursor-default ${
                                      isFail
                                        ? 'bg-rose-500 text-white shadow-sm'
                                        : 'surface-muted text-[var(--app-text-muted)] hover:text-rose-400'
                                    }`}
                                  >
                                    {togglingKey === busyKey ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <span>
                                        {lang === 'en'
                                          ? `FAIL (-${escalationPreview.appliedPenalty})`
                                          : `LỖI (-${escalationPreview.appliedPenalty}đ)`}
                                      </span>
                                    )}
                                  </button>
                                  {isFail && isDraft && canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => openAddFindingModal(activeAreaScore.area_id, item.id)}
                                      className="px-2.5 py-2 rounded-xl surface-muted hover:border-[var(--app-border-strong)] min-h-[42px] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                                      title={lang === 'en' ? 'Add another finding for this criterion' : 'Thêm thêm lỗi cho tiêu chí này'}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>{t('add_another_finding')}</span>
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
                                const isDirty = dirtyDescIds.has(f.id);
                                const isSavingRow = savingDescId === f.id;
                                const isSavedRecently = savedDescIds[f.id] && !isDirty && !isSavingRow;
                                const canMutateFinding = canEdit && (isDraft || f.status === 'open');
                                const descInputId = `finding-desc-${f.id}`;

                                return (
                                  <div key={f.id} className="surface-muted p-3 space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                        <StatusBadge status={f.status} type="finding" />
                                        <span className="font-mono-kpi font-bold text-rose-400">
                                          -{f.applied_penalty}{t('pts_unit')}
                                        </span>
                                        {f.repeat_level > 1 && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                            {t('repeat_week', { n: f.repeat_level })}
                                          </span>
                                        )}
                                        <Link
                                          to={`/findings/${f.id}`}
                                          className="text-[11px] font-bold text-[var(--app-accent)] hover:underline ml-1"
                                        >
                                          CAPA #{f.id}
                                        </Link>

                                        {/* Auto-save state indicator */}
                                        <span role="status" aria-live="polite" className="ml-1">
                                          {isSavingRow ? (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1">
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                              {t('saving_badge')}
                                            </span>
                                          ) : isDirty ? (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                              {t('unsaved_changes_badge')}
                                            </span>
                                          ) : isSavedRecently ? (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                              {t('saved_badge')}
                                            </span>
                                          ) : null}
                                        </span>
                                      </div>

                                      {canMutateFinding && (
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => openEditModal(f)}
                                            className="p-2 min-w-[36px] min-h-[36px] rounded-lg surface-elevated hover:text-sky-400 cursor-pointer flex items-center justify-center"
                                            title={t('edit')}
                                            aria-label={t('edit')}
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          {isDraft && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteFinding(f.id)}
                                              className="p-2 min-w-[36px] min-h-[36px] rounded-lg surface-elevated hover:text-rose-400 cursor-pointer flex items-center justify-center"
                                              title={t('delete')}
                                              aria-label={t('delete')}
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Inline description editor with auto-save on blur & IME-safe Ctrl+Enter */}
                                    <div className="space-y-1">
                                      <label htmlFor={descInputId} className="sr-only">
                                        {t('finding_description')}
                                      </label>
                                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                                        <textarea
                                          id={descInputId}
                                          ref={(el) => {
                                            textareaRefs.current[f.id] = el;
                                          }}
                                          rows={2}
                                          disabled={!canMutateFinding}
                                          value={inlineDescs[f.id] ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            inlineDescsRef.current = {
                                              ...inlineDescsRef.current,
                                              [f.id]: val,
                                            };
                                            setInlineDescs((prev) => ({ ...prev, [f.id]: val }));
                                            markFindingDirty(f.id, true);
                                            setSavedDescIds((prev) => ({ ...prev, [f.id]: false }));
                                          }}
                                          onBlur={() => handleBlurInlineDesc(f)}
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === 'Enter' &&
                                              (e.ctrlKey || e.metaKey)
                                            ) {
                                              if (e.nativeEvent.isComposing || e.keyCode === 229) {
                                                return;
                                              }
                                              e.preventDefault();
                                              void handleSaveInlineDesc(f.id);
                                            }
                                          }}
                                          placeholder={
                                            lang === 'en'
                                              ? 'Describe specific violation & machine/line location...'
                                              : 'Mô tả cụ thể lỗi vi phạm, vị trí máy/line...'
                                          }
                                          className="surface-elevated auto-grow-textarea flex-1 px-3 py-2 text-xs focus:outline-none focus:border-[var(--app-accent)]"
                                        />
                                        {canMutateFinding && (
                                          <button
                                            type="button"
                                            onClick={() => void handleSaveInlineDesc(f.id)}
                                            disabled={isSavingRow}
                                            className="px-3 py-2 min-h-[40px] rounded-xl surface-elevated hover:border-[var(--app-accent)] text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                          >
                                            {isSavingRow ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <Save className="w-3.5 h-3.5 text-sky-400" />
                                            )}
                                            <span>{lang === 'en' ? 'Save Note' : 'Lưu mô tả'}</span>
                                          </button>
                                        )}
                                      </div>
                                      {canMutateFinding && (
                                        <p className="text-[10px] text-[var(--app-text-muted)]">
                                          {t('autosave_hint')}
                                        </p>
                                      )}
                                    </div>

                                    {/* Inline Before Photo strip + Staged Preview Approval Trigger */}
                                    <div
                                      className="flex flex-wrap items-center gap-2 pt-1"
                                      onDragOver={(e) => {
                                        if (canMutateFinding) e.preventDefault();
                                      }}
                                      onDrop={(e) => {
                                        if (!canMutateFinding || !e.dataTransfer?.files?.length) return;
                                        e.preventDefault();
                                        setInlineApprovalFiles(Array.from(e.dataTransfer.files));
                                        setInlineApprovalFindingId(f.id);
                                      }}
                                    >
                                      {beforePhotos.map((p) => (
                                        <div
                                          key={p.id}
                                          className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--app-border)] group"
                                        >
                                          <img
                                            src={`/api/photos/${p.id}`}
                                            alt="Before"
                                            onClick={() => openPhotoLightbox(f.photos || [], p.id, f)}
                                            className="w-full h-full object-cover cursor-pointer"
                                            loading="lazy"
                                          />
                                          {canMutateFinding && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeletePhoto(p.id)}
                                              className="absolute top-1 right-1 p-1.5 rounded-lg bg-rose-600/90 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity cursor-pointer"
                                              title={t('delete')}
                                              aria-label={t('delete')}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}

                                      {canMutateFinding && beforePhotos.length < MAX_PHOTOS_PER_KIND && (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <label className="min-w-[82px] h-20 px-2.5 rounded-xl border border-dashed border-[var(--app-border-strong)] flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-[var(--app-accent)] hover:bg-[var(--app-accent-soft)] cursor-pointer">
                                            <Camera className="w-4 h-4" />
                                            <span>{t('btn_camera_capture')}</span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              capture="environment"
                                              className="hidden"
                                              onChange={(e) => {
                                                if (e.target.files?.length) {
                                                  setInlineApprovalFiles(Array.from(e.target.files));
                                                  setInlineApprovalFindingId(f.id);
                                                }
                                                e.target.value = '';
                                              }}
                                            />
                                          </label>

                                          <label className="min-w-[82px] h-20 px-2.5 rounded-xl border border-dashed border-[var(--app-border)] flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:border-[var(--app-border-strong)] cursor-pointer">
                                            <ImageIcon className="w-4 h-4" />
                                            <span>{t('btn_gallery_select')}</span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              multiple
                                              className="hidden"
                                              onChange={(e) => {
                                                if (e.target.files?.length) {
                                                  setInlineApprovalFiles(Array.from(e.target.files));
                                                  setInlineApprovalFindingId(f.id);
                                                }
                                                e.target.value = '';
                                              }}
                                            />
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                    {canMutateFinding && beforePhotos.length < MAX_PHOTOS_PER_KIND && (
                                      <p className="text-[10px] text-[var(--app-text-muted)]">
                                        {t('inline_photo_preview_hint')} ({beforePhotos.length}/{MAX_PHOTOS_PER_KIND})
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Quick Prev / Next Area Footer */}
                <div className="surface-card p-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={!prevAreaObj}
                    onClick={() => prevAreaObj && setActiveAreaId(prevAreaObj.area_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl surface-muted text-xs font-bold disabled:opacity-35 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="truncate max-w-[140px]">
                      {prevAreaObj ? prevAreaObj.area_name || prevAreaObj.area_code : t('prev_area')}
                    </span>
                  </button>
                  <span className="text-xs font-mono-kpi text-[var(--app-text-muted)]">
                    {activeAreaIndex + 1} / {area_scores.length}
                  </span>
                  <button
                    type="button"
                    disabled={!nextAreaObj}
                    onClick={() => nextAreaObj && setActiveAreaId(nextAreaObj.area_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl surface-muted text-xs font-bold disabled:opacity-35 cursor-pointer"
                  >
                    <span className="truncate max-w-[140px]">
                      {nextAreaObj ? nextAreaObj.area_name || nextAreaObj.area_code : t('next_area')}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-black cursor-pointer min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('add_5s_finding')}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto scroll-pane" tabIndex={0} role="region" aria-label={t('external_audit_summary_table')}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--app-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                    <th className="py-3 px-4">{t('area_column')}</th>
                    <th className="py-3 px-3 text-center">{t('bod_audit_col')}</th>
                    <th className="py-3 px-3 text-center">{t('customer_audit_col')}</th>
                    <th className="py-3 px-3 text-center">{t('ie_audit_col')}</th>
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
                      {(['bod_count', 'customer_count', 'ie_count'] as const).map((field) => {
                        const val = a[field] || 0;
                        const cellInputId = `ext-matrix-${a.area_id}-${field}`;
                        return (
                          <td key={field} className="py-2.5 px-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={!isDraft || !canEdit || val <= 0}
                                onClick={() => scheduleExternalUpdate(a, field, val - 1)}
                                aria-label={`Decrease ${field} for ${a.area_code}`}
                                className="w-9 h-9 rounded-lg surface-muted flex items-center justify-center disabled:opacity-30 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                id={cellInputId}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                aria-label={`${field} ${a.area_code}`}
                                disabled={!isDraft || !canEdit}
                                value={
                                  editingExternalDraft?.key === cellInputId
                                    ? editingExternalDraft.text
                                    : String(val)
                                }
                                onFocus={(e) => {
                                  setEditingExternalDraft({ key: cellInputId, text: String(val) });
                                  e.currentTarget.select();
                                }}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                                  setEditingExternalDraft({ key: cellInputId, text: cleaned });
                                  if (cleaned !== '') {
                                    scheduleExternalUpdate(a, field, clampNonNegativeInt(cleaned));
                                  }
                                }}
                                onBlur={() => {
                                  if (editingExternalDraft?.key === cellInputId) {
                                    const finalNum = clampNonNegativeInt(editingExternalDraft.text);
                                    setEditingExternalDraft(null);
                                    if (finalNum !== val) {
                                      scheduleExternalUpdate(a, field, finalNum, true);
                                      return;
                                    }
                                  }
                                  void flushExternalArea(a.area_id);
                                }}
                                className="w-10 h-9 rounded-lg surface-elevated text-center font-mono-kpi font-bold focus:outline-none focus:border-[var(--app-accent)]"
                              />
                              <button
                                type="button"
                                disabled={!isDraft || !canEdit}
                                onClick={() => scheduleExternalUpdate(a, field, val + 1)}
                                aria-label={`Increase ${field} for ${a.area_code}`}
                                className="w-9 h-9 rounded-lg surface-muted flex items-center justify-center disabled:opacity-30 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        );
                      })}
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
                        <span className="font-mono-kpi font-black text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="audit-general-note"
              className="text-xs font-black uppercase tracking-wider text-[var(--app-text-muted)]"
            >
              {t('note')}
            </label>
            {noteDirty && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {t('unsaved_changes_badge')}
              </span>
            )}
          </div>
          {isDraft && canEdit && (
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={savingNote}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg surface-elevated text-xs font-bold cursor-pointer"
            >
              {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-sky-400" />}
              <span>{t('save')}</span>
            </button>
          )}
        </div>
        <textarea
          id="audit-general-note"
          rows={2}
          disabled={!isDraft || !canEdit}
          value={noteInput}
          onChange={(e) => {
            const val = e.target.value;
            setNoteInput(val);
            noteInputRef.current = val;
            noteDirtyRef.current = true;
            setNoteDirty(true);
          }}
          onBlur={() => {
            if (noteDirtyRef.current && isDraft && canEdit) {
              void handleSaveNote();
            }
          }}
          placeholder={lang === 'en' ? 'Weekly shift summary / special observations...' : 'Ghi chú tổng kết tuần audit...'}
          className="surface-muted auto-grow-textarea w-full px-3 py-2 text-xs focus:outline-none focus:border-[var(--app-accent)]"
        />
      </section>

      {/* ── FULL-WIDTH STICKY ACTION BAR (safe above mobile bottom nav) ──────────────────── */}
      <div className="sticky bottom-16 md:bottom-2 z-20 surface-elevated px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-[var(--app-border-strong)]">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono-kpi">
          <ScoreBadge score={currentPlantScore} target={target} warningTarget={warningTarget} size="md" showStatusText />
          <span className="text-[var(--app-text-muted)]">
            {findings.length} {lang === 'en' ? 'findings' : 'lỗi'} · -{currentPlantPenalty || 0}{t('pts_unit')}
          </span>
          {(dirtyDescIds.size > 0 || savingExternalAreaId !== null) && (
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-sans text-[11px] font-bold">
              {savingExternalAreaId !== null ? t('saving_badge') : `${dirtyDescIds.size} ${t('unsaved_changes_badge')}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDraft && canEdit && (
            <button
              type="button"
              onClick={() => openAddFindingModal()}
              className="px-3.5 py-2 rounded-xl surface-muted hover:border-[var(--app-border-strong)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add_5s_finding')}</span>
            </button>
          )}

          {isDraft && permissions.canSubmit && (
            <button
              type="button"
              onClick={handleOpenSubmitReview}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer min-h-[42px]"
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
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer min-h-[42px]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>{t('reopen')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Finding Modal (N/A-filtered searchable picker + Staged Photo Preview Tray) */}
      <Modal
        isOpen={addModalOpen}
        onClose={closeAddModal}
        title={t('add_5s_finding')}
        maxWidth="xl"
      >
        <form onSubmit={handleCreateFindingFromModal} className="space-y-4">
          {createdFindingIdInModal && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              {t('retry_photo_upload_note', { id: createdFindingIdInModal })}
            </div>
          )}

          <div>
            <label htmlFor="modal-add-area" className="block text-xs font-bold text-slate-700 mb-1">
              {t('area_column')}
            </label>
            <select
              id="modal-add-area"
              required
              disabled={Boolean(createdFindingIdInModal) || savingModalFinding}
              value={modalAreaId}
              onChange={(e) => setModalAreaId(Number(e.target.value))}
              className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-slate-300 text-sm text-slate-900 bg-white disabled:opacity-60"
            >
              {area_scores.map((a) => (
                <option key={a.area_id} value={a.area_id}>
                  {a.area_code} - {a.area_name}
                </option>
              ))}
            </select>
          </div>

          <CriterionPicker
            areaId={modalAreaId}
            selectedItemId={modalItemId}
            onSelect={(idVal) => setModalItemId(idVal)}
            items={fieldChecklistItems}
            naSet={naSet}
            prevWeeksCounts={prev_weeks_counts}
            disabled={Boolean(createdFindingIdInModal) || savingModalFinding}
            lang={lang}
            t={t}
          />

          <div>
            <label htmlFor="modal-add-desc" className="block text-xs font-bold text-slate-700 mb-1">
              {t('finding_description')}
            </label>
            <textarea
              id="modal-add-desc"
              rows={3}
              disabled={savingModalFinding}
              value={modalDesc}
              onChange={(e) => setModalDesc(e.target.value)}
              className="auto-grow-textarea w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
              placeholder={lang === 'en' ? 'Describe location & issue...' : 'Mô tả chi tiết lỗi vi phạm...'}
            />
          </div>

          <StagedPhotoTray
            stagedPhotos={modalStagedPhotos}
            onChange={setModalStagedPhotos}
            kind="before"
            existingCount={
              createdFindingIdInModal
                ? (
                    findings.find((f) => f.id === createdFindingIdInModal)?.photos || []
                  ).filter((p) => p.kind === 'before').length
                : 0
            }
            maxPhotos={MAX_PHOTOS_PER_KIND}
            disabled={savingModalFinding}
            areaCode={area_scores.find((a) => a.area_id === Number(modalAreaId))?.area_code}
            itemCode={fieldChecklistItems.find((ci) => ci.id === Number(modalItemId))?.code}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              disabled={savingModalFinding}
              onClick={closeAddModal}
              className="px-4 py-2 min-h-[40px] rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={savingModalFinding || !modalItemId}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {savingModalFinding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{savingModalFinding ? t('saving') : t('save')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Finding Modal */}
      <Modal
        isOpen={!!editingFinding}
        onClose={() => {
          if (!inlineApprovalFinding && !lightboxOpen) {
            setEditingFinding(null);
          }
        }}
        title={t('edit_5s_finding')}
        maxWidth="xl"
      >
        <form onSubmit={handleUpdateFindingFromModal} className="space-y-4">
          <div>
            <label htmlFor="modal-edit-area" className="block text-xs font-bold text-slate-700 mb-1">
              {t('area_column')}
            </label>
            <select
              id="modal-edit-area"
              required
              value={editAreaId}
              onChange={(e) => setEditAreaId(Number(e.target.value))}
              className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
            >
              {area_scores.map((a) => (
                <option key={a.area_id} value={a.area_id}>
                  {a.area_code} - {a.area_name}
                </option>
              ))}
            </select>
          </div>

          <CriterionPicker
            areaId={editAreaId}
            selectedItemId={editItemId}
            onSelect={(idVal) => setEditItemId(idVal)}
            items={fieldChecklistItems}
            naSet={naSet}
            prevWeeksCounts={prev_weeks_counts}
            disabled={savingEditFinding}
            lang={lang}
            t={t}
          />

          <div>
            <label htmlFor="modal-edit-desc" className="block text-xs font-bold text-slate-700 mb-1">
              {t('finding_description')}
            </label>
            <textarea
              id="modal-edit-desc"
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="auto-grow-textarea w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
            />
          </div>

          {/* Existing Before Photos + Quick Add (opens PhotoApprovalModal) */}
          {editingFinding && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">
                  {t('existing_photos')} (
                  {(editingFinding.photos || []).filter((p) => p.kind === 'before').length}/
                  {MAX_PHOTOS_PER_KIND})
                </span>
                {(editingFinding.photos || []).filter((p) => p.kind === 'before').length <
                  MAX_PHOTOS_PER_KIND && (
                  <button
                    type="button"
                    onClick={() => {
                      setInlineApprovalFiles([]);
                      setInlineApprovalFindingId(editingFinding.id);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{t('add_more_photos')}</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(editingFinding.photos || [])
                  .filter((p) => p.kind === 'before')
                  .map((p) => (
                    <div
                      key={p.id}
                      className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={`/api/photos/${p.id}`}
                        alt="Before"
                        onClick={() =>
                          openPhotoLightbox(editingFinding.photos || [], p.id, editingFinding)
                        }
                        className="w-full h-full object-cover cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(p.id)}
                        aria-label={t('delete')}
                        className="absolute top-0.5 right-0.5 p-1.5 rounded bg-rose-600/90 text-white cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditingFinding(null)}
              className="px-4 py-2 min-h-[40px] rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={savingEditFinding || !editItemId}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {savingEditFinding ? t('saving') : t('save_changes')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Inline Photo Preview & Approval Modal (rendered after Edit Modal so it stacks above it) */}
      <PhotoApprovalModal
        isOpen={Boolean(inlineApprovalFinding)}
        onClose={() => {
          setInlineApprovalFindingId(null);
          setInlineApprovalFiles([]);
        }}
        kind="before"
        existingCount={
          (inlineApprovalFinding?.photos || []).filter((p) => p.kind === 'before').length
        }
        maxPhotos={MAX_PHOTOS_PER_KIND}
        initialFiles={inlineApprovalFiles}
        contextLabel={
          inlineApprovalFinding
            ? `${inlineApprovalFinding.area_code || ''} · ${inlineApprovalFinding.item_code || ''} · CAPA #${inlineApprovalFinding.id}`
            : undefined
        }
        onApproveUpload={(blobs, onProgress) =>
          inlineApprovalFinding
            ? handleInlinePhotoUploadBatch(inlineApprovalFinding.id, blobs, onProgress)
            : Promise.resolve()
        }
      />

      {/* Pre-Submit Review & Approval Modal */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => !submitting && setSubmitModalOpen(false)}
        title={t('submit_review_title')}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 font-medium">{t('submit_review_desc')}</p>

          {/* Summary KPI row */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                {t('plant_score_label')}
              </div>
              <div className="mt-1">
                <ScoreBadge score={currentPlantScore} target={target} warningTarget={warningTarget} size="md" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400">{t('penalty')}</div>
              <div className="text-lg font-black font-mono text-rose-600 mt-0.5">
                -{currentPlantPenalty || 0}{t('pts_unit')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400">{t('findings')}</div>
              <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                {readiness.totalFindings}
              </div>
            </div>
          </div>

          {/* Readiness Check */}
          {readiness.missingPhotoCount === 0 && readiness.missingDescCount === 0 ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{t('readiness_all_complete')}</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                {readiness.missingPhotoCount > 0 && (
                  <span>{t('readiness_missing_photos', { n: readiness.missingPhotoCount })}</span>
                )}
                {readiness.missingDescCount > 0 && (
                  <span>{t('readiness_missing_descs', { n: readiness.missingDescCount })}</span>
                )}
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {findings
                  .filter(
                    (f) =>
                      !(f.photos || []).some((p) => p.kind === 'before') ||
                      (f.description || '').trim() === ''
                  )
                  .map((f) => {
                    const noPhoto = !(f.photos || []).some((p) => p.kind === 'before');
                    const noDesc = (f.description || '').trim() === '';
                    return (
                      <div
                        key={f.id}
                        className="p-2 rounded-lg bg-white border border-amber-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-sky-700">{f.area_code}</span>
                          <span className="font-mono font-bold text-slate-700">{f.item_code}</span>
                          {noPhoto && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                              {t('missing_photo_tag')}
                            </span>
                          )}
                          {noDesc && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              {t('missing_desc_tag')}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => jumpToIncompleteFinding(f)}
                          className="text-xs font-bold text-sky-700 hover:underline shrink-0 cursor-pointer"
                        >
                          {t('jump_to_finding')} →
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Attached Before Photos Thumbnail Preview before Finalizing */}
          {allBeforePhotos.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-700">
                {t('before_photos')} ({allBeforePhotos.length})
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {allBeforePhotos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setLightboxPhotos(allBeforePhotos);
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer group"
                    title={t('click_to_zoom')}
                  >
                    <img
                      src={`/api/photos/${p.id}`}
                      alt={p.item_code || 'Before'}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-950/75 text-white text-[9px] font-mono text-center truncate px-0.5">
                      {p.area_code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setSubmitModalOpen(false)}
              className="px-4 py-2 min-h-[42px] rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmSubmitAudit}
              className="px-4 py-2 min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{t('btn_confirm_submit_audit')}</span>
            </button>
          </div>
        </div>
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
