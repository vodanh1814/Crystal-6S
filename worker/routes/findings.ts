import { Hono } from 'hono';
import type { Env, Variables, Finding, Photo, Area, ChecklistItem } from '../types';
import { authMiddleware, optionalAuthMiddleware } from '../lib/auth';
import {
  isAdmin,
  canAuditArea,
  canManageArea,
  getAuditedAreaIds,
  getManagedAreaIds,
} from '../lib/permissions';
import { getVietnamToday, daysRemaining } from '../lib/week';
import { recalculateAuditScores } from '../lib/auditScores';
import { logActivity } from '../lib/activity';
import { calculateAppliedPenalty } from '../lib/scoring';

export const findingsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Optional auth on all findings routes so GET can be public while user session is loaded if present
findingsRouter.use('/*', optionalAuthMiddleware);

// Enforce auth on all mutation endpoints
findingsRouter.use('/*', async (c, next) => {
  const method = c.req.method;
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized: Authentication required for this action' }, 401);
    }
  }
  await next();
});

// GET /api/findings - List findings with filters and attached photos (public read)
findingsRouter.get('/', async (c) => {
  const user = c.get('user');
  const areaId = c.req.query('area_id');
  const status = c.req.query('status');
  const month = c.req.query('month');
  const repeatOnly = c.req.query('repeat') === '1';
  const overdueOnly = c.req.query('overdue') === '1';
  // Only authenticated non-viewer users may request draft findings
  const includeDraft = c.req.query('include_draft') === '1' && !!user && user.role !== 'viewer';

  const today = getVietnamToday();

  let query = `
    SELECT f.*, a.audit_date, a.month, a.iso_year, a.iso_week, a.status as audit_status,
           ar.code as area_code, ar.name as area_name,
           ci.code as item_code, ci.s_group, ci.location_vi, ci.location_en,
           ci.content_vi, ci.content_en, ci.escalating as item_escalating,
           u_creator.full_name as creator_name,
           u_fixer.full_name as fixer_name,
           u_verifier.full_name as verifier_name
    FROM findings f
    JOIN audits a ON a.id = f.audit_id
    JOIN areas ar ON ar.id = f.area_id
    JOIN checklist_items ci ON ci.id = f.item_id
    LEFT JOIN users u_creator ON u_creator.id = f.created_by
    LEFT JOIN users u_fixer ON u_fixer.id = f.fixed_by
    LEFT JOIN users u_verifier ON u_verifier.id = f.verified_by
    WHERE 1=1
  `;
  const params: any[] = [];

  if (!includeDraft) {
    query += " AND a.status = 'submitted'";
  }
  if (areaId) {
    query += ' AND f.area_id = ?';
    params.push(parseInt(areaId, 10));
  }
  if (status) {
    query += ' AND f.status = ?';
    params.push(status);
  }
  if (month) {
    query += ' AND a.month = ?';
    params.push(month);
  }
  if (repeatOnly) {
    query += ' AND f.repeat_level > 1';
  }
  if (overdueOnly) {
    query += " AND f.status = 'open' AND f.due_date < ?";
    params.push(today);
  }

  query += ' ORDER BY f.id DESC';

  const res = await c.env.DB.prepare(query).bind(...params).all<any>();
  const findings = res.results || [];

  // Batch-fetch photos for all findings in a single query
  const findingIds = findings.map((f: any) => f.id);
  const photosByFindingId = new Map<number, Photo[]>();

  if (findingIds.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < findingIds.length; i += chunkSize) {
      const chunk = findingIds.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      const photosRes = await c.env.DB
        .prepare(`SELECT * FROM photos WHERE finding_id IN (${placeholders}) ORDER BY id ASC`)
        .bind(...chunk)
        .all<Photo>();
      for (const p of photosRes.results || []) {
        if (!photosByFindingId.has(p.finding_id)) {
          photosByFindingId.set(p.finding_id, []);
        }
        photosByFindingId.get(p.finding_id)!.push(p);
      }
    }
  }

  // Compute days remaining, overdue flag, and attach photos
  const enriched = findings.map((f: any) => {
    const diff = daysRemaining(f.due_date, today);
    const photos = photosByFindingId.get(f.id) || [];
    const before_photos = photos.filter((p) => p.kind === 'before');
    const after_photos = photos.filter((p) => p.kind === 'after');
    return {
      ...f,
      days_remaining: diff,
      is_overdue: f.status === 'open' && diff < 0,
      photos,
      before_photos,
      after_photos,
    };
  });

  return c.json({ findings: enriched });
});

