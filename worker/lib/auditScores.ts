import type { D1Database } from '@cloudflare/workers-types';

export async function recalculateAuditScores(
  db: D1Database,
  auditId: number
): Promise<{
  totalPenalty: number;
  score: number;
  areaScores: any[];
}> {
  // 1. Ensure all active areas have a row in audit_area_scores
  await db
    .prepare(`
      INSERT OR IGNORE INTO audit_area_scores (
        audit_id, area_id, finding_penalty, bod_count, customer_count, ie_count, external_penalty, total_penalty, score
      )
      SELECT ?, id, 0, 0, 0, 0, 0, 0, 100
      FROM areas
      WHERE active = 1
    `)
    .bind(auditId)
    .run();

  // 2. Query finding penalties summed by area for this audit
  const findingSums = await db
    .prepare(`
      SELECT area_id, COALESCE(SUM(applied_penalty), 0) as finding_penalty
      FROM findings
      WHERE audit_id = ?
      GROUP BY area_id
    `)
    .bind(auditId)
    .all<{ area_id: number; finding_penalty: number }>();

  const findingPenaltyByArea = new Map<number, number>();
  for (const row of findingSums.results || []) {
    findingPenaltyByArea.set(row.area_id, Number(row.finding_penalty) || 0);
  }

  // 3. Query all rows in audit_area_scores for active areas
  const rows = await db
    .prepare(`
      SELECT aas.audit_id, aas.area_id, aas.bod_count, aas.customer_count, aas.ie_count
      FROM audit_area_scores aas
      JOIN areas ar ON ar.id = aas.area_id AND ar.active = 1
      WHERE aas.audit_id = ?
    `)
    .bind(auditId)
    .all<{
      audit_id: number;
      area_id: number;
      bod_count: number;
      customer_count: number;
      ie_count: number;
    }>();

  let plantTotalPenalty = 0;
  let plantScoreSum = 0;
  const activeAreas = rows.results || [];
  const activeCount = activeAreas.length;
  const updatedScores: any[] = [];

  for (const row of activeAreas) {
    const findingPenalty = Number((findingPenaltyByArea.get(row.area_id) || 0).toFixed(2));
    const bodCount = Math.max(0, row.bod_count || 0);
    const customerCount = Math.max(0, row.customer_count || 0);
    const ieCount = Math.max(0, row.ie_count || 0);
    // BOD (-4đ), Customer (-6đ), IE (-1đ)
    const externalPenalty = Number((bodCount * 4 + customerCount * 6 + ieCount * 1).toFixed(2));
    const totalPenalty = Number((findingPenalty + externalPenalty).toFixed(2));
    const score = Number(Math.max(0, 100 - totalPenalty).toFixed(2));

    await db
      .prepare(`
        UPDATE audit_area_scores
        SET finding_penalty = ?, external_penalty = ?, total_penalty = ?, score = ?
        WHERE audit_id = ? AND area_id = ?
      `)
      .bind(findingPenalty, externalPenalty, totalPenalty, score, auditId, row.area_id)
      .run();

    plantTotalPenalty += totalPenalty;
    plantScoreSum += score;
    updatedScores.push({
      area_id: row.area_id,
      finding_penalty: findingPenalty,
      bod_count: bodCount,
      customer_count: customerCount,
      ie_count: ieCount,
      external_penalty: externalPenalty,
      total_penalty: totalPenalty,
      score,
    });
  }

  const finalTotalPenalty = Number(plantTotalPenalty.toFixed(2));
  const finalScore = activeCount > 0 ? Number((plantScoreSum / activeCount).toFixed(2)) : 100;

  await db
    .prepare('UPDATE audits SET total_penalty = ?, score = ? WHERE id = ?')
    .bind(finalTotalPenalty, finalScore, auditId)
    .run();

  return {
    totalPenalty: finalTotalPenalty,
    score: finalScore,
    areaScores: updatedScores,
  };
}
