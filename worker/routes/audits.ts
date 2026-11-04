import { Hono } from 'hono';
import type { Env, Variables, Audit, Finding, Photo, ChecklistItem, Area } from '../types';
import { authMiddleware } from '../lib/auth';
import { isAdmin, isAuditor, canAuditArea } from '../lib/permissions';
import {
  getISOWeek,
  getVietnamToday,
  addDays,
  isSameISOWeek,
  isWeekLater,
} from '../lib/week';
import { calculateAppliedPenalty } from '../lib/scoring';
import { recalculateAuditScores } from '../lib/auditScores';
import { logActivity } from '../lib/activity';

export const auditsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

auditsRouter.use('/*', authMiddleware);

// GET /api/audits - List weekly plant audits with filters
auditsRouter.get('/', async (c) => {
  const month = c.req.query('month');
  const status = c.req.query('status');

  let query = `
    SELECT a.*, u.full_name as auditor_name
    FROM audits a
    JOIN users u ON u.id = a.auditor_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (month) {
    query += ' AND a.month = ?';
    params.push(month);
  }
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }

  query += ' ORDER BY a.iso_year DESC, a.iso_week DESC, a.week_start DESC';

  const res = await c.env.DB.prepare(query).bind(...params).all<any>();
  return c.json({ audits: res.results || [] });
});

// POST /api/audits - Create new draft weekly audit (1 audit for entire factory)
auditsRouter.post('/', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const body = await c.req.json().catch(() => ({}));
  const auditDate = String(body.audit_date || '').trim();
  const note = String(body.note || '').trim();

  if (!auditDate) {
    return c.json({ error: 'Audit date is required' }, 400);
  }

  // Permission check: Admin or plant-wide Auditor role
  const isAuditorOrAdmin = isAdmin(user) || isAuditor(user);
  if (!isAuditorOrAdmin) {
    return c.json({ error: 'Forbidden: Auditor or Admin role required to create an audit' }, 403);
  }

  // Audit date cannot be in the future (Vietnam time)
  const today = getVietnamToday();
  if (auditDate > today) {
    return c.json({ error: 'Audit date cannot be in the future' }, 400);
  }

  const { isoYear, isoWeek, weekStart, month } = getISOWeek(auditDate);

  // Block creating a new audit if there is already an open draft audit in the system
  const existingDraft = await c.env.DB
    .prepare("SELECT id, iso_year, iso_week FROM audits WHERE status = 'draft' LIMIT 1")
    .first<{ id: number; iso_year: number; iso_week: number }>();

  if (existingDraft) {
    return c.json({
      error: `Cannot create a new audit while draft audit (${existingDraft.iso_year}-W${existingDraft.iso_week}) is still open. Please submit or delete it first.`,
    }, 400);
  }

  // Check unique audit per week
  const existingSameWeek = await c.env.DB
    .prepare('SELECT id FROM audits WHERE iso_year = ? AND iso_week = ?')
    .bind(isoYear, isoWeek)
    .first();

  if (existingSameWeek) {
    return c.json({ error: `An audit for week ${isoYear}-W${isoWeek} already exists` }, 409);
  }

  // Sequence check: new audit's week must be later than latest existing audit
  const latestAudit = await c.env.DB
    .prepare('SELECT iso_year, iso_week FROM audits ORDER BY iso_year DESC, iso_week DESC LIMIT 1')
    .first<{ iso_year: number; iso_week: number }>();

  if (latestAudit && !isWeekLater(isoYear, isoWeek, latestAudit.iso_year, latestAudit.iso_week)) {
    return c.json({
      error: `New audit week (${isoYear}-W${isoWeek}) must be later than the latest audit in the system (${latestAudit.iso_year}-W${latestAudit.iso_week})`,
    }, 400);
  }

  let insertRes;
  try {
    insertRes = await c.env.DB
      .prepare(`
        INSERT INTO audits (auditor_id, audit_date, iso_year, iso_week, week_start, month, status, note, total_penalty, score)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, 0, 100)
      `)
      .bind(user.id, auditDate, isoYear, isoWeek, weekStart, month, note)
      .run();
  } catch (err: any) {
    if (err.message?.includes('UNIQUE') || err.cause?.message?.includes('UNIQUE')) {
      return c.json({ error: `An audit for week ${isoYear}-W${isoWeek} already exists` }, 409);
    }
    throw err;
  }

  const auditId = insertRes.meta.last_row_id as number;

  // Initialize audit_area_scores for all active areas and recalculate scores
  await recalculateAuditScores(c.env.DB, auditId);

  await logActivity(
    c.env.DB,
    user.id,
    'create_audit',
    'audit',
    auditId,
    `week=${isoYear}-W${isoWeek}, date=${auditDate}`
  );

  const audit = await c.env.DB
    .prepare('SELECT * FROM audits WHERE id = ?')
    .bind(auditId)
    .first<Audit>();

  return c.json({ audit }, 201);
});

// GET /api/audits/:id - Full plant-wide audit details
auditsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid audit ID' }, 400);
  }

  const audit = await c.env.DB
    .prepare(`
      SELECT a.*, u.full_name as auditor_name
      FROM audits a
      JOIN users u ON u.id = a.auditor_id
      WHERE a.id = ?
    `)
    .bind(id)
    .first<any>();

  if (!audit) {
    return c.json({ error: 'Audit not found' }, 404);
  }

  // Target for audit year
  const targetRow = await c.env.DB
    .prepare('SELECT target, COALESCE(warning_target, 90) as warning_target FROM yearly_targets WHERE year <= ? ORDER BY year DESC LIMIT 1')
    .bind(audit.iso_year)
    .first<{ target: number; warning_target?: number }>();
  const target = targetRow ? targetRow.target : 95;
  const warningTarget = targetRow ? (targetRow.warning_target ?? 90) : 90;

  // Area scores for active areas
  const areaScoresRes = await c.env.DB
    .prepare(`
      SELECT aas.*, ar.code as area_code, ar.name as area_name, ar.sort_order, ar.active as area_active
      FROM audit_area_scores aas
      JOIN areas ar ON ar.id = aas.area_id
      WHERE aas.audit_id = ? AND ar.active = 1
      ORDER BY ar.sort_order ASC, ar.code ASC
    `)
    .bind(id)
    .all<any>();

  // Active checklist items
  const checklistRes = await c.env.DB
    .prepare(`
      SELECT * FROM checklist_items
      WHERE active = 1
      ORDER BY s_group ASC, sort_order ASC, code ASC
    `)
    .all<ChecklistItem>();

  // NA matrix (area_id, item_id)
  const naRes = await c.env.DB
    .prepare('SELECT area_id, item_id FROM area_item_na')
    .all<{ area_id: number; item_id: number }>();

  // Findings in this audit
  const findingsRes = await c.env.DB
    .prepare(`
      SELECT f.*, ci.code as item_code, ci.s_group, ci.location_vi, ci.location_en,
             ci.content_vi, ci.content_en, ci.escalating,
             ar.code as area_code, ar.name as area_name
      FROM findings f
      JOIN checklist_items ci ON ci.id = f.item_id
      JOIN areas ar ON ar.id = f.area_id
      WHERE f.audit_id = ?
      ORDER BY ar.sort_order ASC, ar.code ASC, ci.s_group ASC, f.id ASC
    `)
    .bind(id)
    .all<any>();

  const findingIds = (findingsRes.results || []).map((f) => f.id);
  const photosByFinding = new Map<number, Photo[]>();

  if (findingIds.length > 0) {
    const placeholders = findingIds.map(() => '?').join(',');
    const photosRes = await c.env.DB
      .prepare(`SELECT * FROM photos WHERE finding_id IN (${placeholders}) ORDER BY id ASC`)
      .bind(...findingIds)
      .all<Photo>();

    for (const p of photosRes.results || []) {
      if (!photosByFinding.has(p.finding_id)) {
        photosByFinding.set(p.finding_id, []);
      }
      photosByFinding.get(p.finding_id)!.push(p);
    }
  }

  const findingsWithPhotos = (findingsRes.results || []).map((f) => ({
    ...f,
    photos: photosByFinding.get(f.id) || [],
  }));

  // Counts of distinct earlier weeks in the same month that violated each (area_id, item_id)
  const prevWeeksRes = await c.env.DB
    .prepare(`
      SELECT f.area_id, f.item_id, COUNT(DISTINCT a.id) as prev_weeks_count
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE a.month = ?
        AND a.status = 'submitted'
        AND a.id != ?
        AND (
          a.iso_year < ?
          OR (a.iso_year = ? AND a.iso_week < ?)
        )
      GROUP BY f.area_id, f.item_id
    `)
    .bind(audit.month, audit.id, audit.iso_year, audit.iso_year, audit.iso_week)
    .all<{ area_id: number; item_id: number; prev_weeks_count: number }>();

  const prevWeeksCounts: Record<string, number> = {};
  for (const row of prevWeeksRes.results || []) {
    prevWeeksCounts[`${row.area_id}_${row.item_id}`] = row.prev_weeks_count;
  }

  // Check if latest audit in system
  const newerAudit = await c.env.DB
    .prepare(`
      SELECT id FROM audits
      WHERE (iso_year > ? OR (iso_year = ? AND iso_week > ?))
      LIMIT 1
    `)
    .bind(audit.iso_year, audit.iso_year, audit.iso_week)
    .first();
  const isLatestAudit = !newerAudit;

  const isUserAdmin = isAdmin(user);
  const isUserAuditor = isAuditor(user);
  const canEdit = audit.status === 'draft' && (isUserAdmin || isUserAuditor);
  const canSubmit = canEdit;
  const canReopen = audit.status === 'submitted' && isUserAdmin && isLatestAudit;
  const canDelete = audit.status === 'draft' && (isUserAdmin || audit.auditor_id === user.id);

  const auditedAreaIds = isUserAdmin || isUserAuditor ? null : [];

  return c.json({
    audit,
    target,
    warning_target: warningTarget,
    area_scores: areaScoresRes.results || [],
    checklist_items: checklistRes.results || [],
    na_matrix: naRes.results || [],
    findings: findingsWithPhotos,
    prev_weeks_counts: prevWeeksCounts,
    live_score: {
      totalPenalty: audit.total_penalty ?? 0,
      score: audit.score ?? 100,
    },
    permissions: {
      canEdit,
      canSubmit,
      canReopen,
      canDelete,
      audited_area_ids: auditedAreaIds,
    },
  });
});

// PUT /api/audits/:id - Update draft audit (note, audit_date within same ISO week)
auditsRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid audit ID' }, 400);
  }

  const audit = await c.env.DB
    .prepare('SELECT * FROM audits WHERE id = ?')
    .bind(id)
    .first<Audit>();

  if (!audit) {
    return c.json({ error: 'Audit not found' }, 404);
  }
  if (audit.status !== 'draft') {
    return c.json({ error: 'Cannot modify a submitted audit' }, 400);
  }

  const isAuditorOrAdmin = isAdmin(user) || isAuditor(user);
  if (!isAuditorOrAdmin) {
    return c.json({ error: 'Forbidden: You are not authorized to edit this audit' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const note = body.note !== undefined ? String(body.note).trim() : audit.note;
  let auditDate = audit.audit_date;

  if (body.audit_date) {
    const newDate = String(body.audit_date).trim();
    const today = getVietnamToday();
    if (newDate > today) {
      return c.json({ error: 'Audit date cannot be in the future' }, 400);
    }
    if (!isSameISOWeek(newDate, audit.audit_date)) {
      return c.json({ error: 'Audit date can only be changed within the same ISO week' }, 400);
    }
    auditDate = newDate;

    // Update due_date of findings in this audit to new date + 7 days
    const newDueDate = addDays(auditDate, 7);
    await c.env.DB
      .prepare('UPDATE findings SET due_date = ? WHERE audit_id = ?')
      .bind(newDueDate, id)
      .run();
  }

  await c.env.DB
    .prepare('UPDATE audits SET note = ?, audit_date = ? WHERE id = ?')
    .bind(note, auditDate, id)
    .run();

  await logActivity(c.env.DB, user.id, 'update_audit', 'audit', id);

  return c.json({ ok: true, audit: { ...audit, note, audit_date: auditDate } });
});

// DELETE /api/audits/:id - Delete draft audit
auditsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid audit ID' }, 400);
  }

  const audit = await c.env.DB
    .prepare('SELECT * FROM audits WHERE id = ?')
    .bind(id)
    .first<Audit>();

  if (!audit) {
    return c.json({ error: 'Audit not found' }, 404);
  }
  if (audit.status !== 'draft') {
    return c.json({ error: 'Cannot delete a submitted audit' }, 400);
  }
  if (!isAdmin(user) && audit.auditor_id !== user.id) {
    return c.json({ error: 'Forbidden: Only the audit creator or Admin can delete this audit' }, 403);
  }

  // 1. Delete photos from R2 for findings of this audit
  const photosRes = await c.env.DB
    .prepare(`
      SELECT p.r2_key FROM photos p
      JOIN findings f ON f.id = p.finding_id
      WHERE f.audit_id = ?
    `)
    .bind(id)
    .all<{ r2_key: string }>();

  for (const p of photosRes.results || []) {
    try {
      await c.env.PHOTOS.delete(p.r2_key);
    } catch (e) {
      console.error('Failed to delete photo from R2:', p.r2_key, e);
    }
  }

  // 2. Delete audit (cascades findings, photos, and audit_area_scores in DB)
  await c.env.DB.prepare('DELETE FROM audits WHERE id = ?').bind(id).run();
  await logActivity(c.env.DB, user.id, 'delete_audit', 'audit', id);

  return c.json({ ok: true });
});

// POST /api/audits/:id/submit - Submit plant-wide weekly audit
auditsRouter.post('/:id/submit', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid audit ID' }, 400);
  }

  const audit = await c.env.DB
    .prepare('SELECT * FROM audits WHERE id = ?')
    .bind(id)
    .first<Audit>();

  if (!audit) {
    return c.json({ error: 'Audit not found' }, 404);
  }
  if (audit.status !== 'draft') {
    return c.json({ error: 'Audit is already submitted' }, 400);
  }

  const isAuditorOrAdmin = isAdmin(user) || isAuditor(user);
  if (!isAuditorOrAdmin) {
    return c.json({ error: 'Forbidden: You are not authorized to submit this audit' }, 403);
  }

  // Recalculate scores to ensure accuracy
  const { totalPenalty, score } = await recalculateAuditScores(c.env.DB, id);

  await c.env.DB
    .prepare(`
      UPDATE audits
      SET status = 'submitted', total_penalty = ?, score = ?, submitted_at = datetime('now')
      WHERE id = ?
    `)
    .bind(totalPenalty, score, id)
    .run();

  await logActivity(
    c.env.DB,
    user.id,
    'submit_audit',
    'audit',
    id,
    `score=${score}, penalty=${totalPenalty}`
  );

  return c.json({ ok: true, score, total_penalty: totalPenalty });
});

// POST /api/audits/:id/reopen - Admin reopens submitted audit to draft
auditsRouter.post('/:id/reopen', async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid audit ID' }, 400);
  }

  const audit = await c.env.DB
    .prepare('SELECT * FROM audits WHERE id = ?')
    .bind(id)
    .first<Audit>();

  if (!audit) {
    return c.json({ error: 'Audit not found' }, 404);
  }
  if (audit.status !== 'submitted') {
    return c.json({ error: 'Audit is not in submitted status' }, 400);
  }

  // Must be latest audit in the system (no newer audit exists)
  const newerAudit = await c.env.DB
    .prepare(`
      SELECT id FROM audits
      WHERE (iso_year > ? OR (iso_year = ? AND iso_week > ?))
      LIMIT 1
    `)
    .bind(audit.iso_year, audit.iso_year, audit.iso_week)
    .first();

  if (newerAudit) {
    return c.json({ error: 'Can only reopen the latest audit in the system' }, 400);
  }

  await c.env.DB
    .prepare("UPDATE audits SET status = 'draft', submitted_at = NULL WHERE id = ?")
    .bind(id)
    .run();

  await logActivity(c.env.DB, user.id, 'reopen_audit', 'audit', id);

  return c.json({ ok: true });
});

// POST /api/audits/:id/findings - Add finding with automatic penalty escalation in the same month
auditsRouter.post('/:id/findings', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid audit ID' }, 400);
  }

  const audit = await c.env.DB
    .prepare('SELECT * FROM audits WHERE id = ?')
    .bind(id)
    .first<Audit>();

  if (!audit) {
    return c.json({ error: 'Audit not found' }, 404);
  }
  if (audit.status !== 'draft') {
    return c.json({ error: 'Cannot add findings to a submitted audit' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const areaId = parseInt(body.area_id, 10);
  const itemId = parseInt(body.item_id, 10);
  const description = String(body.description || '').trim();

  if (isNaN(areaId) || isNaN(itemId)) {
    return c.json({ error: 'Area ID and checklist item ID are required' }, 400);
  }

  // Permission check for this area
  if (!canAuditArea(user, userAreas, areaId)) {
    return c.json({ error: 'Forbidden: You are not authorized to audit this area' }, 403);
  }

  // Validate active area
  const area = await c.env.DB
    .prepare('SELECT id, active, code FROM areas WHERE id = ?')
    .bind(areaId)
    .first<Area>();

  if (!area || area.active !== 1) {
    return c.json({ error: 'Area not found or inactive' }, 400);
  }

  // Validate checklist item is active
  const item = await c.env.DB
    .prepare('SELECT * FROM checklist_items WHERE id = ? AND active = 1')
    .bind(itemId)
    .first<ChecklistItem>();

  if (!item) {
    return c.json({ error: 'Checklist item is invalid or inactive' }, 400);
  }

  // External items S5.2-BOD, S5.2-CUS, S5.3 belong to the external table
  if (['S5.2-BOD', 'S5.2-CUS', 'S5.3'].includes(item.code)) {
    return c.json({
      error: 'External audit items (BOD, Customer, IE) are recorded in the external audit table, not as field findings',
    }, 400);
  }

  // Check Not Applicable (NA)
  const isNA = await c.env.DB
    .prepare('SELECT 1 FROM area_item_na WHERE area_id = ? AND item_id = ?')
    .bind(areaId, itemId)
    .first();

  if (isNA) {
    return c.json({ error: 'This checklist item is Not Applicable (NA) for this area' }, 400);
  }

  // Count distinct earlier weeks in the SAME month that already had a finding for this (area_id, item_id)
  const prevWeeksRes = await c.env.DB
    .prepare(`
      SELECT COUNT(DISTINCT a.id) as cnt
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.area_id = ?
        AND f.item_id = ?
        AND a.month = ?
        AND a.status = 'submitted'
        AND a.id != ?
        AND (
          a.iso_year < ?
          OR (a.iso_year = ? AND a.iso_week < ?)
        )
    `)
    .bind(areaId, itemId, audit.month, audit.id, audit.iso_year, audit.iso_year, audit.iso_week)
    .first<{ cnt: number }>();

  const prevWeeksCount = prevWeeksRes ? prevWeeksRes.cnt : 0;
  const repeatLevel = item.escalating === 1 ? 1 + prevWeeksCount : 1;
  const basePenalty = item.penalty;
  const appliedPenalty = calculateAppliedPenalty(basePenalty, repeatLevel, item.escalating === 1);

  // Latest finding ID from earlier weeks in same month for photo history chain
  const latestPrevRow = await c.env.DB
    .prepare(`
      SELECT f.id
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.area_id = ?
        AND f.item_id = ?
        AND a.month = ?
        AND a.status = 'submitted'
        AND a.id != ?
        AND (
          a.iso_year < ?
          OR (a.iso_year = ? AND a.iso_week < ?)
        )
      ORDER BY a.iso_year DESC, a.iso_week DESC, f.id DESC
      LIMIT 1
    `)
    .bind(areaId, itemId, audit.month, audit.id, audit.iso_year, audit.iso_year, audit.iso_week)
    .first<{ id: number }>();

  const prevFindingId = latestPrevRow ? latestPrevRow.id : null;
  const dueDate = addDays(audit.audit_date, 7);

  const insertRes = await c.env.DB
    .prepare(`
      INSERT INTO findings (
        audit_id, area_id, item_id, prev_finding_id, repeat_level, base_penalty, applied_penalty,
        description, status, due_date, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `)
    .bind(
      id,
      areaId,
      itemId,
      prevFindingId,
      repeatLevel,
      basePenalty,
      appliedPenalty,
      description,
      dueDate,
      user.id
    )
    .run();

  const newFindingId = insertRes.meta.last_row_id as number;

  // Recalculate audit scores after inserting finding
  await recalculateAuditScores(c.env.DB, id);

  await logActivity(
    c.env.DB,
    user.id,
    'add_finding',
    'finding',
    newFindingId,
    `area=${area.code}, item=${item.code}, repeat_level=${repeatLevel}, penalty=${appliedPenalty}`
  );

  const finding = await c.env.DB
    .prepare(`
      SELECT f.*, ci.code as item_code, ci.s_group, ci.location_vi, ci.location_en,
             ci.content_vi, ci.content_en, ci.escalating,
             ar.code as area_code, ar.name as area_name
      FROM findings f
      JOIN checklist_items ci ON ci.id = f.item_id
      JOIN areas ar ON ar.id = f.area_id
      WHERE f.id = ?
    `)
    .bind(newFindingId)
    .first<any>();

  return c.json({ finding: { ...finding, photos: [] } }, 201);
});

// PUT /api/audits/:id/external - Update BOD / Customer / Internal IE counts for area(s)
auditsRouter.put('/:id/external', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid audit ID' }, 400);
  }

  const audit = await c.env.DB
    .prepare('SELECT * FROM audits WHERE id = ?')
    .bind(id)
    .first<Audit>();

  if (!audit) {
    return c.json({ error: 'Audit not found' }, 404);
  }
  if (audit.status !== 'draft') {
    return c.json({ error: 'Cannot modify a submitted audit' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));

  // Support single area `{ area_id, bod_count, customer_count, ie_count }`
  // OR batch `{ areas: [{ area_id, bod_count, customer_count, ie_count }] }`
  const areaEntries: Array<{
    area_id: number;
    bod_count?: number;
    customer_count?: number;
    ie_count?: number;
  }> = Array.isArray(body.areas)
    ? body.areas
    : body.area_id !== undefined
    ? [body]
    : [];

  if (areaEntries.length === 0) {
    return c.json({ error: 'Area ID and counts are required' }, 400);
  }

  // Phase 1: Pre-validate ALL entries before modifying DB
  const parsedEntries: Array<{
    areaId: number;
    bodCount?: number;
    customerCount?: number;
    ieCount?: number;
  }> = [];

  for (const entry of areaEntries) {
    const areaId = parseInt(String(entry.area_id), 10);
    if (isNaN(areaId)) {
      return c.json({ error: 'Invalid area ID' }, 400);
    }
    if (!canAuditArea(user, userAreas, areaId)) {
      return c.json({ error: `Forbidden: Not authorized to audit area ID ${areaId}` }, 403);
    }

    const bodCount =
      entry.bod_count !== undefined
        ? Math.max(0, parseInt(String(entry.bod_count), 10) || 0)
        : undefined;
    const customerCount =
      entry.customer_count !== undefined
        ? Math.max(0, parseInt(String(entry.customer_count), 10) || 0)
        : undefined;
    const ieCount =
      entry.ie_count !== undefined
        ? Math.max(0, parseInt(String(entry.ie_count), 10) || 0)
        : undefined;

    parsedEntries.push({ areaId, bodCount, customerCount, ieCount });
  }

  // Verify all areas exist and are active
  const areaIds = [...new Set(parsedEntries.map((e) => e.areaId))];
  const placeholders = areaIds.map(() => '?').join(',');
  const activeAreasRes = await c.env.DB
    .prepare(`SELECT id FROM areas WHERE active = 1 AND id IN (${placeholders})`)
    .bind(...areaIds)
    .all<{ id: number }>();

  const activeAreaIdSet = new Set((activeAreasRes.results || []).map((a) => a.id));
  for (const aid of areaIds) {
    if (!activeAreaIdSet.has(aid)) {
      return c.json({ error: `Area ID ${aid} not found or inactive` }, 400);
    }
  }

  // Phase 2: Fetch existing values to preserve omitted fields
  const existingRows = await c.env.DB
    .prepare(
      `SELECT area_id, bod_count, customer_count, ie_count FROM audit_area_scores WHERE audit_id = ? AND area_id IN (${placeholders})`
    )
    .bind(id, ...areaIds)
    .all<{ area_id: number; bod_count: number; customer_count: number; ie_count: number }>();

  const existingMap = new Map<number, { bod_count: number; customer_count: number; ie_count: number }>();
  for (const row of existingRows.results || []) {
    existingMap.set(row.area_id, row);
  }

  // Phase 3: Execute updates safely
  for (const entry of parsedEntries) {
    const existing = existingMap.get(entry.areaId);
    const finalBod = entry.bodCount !== undefined ? entry.bodCount : existing?.bod_count ?? 0;
    const finalCustomer =
      entry.customerCount !== undefined ? entry.customerCount : existing?.customer_count ?? 0;
    const finalIe = entry.ieCount !== undefined ? entry.ieCount : existing?.ie_count ?? 0;

    await c.env.DB
      .prepare(`
        INSERT INTO audit_area_scores (audit_id, area_id, bod_count, customer_count, ie_count)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(audit_id, area_id) DO UPDATE SET
          bod_count = excluded.bod_count,
          customer_count = excluded.customer_count,
          ie_count = excluded.ie_count
      `)
      .bind(id, entry.areaId, finalBod, finalCustomer, finalIe)
      .run();
  }

  const recalculation = await recalculateAuditScores(c.env.DB, id);

  const updatedAreaScores = await c.env.DB
    .prepare(`
      SELECT aas.*, ar.code as area_code, ar.name as area_name, ar.sort_order
      FROM audit_area_scores aas
      JOIN areas ar ON ar.id = aas.area_id
      WHERE aas.audit_id = ? AND ar.active = 1
      ORDER BY ar.sort_order ASC, ar.code ASC
    `)
    .bind(id)
    .all<any>();

  await logActivity(c.env.DB, user.id, 'update_external_scores', 'audit', id);

  return c.json({
    ok: true,
    area_scores: updatedAreaScores.results || [],
    live_score: {
      totalPenalty: recalculation.totalPenalty,
      score: recalculation.score,
    },
  });
});