// GET /api/findings/alarms - Active alarms for header bell and dashboard
findingsRouter.get('/alarms', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ count: 0, mng_alarms: [], auditor_alarms: [] });
  }

  const userAreas = c.get('userAreas') || [];
  const today = getVietnamToday();

  const isUserAdmin = isAdmin(user);
  const auditedAreaIds = getAuditedAreaIds(user, userAreas);
  const managedAreaIds = getManagedAreaIds(user, userAreas);

  // 1. MNG Alarms: Open findings in managed areas (waiting for fix)
  let mngFindings: any[] = [];
  if (isUserAdmin || (managedAreaIds && managedAreaIds.length > 0)) {
    let mngQuery = `
      SELECT f.*, a.audit_date, a.month, a.iso_year, a.iso_week,
             ar.code as area_code, ar.name as area_name,
             ci.code as item_code, ci.s_group, ci.location_vi, ci.location_en,
             ci.content_vi, ci.content_en
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      JOIN areas ar ON ar.id = f.area_id
      JOIN checklist_items ci ON ci.id = f.item_id
      WHERE f.status = 'open' AND a.status = 'submitted'
    `;
    const params: any[] = [];
    if (!isUserAdmin && managedAreaIds) {
      mngQuery += ` AND f.area_id IN (${managedAreaIds.map(() => '?').join(',')})`;
      params.push(...managedAreaIds);
    }
    mngQuery += ' ORDER BY f.due_date ASC, f.id ASC';

    const res = await c.env.DB.prepare(mngQuery).bind(...params).all<any>();
    mngFindings = (res.results || []).map((f) => {
      const diff = daysRemaining(f.due_date, today);
      return {
        ...f,
        days_remaining: diff,
        is_overdue: diff < 0,
        alarm_type: 'mng_fix_needed',
      };
    });
  }

  // 2. Auditor Alarms: Fixed findings across all areas (waiting for verification by plant-wide Auditor or Admin)
  let auditorFindings: any[] = [];
  if (isUserAdmin || user.role === 'auditor') {
    const auQuery = `
      SELECT f.*, a.audit_date, a.month, a.iso_year, a.iso_week,
             ar.code as area_code, ar.name as area_name,
             ci.code as item_code, ci.s_group, ci.location_vi, ci.location_en,
             ci.content_vi, ci.content_en,
             u_fixer.full_name as fixer_name
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      JOIN areas ar ON ar.id = f.area_id
      JOIN checklist_items ci ON ci.id = f.item_id
      LEFT JOIN users u_fixer ON u_fixer.id = f.fixed_by
      WHERE f.status = 'fixed' AND a.status = 'submitted'
      ORDER BY f.fixed_at ASC, f.id ASC
    `;

    const res = await c.env.DB.prepare(auQuery).all<any>();
    auditorFindings = (res.results || []).map((f) => ({
      ...f,
      alarm_type: 'auditor_verify_needed',
    }));
  }

  const totalCount = mngFindings.length + auditorFindings.length;

  return c.json({
    count: totalCount,
    mng_alarms: mngFindings,
    auditor_alarms: auditorFindings,
  });
});

