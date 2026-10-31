import { Hono } from 'hono';
import type { Env, Variables, ChecklistItem } from '../types';
import { authMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { logActivity } from '../lib/activity';

export const checklistRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

checklistRouter.use('/*', authMiddleware);

// GET /api/checklist
checklistRouter.get('/', async (c) => {
  const showAll = c.req.query('all') === '1';
  let query = 'SELECT * FROM checklist_items';
  if (!showAll) {
    query += ' WHERE active = 1';
  }
  query += ' ORDER BY s_group ASC, sort_order ASC, code ASC';

  const res = await c.env.DB.prepare(query).all<ChecklistItem>();
  return c.json({ items: res.results || [] });
});

// POST /api/checklist (Admin only)
checklistRouter.post('/', async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const code = String(body.code || '').trim().toUpperCase();
  const sGroup = Number(body.s_group);
  const locationVi = String(body.location_vi || '').trim();
  const locationEn = String(body.location_en || '').trim();
  const contentVi = String(body.content_vi || '').trim();
  const contentEn = String(body.content_en || '').trim();
  const penalty = Number(body.penalty);
  const escalating = body.escalating !== undefined ? (body.escalating ? 1 : 0) : 1;
  const sortOrder = Number(body.sort_order || 0);

  if (!code || isNaN(sGroup) || sGroup < 1 || sGroup > 5 || !contentVi || isNaN(penalty) || penalty < 0) {
    return c.json({ error: 'Invalid checklist item data' }, 400);
  }

  const existing = await c.env.DB
    .prepare('SELECT id FROM checklist_items WHERE code = ? COLLATE NOCASE')
    .bind(code)
    .first();
  if (existing) {
    return c.json({ error: 'Checklist code already exists' }, 409);
  }

  const res = await c.env.DB
    .prepare(`
      INSERT INTO checklist_items (code, s_group, location_vi, location_en, content_vi, content_en, penalty, escalating, sort_order, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `)
    .bind(code, sGroup, locationVi, locationEn, contentVi, contentEn, penalty, escalating, sortOrder)
    .run();

  const newId = res.meta.last_row_id as number;
  await logActivity(c.env.DB, user.id, 'create_checklist_item', 'checklist_item', newId, code);

  return c.json({
    item: {
      id: newId,
      code,
      s_group: sGroup,
      location_vi: locationVi,
      location_en: locationEn,
      content_vi: contentVi,
      content_en: contentEn,
      penalty,
      escalating,
      sort_order: sortOrder,
      active: 1,
    },
  }, 201);
});

// PUT /api/checklist/:id (Admin only)
checklistRouter.put('/:id', async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid checklist ID' }, 400);
  }

  const existing = await c.env.DB
    .prepare('SELECT * FROM checklist_items WHERE id = ?')
    .bind(id)
    .first<ChecklistItem>();
  if (!existing) {
    return c.json({ error: 'Checklist item not found' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const code = body.code !== undefined ? String(body.code).trim().toUpperCase() : existing.code;
  const sGroup = body.s_group !== undefined ? Number(body.s_group) : existing.s_group;
  const locationVi = body.location_vi !== undefined ? String(body.location_vi).trim() : existing.location_vi;
  const locationEn = body.location_en !== undefined ? String(body.location_en).trim() : existing.location_en;
  const contentVi = body.content_vi !== undefined ? String(body.content_vi).trim() : existing.content_vi;
  const contentEn = body.content_en !== undefined ? String(body.content_en).trim() : existing.content_en;
  const penalty = body.penalty !== undefined ? Number(body.penalty) : existing.penalty;
  const escalating = body.escalating !== undefined ? (body.escalating ? 1 : 0) : existing.escalating;
  const sortOrder = body.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order;
  const active = body.active !== undefined ? (body.active ? 1 : 0) : existing.active;

  if (code !== existing.code) {
    const codeCheck = await c.env.DB
      .prepare('SELECT id FROM checklist_items WHERE code = ? COLLATE NOCASE AND id != ?')
      .bind(code, id)
      .first();
    if (codeCheck) {
      return c.json({ error: 'Checklist code already exists' }, 409);
    }
  }

  await c.env.DB
    .prepare(`
      UPDATE checklist_items
      SET code = ?, s_group = ?, location_vi = ?, location_en = ?, content_vi = ?, content_en = ?,
          penalty = ?, escalating = ?, sort_order = ?, active = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(code, sGroup, locationVi, locationEn, contentVi, contentEn, penalty, escalating, sortOrder, active, id)
    .run();

  await logActivity(c.env.DB, user.id, 'update_checklist_item', 'checklist_item', id, `code=${code}, active=${active}`);

  return c.json({
    item: {
      id,
      code,
      s_group: sGroup,
      location_vi: locationVi,
      location_en: locationEn,
      content_vi: contentVi,
      content_en: contentEn,
      penalty,
      escalating,
      sort_order: sortOrder,
      active,
    },
  });
});
