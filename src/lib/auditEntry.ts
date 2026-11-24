/**
 * Pure utilities for 5S Audit score entry, findings filtering, escalation previews,
 * dirty-safe server state merging, and staged photo quota calculations.
 * Kept DOM-free so both browser components and Node unit tests can import directly.
 */

export const EXTERNAL_CHECKLIST_CODES = new Set(['S5.2-BOD', 'S5.2-CUS', 'S5.3']);
export const MAX_PHOTOS_PER_KIND = 6;
export const EXTERNAL_PENALTY_WEIGHTS = {
  bod_count: 4,
  customer_count: 6,
  ie_count: 1,
} as const;

export interface ChecklistFilterTarget {
  id: number;
  code: string;
}

/**
 * Returns checklist items eligible for field finding entry:
 * excludes external audit items (BOD/Customer/IE) and items marked N/A for the target area.
 */
export function getEligibleChecklistItems<T extends ChecklistFilterTarget>(
  items: readonly T[],
  naSet: ReadonlySet<string>,
  areaId: number | '' | null | undefined
): T[] {
  const numericAreaId =
    areaId === '' || areaId === null || areaId === undefined ? null : Number(areaId);
  const checkNA = numericAreaId !== null && Number.isFinite(numericAreaId);

  return items.filter((item) => {
    if (EXTERNAL_CHECKLIST_CODES.has(item.code)) return false;
    if (checkNA && naSet.has(`${numericAreaId}_${item.id}`)) return false;
    return true;
  });
}

/**
 * Computes repeat level and applied penalty preview matching worker/routes/audits.ts.
 */
export function computePreviewEscalation(
  basePenalty: number,
  escalating: number | boolean,
  prevWeeksCount: number
): { repeatLevel: number; appliedPenalty: number } {
  const prev = Math.max(0, Math.floor(Number(prevWeeksCount) || 0));
  const isEscalating = Boolean(escalating);
  const repeatLevel = isEscalating ? 1 + prev : 1;
  const appliedPenalty = isEscalating
    ? Number((basePenalty + (repeatLevel - 1)).toFixed(2))
    : Number(basePenalty.toFixed(2));
  return { repeatLevel, appliedPenalty };
}

/**
 * Merges server finding descriptions into local editor state without overwriting
 * rows currently marked dirty (in-progress edits not yet saved).
 */
export function mergeServerDescriptions(
  prevLocal: Readonly<Record<number, string>>,
  dirtyIds: ReadonlySet<number>,
  serverFindings: ReadonlyArray<{ id: number; description?: string | null }>
): Record<number, string> {
  const next: Record<number, string> = {};
  for (const finding of serverFindings) {
    if (dirtyIds.has(finding.id) && Object.prototype.hasOwnProperty.call(prevLocal, finding.id)) {
      next[finding.id] = prevLocal[finding.id];
    } else {
      next[finding.id] = finding.description ?? '';
    }
  }
  return next;
}

/**
 * Parses and clamps non-negative integer inputs (e.g. BOD / Customer / IE counts).
 */
export function clampNonNegativeInt(raw: string | number | null | undefined, max = 999): number {
  if (raw === null || raw === undefined) return 0;
  const str = String(raw).trim();
  if (!str) return 0;
  const num = typeof raw === 'number' ? raw : Number(str);
  if (Number.isFinite(num)) {
    return Math.max(0, Math.min(max, Math.floor(num)));
  }
  const parsed = parseInt(str, 10);
  if (isNaN(parsed)) return 0;
  return Math.max(0, Math.min(max, parsed));
}

/**
 * Returns remaining photo upload slots given already-uploaded and currently staged photos.
 */
export function getRemainingPhotoSlots(
  existingCount: number,
  stagedCount: number,
  maxPhotos = MAX_PHOTOS_PER_KIND
): number {
  const safeExisting = Math.max(0, Math.floor(Number(existingCount) || 0));
  const safeStaged = Math.max(0, Math.floor(Number(stagedCount) || 0));
  return Math.max(0, maxPhotos - (safeExisting + safeStaged));
}