// GET /api/findings/:id - Finding detail with photos and history chain
findingsRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid finding ID' }, 400);
  }

  const finding = await c.env.DB
    .prepare(`
      SELECT f.*, a.audit_date, a.month, a.iso_year, a.iso_week, a.status as audit_status,
             ar.code as area_code, ar.name as area_name,
             ci.code as item_code, ci.s_group, ci.location_vi, ci.location_en,
             ci.content_vi, ci.content_en, ci.escalating as item_escalating,
             u_creator.full_name as creator_name,
             u_fixer.full_name as fixer_name,
             u_verifier.full_name as verifier_name
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      JOIN areas ar ON ar.id = f.area_id
      JOIN checklist_items ci ON ci.id = f.item_id
      LEFT JOIN users u_creator ON u_creator.id = f.created_by
      LEFT JOIN users u_fixer ON u_fixer.id = f.fixed_by
      LEFT JOIN users u_verifier ON u_verifier.id = f.verified_by
      WHERE f.id = ?
    `)
    .bind(id)
    .first<any>();

  if (!finding) {
    return c.json({ error: 'Finding not found' }, 404);
  }

  // Fetch photos for this finding
  const photosRes = await c.env.DB
    .prepare('SELECT * FROM photos WHERE finding_id = ? ORDER BY id ASC')
    .bind(id)
    .all<Photo>();

  // Fetch predecessor history chain
  const history: any[] = [];
  let currPrevId = finding.prev_finding_id;

  while (currPrevId) {
    const prevRow = await c.env.DB
      .prepare(`
        SELECT f.*, a.audit_date, a.month, a.iso_year, a.iso_week,
               ci.code as item_code, ci.s_group,
               u_creator.full_name as creator_name,
               u_fixer.full_name as fixer_name,
               u_verifier.full_name as verifier_name
        FROM findings f
        JOIN audits a ON a.id = f.audit_id
        JOIN checklist_items ci ON ci.id = f.item_id
        LEFT JOIN users u_creator ON u_creator.id = f.created_by
        LEFT JOIN users u_fixer ON u_fixer.id = f.fixed_by
        LEFT JOIN users u_verifier ON u_verifier.id = f.verified_by
        WHERE f.id = ?
      `)
      .bind(currPrevId)
      .first<any>();

    if (!prevRow) break;

    const prevPhotos = await c.env.DB
      .prepare('SELECT * FROM photos WHERE finding_id = ? ORDER BY id ASC')
      .bind(currPrevId)
      .all<Photo>();

    history.push({
      ...prevRow,
      photos: prevPhotos.results || [],
    });

    currPrevId = prevRow.prev_finding_id;
  }

  const today = getVietnamToday();
  const diff = daysRemaining(finding.due_date, today);

  return c.json({
    finding: {
      ...finding,
      days_remaining: diff,
      is_overdue: finding.status === 'open' && diff < 0,
      photos: photosRes.results || [],
      history,
    },
  });
});

