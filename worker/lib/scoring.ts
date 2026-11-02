/**
 * Pure scoring calculations for 5S audits.
 * No external imports.
 */

export const ESCALATION_STEP = 1; // 1 điểm per repeated week

export function calculateAppliedPenalty(
  basePenalty: number,
  repeatLevel: number,
  escalating: boolean | number
): number {
  const isEscalating = Boolean(escalating);
  const level = Math.max(1, Math.floor(repeatLevel));
  if (!isEscalating) {
    return Number(basePenalty.toFixed(2));
  }
  const penalty = basePenalty + ESCALATION_STEP * (level - 1);
  return Number(penalty.toFixed(2));
}

export function calculateWeeklyScore(appliedPenalties: number[]): {
  totalPenalty: number;
  score: number;
} {
  const total = appliedPenalties.reduce((sum, p) => sum + p, 0);
  const totalPenalty = Number(total.toFixed(2));
  const rawScore = 100 - totalPenalty;
  const score = Number(Math.max(0, rawScore).toFixed(2));
  return {
    totalPenalty,
    score,
  };
}

export function calculateMonthlyScore(submittedScores: number[]): number | null {
  if (submittedScores.length === 0) {
    return null;
  }
  const sum = submittedScores.reduce((acc, s) => acc + s, 0);
  const avg = sum / submittedScores.length;
  return Number(avg.toFixed(2));
}

export function isScorePassing(score: number, target: number): boolean {
  return score >= target;
}

export function getEscalatedRepeatLevel(
  oldAuditMonth: string,
  currentAuditMonth: string,
  oldRepeatLevel: number
): number {
  if (oldAuditMonth === currentAuditMonth) {
    return Math.max(1, oldRepeatLevel) + 1;
  }
  // Reset at the start of a new month
  return 1;
}

/**
 * Normalizes a historical score input from string, number, or ratio (e.g. 0.9 -> 90.0, 1 -> 100.0).
 * Returns rounded number in range [0, 100] or null if invalid/empty.
 */
export function cleanHistoricalScore(
  val: number | string | null | undefined
): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().replace(/%/g, '').replace(/,/g, '.');
  if (!str) return null;
  const num = Number(str);
  if (isNaN(num)) return null;
  let score = num;
  // If in range (0, 1] e.g. 0.9, 0.88, 1.0 (from Excel percentage cell), scale to 0..100
  if (num > 0 && num <= 1) {
    score = num * 100;
  }
  score = Math.max(0, Math.min(100, Math.round(score * 100) / 100));
  return score;
}
