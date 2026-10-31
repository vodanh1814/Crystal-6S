import { Hono } from 'hono';
import type { Env, Variables, Area } from '../types';
import { authMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { logActivity } from '../lib/activity';

export const areasRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

areasRouter.use('/*', authMiddleware);

// GET /api/areas
areasRouter.get('/', async (c) => {
  const showAll = c.req.query('all') === '1';
  let query = 'SELECT * FROM areas';
  if (!showAll) {
    query += ' WHERE active = 1';
  }
  query += ' ORDER BY sort_order ASC, code ASC';

  const res = await c.env.DB.prepare(query).all<Area>();
  return c.json({ areas: res.results || [] });
});

// POST /api/areas (Admin only)
areasRouter.post('/', async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const code = String(body.code || '').trim().toUpperCase();
  const name = String(body.name || '').trim();
  const sortOrder = Number(body.sort_order || 0);

  if (!code || !name) {
    return c.json({ error: 'Code and name are required' }, 400);
  }

  const existing = await c.env.DB
    .prepare('SELECT id FROM areas WHERE code = ? COLLATE NOCASE')
    .bind(code)
    .first();
  if (existing) {
    return c.json({ error: 'Area code already exists' }, 409);
  }

  const res = await c.env.DB
    .prepare('INSERT INTO areas (code, name, sort_order, active) VALUES (?, ?, ?, 1)')
    .bind(code, name, sortOrder)
    .run();

  const newId = res.meta.last_row_id as number;
  await logActivity(c.env.DB, user.id, 'create_area', 'area', newId, code);

  return c.json({
    area: {
      id: newId,
      code,
      name,
      sort_order: sortOrder,
      active: 1,
    },
  }, 201);
});

// PUT /api/areas/:id (Admin only)
areasRouter.put('/:id', async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid area ID' }, 400);
  }

  const existing = await c.env.DB
    .prepare('SELECT * FROM areas WHERE id = ?')
    .bind(id)
    .first<Area>();
  if (!existing) {
    return c.json({ error: 'Area not found' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const code = body.code !== undefined ? String(body.code).trim().toUpperCase() : existing.code;
  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  const sortOrder = body.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order;
  const active = body.active !== undefined ? (body.active ? 1 : 0) : existing.active;

  if (code !== existing.code) {
    const codeCheck = await c.env.DB
      .prepare('SELECT id FROM areas WHERE code = ? COLLATE NOCASE AND id != ?')
      .bind(code, id)
      .first();
    if (codeCheck) {
      return c.json({ error: 'Area code already exists' }, 409);
    }
  }

  await c.env.DB
    .prepare('UPDATE areas SET code = ?, name = ?, sort_order = ?, active = ? WHERE id = ?')
    .bind(code, name, sortOrder, active, id)
    .run();

  await logActivity(c.env.DB, user.id, 'update_area', 'area', id, `active=${active}`);

  return c.json({
    area: {
      id,
      code,
      name,
      sort_order: sortOrder,
      active,
    },
  });
});

// GET /api/areas/:id/na - Get Not Applicable item IDs for area
areasRouter.get('/:id/na', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid area ID' }, 400);
  }

  const res = await c.env.DB
    .prepare('SELECT item_id FROM area_item_na WHERE area_id = ?')
    .bind(id)
    .all<{ item_id: number }>();

  const itemIds = (res.results || []).map((r) => r.item_id);
  return c.json({ item_ids: itemIds });
});

// PUT /api/areas/:id/na - Update Not Applicable item IDs for area (Admin only)
areasRouter.put('/:id/na', async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid area ID' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const itemIds: number[] = Array.isArray(body.item_ids) ? body.item_ids : [];

  // Replace NA items
  await c.env.DB
    .prepare('DELETE FROM area_item_na WHERE area_id = ?')
    .bind(id)
    .run();

  for (const itemId of itemIds) {
    await c.env.DB
      .prepare('INSERT OR IGNORE INTO area_item_na (area_id, item_id) VALUES (?, ?)')
      .bind(id, itemId)
      .run();
  }

  await logActivity(c.env.DB, user.id, 'update_area_na', 'area', id, `na_count=${itemIds.length}`);

  return c.json({ ok: true, item_ids: itemIds });
});