// PUT /api/findings/:id - Update finding (area_id, item_id, description)
findingsRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid finding ID' }, 400);
  }

  const finding = await c.env.DB
    .prepare(`
      SELECT f.*, a.status as audit_status, a.audit_date, a.month, a.iso_year, a.iso_week
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.id = ?
    `)
    .bind(id)
    .first<any>();

  if (!finding) {
    return c.json({ error: 'Finding not found' }, 404);
  }

  // Can only edit if audit is draft OR if finding is still open in submitted audit
  if (finding.audit_status !== 'draft' && finding.status !== 'open') {
    return c.json({ error: 'Cannot edit a finding that has already been fixed or closed' }, 400);
  }

  // Permission check for the current area
  if (!canAuditArea(user, userAreas, finding.area_id)) {
    return c.json({ error: 'Forbidden: You are not authorized to edit this finding' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const targetAreaId = body.area_id !== undefined ? parseInt(body.area_id, 10) : finding.area_id;
  const targetItemId = body.item_id !== undefined ? parseInt(body.item_id, 10) : finding.item_id;
  const description = body.description !== undefined ? String(body.description || '').trim() : finding.description;

  if (isNaN(targetAreaId) || isNaN(targetItemId)) {
    return c.json({ error: 'Valid area ID and checklist item ID are required' }, 400);
  }

  // If area changed, check permission for new area
  if (targetAreaId !== finding.area_id && !canAuditArea(user, userAreas, targetAreaId)) {
    return c.json({ error: 'Forbidden: You are not authorized to assign findings to this area' }, 403);
  }

  const areaOrItemChanged = targetAreaId !== finding.area_id || targetItemId !== finding.item_id;

  if (areaOrItemChanged) {
    // Validate target area
    const area = await c.env.DB
      .prepare('SELECT id, active, code FROM areas WHERE id = ?')
      .bind(targetAreaId)
      .first<Area>();

    if (!area || area.active !== 1) {
      return c.json({ error: 'Area not found or inactive' }, 400);
    }

    // Validate target checklist item
    const item = await c.env.DB
      .prepare('SELECT * FROM checklist_items WHERE id = ? AND active = 1')
      .bind(targetItemId)
      .first<ChecklistItem>();

    if (!item) {
      return c.json({ error: 'Checklist item is invalid or inactive' }, 400);
    }

    // External items check
    if (['S5.2-BOD', 'S5.2-CUS', 'S5.3'].includes(item.code)) {
      return c.json({
        error: 'External audit items (BOD, Customer, IE) are recorded in the external audit table, not as field findings',
      }, 400);
    }

    // NA check
    const isNA = await c.env.DB
      .prepare('SELECT 1 FROM area_item_na WHERE area_id = ? AND item_id = ?')
      .bind(targetAreaId, targetItemId)
      .first();

    if (isNA) {
      return c.json({ error: 'This checklist item is Not Applicable (NA) for this area' }, 400);
    }

    // Recalculate repeat_level, base_penalty, applied_penalty, and prev_finding_id
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
      .bind(targetAreaId, targetItemId, finding.month, finding.audit_id, finding.iso_year, finding.iso_year, finding.iso_week)
      .first<{ cnt: number }>();

    const prevWeeksCount = prevWeeksRes ? prevWeeksRes.cnt : 0;
    const repeatLevel = item.escalating === 1 ? 1 + prevWeeksCount : 1;
    const basePenalty = item.penalty;
    const appliedPenalty = calculateAppliedPenalty(basePenalty, repeatLevel, item.escalating === 1);

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
      .bind(targetAreaId, targetItemId, finding.month, finding.audit_id, finding.iso_year, finding.iso_year, finding.iso_week)
      .first<{ id: number }>();

    const prevFindingId = latestPrevRow ? latestPrevRow.id : null;

    await c.env.DB
      .prepare(`
        UPDATE findings
        SET area_id = ?,
            item_id = ?,
            description = ?,
            repeat_level = ?,
            base_penalty = ?,
            applied_penalty = ?,
            prev_finding_id = ?
        WHERE id = ?
      `)
      .bind(targetAreaId, targetItemId, description, repeatLevel, basePenalty, appliedPenalty, prevFindingId, id)
      .run();

    // Recalculate audit scores after modifying finding's area or penalty
    await recalculateAuditScores(c.env.DB, finding.audit_id);
  } else {
    // Only description changed
    await c.env.DB
      .prepare('UPDATE findings SET description = ? WHERE id = ?')
      .bind(description, id)
      .run();
  }

  await logActivity(
    c.env.DB,
    user.id,
    'update_finding',
    'finding',
    id,
    `area_id=${targetAreaId}, item_id=${targetItemId}`
  );

  const updatedFinding = await c.env.DB
    .prepare(`
      SELECT f.*, ci.code as item_code, ci.s_group, ci.location_vi, ci.location_en,
             ci.content_vi, ci.content_en, ci.escalating,
             ar.code as area_code, ar.name as area_name
      FROM findings f
      JOIN checklist_items ci ON ci.id = f.item_id
      JOIN areas ar ON ar.id = f.area_id
      WHERE f.id = ?
    `)
    .bind(id)
    .first<any>();

  return c.json({ ok: true, finding: updatedFinding });
});

// DELETE /api/findings/:id - Delete draft finding
findingsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid finding ID' }, 400);
  }

  const finding = await c.env.DB
    .prepare(`
      SELECT f.*, a.status as audit_status
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.id = ?
    `)
    .bind(id)
    .first<any>();

  if (!finding) {
    return c.json({ error: 'Finding not found' }, 404);
  }
  if (finding.audit_status !== 'draft') {
    return c.json({ error: 'Cannot delete finding in a submitted audit' }, 400);
  }
  if (!canAuditArea(user, userAreas, finding.area_id)) {
    return c.json({ error: 'Forbidden: You are not authorized to delete this finding' }, 403);
  }

  // Delete photos from R2
  const photosRes = await c.env.DB
    .prepare('SELECT r2_key FROM photos WHERE finding_id = ?')
    .bind(id)
    .all<{ r2_key: string }>();

  for (const p of photosRes.results || []) {
    try {
      await c.env.PHOTOS.delete(p.r2_key);
    } catch (e) {
      console.error('Failed to delete photo from R2:', p.r2_key, e);
    }
  }

  await c.env.DB.prepare('DELETE FROM findings WHERE id = ?').bind(id).run();

  // Recalculate audit scores after deletion
  await recalculateAuditScores(c.env.DB, finding.audit_id);

  await logActivity(c.env.DB, user.id, 'delete_finding', 'finding', id);

  return c.json({ ok: true });
});