/**
 * Formats byte sizes concisely for staged photo inspection badges.
 */
export function formatFileSize(bytes: number): string {
  const safe = Math.max(0, Number(bytes) || 0);
  if (safe < 1024) return `${Math.round(safe)} B`;
  if (safe < 1024 * 1024) return `${Math.round(safe / 1024)} KB`;
  return `${(safe / (1024 * 1024)).toFixed(2)} MB`;
}

export interface ReadinessFindingLike {
  id: number;
  area_id: number;
  description?: string | null;
  photos?: ReadonlyArray<{ kind?: string }>;
}

/**
 * Summarizes findings missing before photos or descriptions for pre-submit review.
 */
export function summarizeAuditReadiness<T extends ReadinessFindingLike>(
  findings: readonly T[]
): {
  totalFindings: number;
  missingPhotoCount: number;
  missingDescCount: number;
  missingPhotoFindings: T[];
  missingDescFindings: T[];
} {
  const missingPhotoFindings: T[] = [];
  const missingDescFindings: T[] = [];

  for (const f of findings) {
    const hasBeforePhoto = (f.photos || []).some((p) => !p.kind || p.kind === 'before');
    if (!hasBeforePhoto) {
      missingPhotoFindings.push(f);
    }
    if ((f.description ?? '').trim() === '') {
      missingDescFindings.push(f);
    }
  }

  return {
    totalFindings: findings.length,
    missingPhotoCount: missingPhotoFindings.length,
    missingDescCount: missingDescFindings.length,
    missingPhotoFindings,
    missingDescFindings,
  };
}

export interface OptimisticAreaScoreLike {
  area_id: number;
  finding_penalty: number;
  bod_count: number;
  customer_count: number;
  ie_count: number;
  external_penalty: number;
  total_penalty: number;
  score: number;
}

/**
 * Recomputes area external/total/score and plant live score optimistically
 * matching worker/lib/auditScores.ts.
 */
export function applyOptimisticExternalCounts<T extends OptimisticAreaScoreLike>(
  areaScores: readonly T[],
  areaId: number,
  counts: Partial<Record<'bod_count' | 'customer_count' | 'ie_count', number>>
): { areaScores: T[]; liveScore: { totalPenalty: number; score: number } } {
  const nextAreaScores = areaScores.map((a) => {
    if (a.area_id !== areaId) return a;
    const bod_count =
      counts.bod_count !== undefined ? clampNonNegativeInt(counts.bod_count) : clampNonNegativeInt(a.bod_count);
    const customer_count =
      counts.customer_count !== undefined
        ? clampNonNegativeInt(counts.customer_count)
        : clampNonNegativeInt(a.customer_count);
    const ie_count =
      counts.ie_count !== undefined ? clampNonNegativeInt(counts.ie_count) : clampNonNegativeInt(a.ie_count);

    const finding_penalty = Number((Number(a.finding_penalty) || 0).toFixed(2));
    const external_penalty = Number(
      (
        bod_count * EXTERNAL_PENALTY_WEIGHTS.bod_count +
        customer_count * EXTERNAL_PENALTY_WEIGHTS.customer_count +
        ie_count * EXTERNAL_PENALTY_WEIGHTS.ie_count
      ).toFixed(2)
    );
    const total_penalty = Number((finding_penalty + external_penalty).toFixed(2));
    const score = Number(Math.max(0, 100 - total_penalty).toFixed(2));

    return {
      ...a,
      bod_count,
      customer_count,
      ie_count,
      external_penalty,
      total_penalty,
      score,
    };
  });

  const count = nextAreaScores.length;
  const sumPenalty = nextAreaScores.reduce((acc, a) => acc + (Number(a.total_penalty) || 0), 0);
  const sumScore = nextAreaScores.reduce((acc, a) => acc + (Number(a.score) || 0), 0);

  return {
    areaScores: nextAreaScores,
    liveScore: {
      totalPenalty: Number(sumPenalty.toFixed(2)),
      score: count > 0 ? Number((sumScore / count).toFixed(2)) : 100,
    },
  };
}