// POST /api/findings/:id/fix - Area MNG marks finding as fixed (needs >= 1 after photo)
findingsRouter.post('/:id/fix', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid finding ID' }, 400);
  }

  const finding = await c.env.DB
    .prepare(`
      SELECT f.*, a.status as audit_status
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.id = ?
    `)
    .bind(id)
    .first<any>();

  if (!finding) {
    return c.json({ error: 'Finding not found' }, 404);
  }
  if (finding.audit_status !== 'submitted') {
    return c.json({ error: 'Audit must be submitted before improvements can be recorded' }, 400);
  }
  if (finding.status !== 'open') {
    return c.json({ error: `Finding status must be 'open' to record improvement (current: ${finding.status})` }, 400);
  }
  if (!canManageArea(user, userAreas, finding.area_id)) {
    return c.json({ error: 'Forbidden: You are not authorized to manage this area' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const fixNote = String(body.note || '').trim();
  if (!fixNote) {
    return c.json({ error: 'Improvement note is required' }, 400);
  }

  // Must have >= 1 after photo
  const afterPhotos = await c.env.DB
    .prepare("SELECT COUNT(*) as cnt FROM photos WHERE finding_id = ? AND kind = 'after'")
    .bind(id)
    .first<{ cnt: number }>();

  if (!afterPhotos || afterPhotos.cnt < 1) {
    return c.json({ error: 'At least one improvement ("after") photo is required' }, 400);
  }

  await c.env.DB
    .prepare(`
      UPDATE findings
      SET status = 'fixed', fix_note = ?, fixed_by = ?, fixed_at = datetime('now')
      WHERE id = ?
    `)
    .bind(fixNote, user.id, id)
    .run();

  await logActivity(c.env.DB, user.id, 'fix_finding', 'finding', id, fixNote);

  return c.json({ ok: true, status: 'fixed' });
});

// POST /api/findings/:id/verify - Auditor verifies fixed finding (close / reject)
findingsRouter.post('/:id/verify', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid finding ID' }, 400);
  }

  const finding = await c.env.DB
    .prepare('SELECT * FROM findings WHERE id = ?')
    .bind(id)
    .first<Finding>();

  if (!finding) {
    return c.json({ error: 'Finding not found' }, 404);
  }
  if (finding.status !== 'fixed') {
    return c.json({ error: `Finding must be in 'fixed' status to verify (current: ${finding.status})` }, 400);
  }
  if (!canAuditArea(user, userAreas, finding.area_id)) {
    return c.json({ error: 'Forbidden: You are not authorized to verify findings in this area' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const action = body.action; // 'close' | 'reject'
  const note = String(body.note || '').trim();

  if (action === 'close') {
    await c.env.DB
      .prepare(`
        UPDATE findings
        SET status = 'closed', verified_by = ?, closed_at = datetime('now')
        WHERE id = ?
      `)
      .bind(user.id, id)
      .run();

    await logActivity(c.env.DB, user.id, 'verify_close', 'finding', id, note);
    return c.json({ ok: true, status: 'closed' });
  } else if (action === 'reject') {
    await c.env.DB
      .prepare(`
        UPDATE findings
        SET status = 'open', reject_note = ?, fixed_at = NULL, fixed_by = NULL
        WHERE id = ?
      `)
      .bind(note, id)
      .run();

    await logActivity(c.env.DB, user.id, 'verify_reject', 'finding', id, note);
    return c.json({ ok: true, status: 'open' });
  }

  return c.json({ error: 'Invalid action: must be close or reject' }, 400);
});

// POST /api/findings/:id/photos - Upload photo to R2
findingsRouter.post('/:id/photos', async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid finding ID' }, 400);
  }

  const finding = await c.env.DB
    .prepare(`
      SELECT f.*, a.status as audit_status
      FROM findings f
      JOIN audits a ON a.id = f.audit_id
      WHERE f.id = ?
    `)
    .bind(id)
    .first<any>();

  if (!finding) {
    return c.json({ error: 'Finding not found' }, 404);
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return c.json({ error: 'Multipart form data is required' }, 400);
  }

  const file = formData.get('file') as File | null;
  const kind = String(formData.get('kind') || '').trim(); // 'before' | 'after'

  if (!file || !(kind === 'before' || kind === 'after')) {
    return c.json({ error: 'File and valid kind (before/after) are required' }, 400);
  }

  // Size limit: 5 MB
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'File size exceeds 5 MB limit' }, 400);
  }

  // Image MIME type check
  if (!file.type.startsWith('image/')) {
    return c.json({ error: 'File must be an image' }, 400);
  }

  // Count check: max 6 per kind per finding
  const countRow = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM photos WHERE finding_id = ? AND kind = ?')
    .bind(id, kind)
    .first<{ cnt: number }>();

  if (countRow && countRow.cnt >= 6) {
    return c.json({ error: `Maximum of 6 ${kind} photos reached` }, 400);
  }

  // Permission rules
  if (kind === 'before') {
    if (finding.audit_status !== 'draft' && finding.status !== 'open') {
      return c.json({ error: 'Before photos can only be added while audit is draft or finding is open' }, 400);
    }
    if (!canAuditArea(user, userAreas, finding.area_id)) {
      return c.json({ error: 'Forbidden: You cannot upload before photos for this area' }, 403);
    }
  } else {
    // kind === 'after'
    if (finding.audit_status !== 'submitted') {
      return c.json({ error: 'After photos can only be added to submitted audits' }, 400);
    }
    if (finding.status !== 'open') {
      return c.json({ error: 'After photos can only be added while finding is open' }, 400);
    }
    if (!canManageArea(user, userAreas, finding.area_id)) {
      return c.json({ error: 'Forbidden: You cannot upload after photos for this area' }, 403);
    }
  }

  try {
    const key = `f/${id}/${kind}/${crypto.randomUUID()}.jpg`;
    const buffer = await file.arrayBuffer();

    if (c.env.PHOTOS) {
      await c.env.PHOTOS.put(key, buffer, {
        httpMetadata: {
          contentType: file.type || 'image/jpeg',
        },
      });
    }

    const insertRes = await c.env.DB
      .prepare('INSERT INTO photos (finding_id, kind, r2_key, uploaded_by) VALUES (?, ?, ?, ?)')
      .bind(id, kind, key, user.id)
      .run();

    const photoId = insertRes.meta.last_row_id as number;
    await logActivity(c.env.DB, user.id, 'upload_photo', 'photo', photoId, `finding_id=${id}, kind=${kind}`);

    return c.json({
      photo: {
        id: photoId,
        finding_id: id,
        kind,
        r2_key: key,
        uploaded_by: user.id,
      },
    }, 201);
  } catch (err: any) {
    console.error('Error in upload photo:', err);
    return c.json({ error: err.message, stack: err.stack }, 500);
  }
});
