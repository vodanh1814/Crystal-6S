import { Hono } from 'hono';
import type { Env, Variables, Photo } from '../types';
import { authMiddleware } from '../lib/auth';
import { isAdmin, canAuditArea, canManageArea } from '../lib/permissions';
import { logActivity } from '../lib/activity';

export const photosRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/photos/:id - Serve photo from R2 (public read for 5S audit photos)
photosRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id') || '', 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid photo ID' }, 400);
  }

  const photo = await c.env.DB
    .prepare('SELECT * FROM photos WHERE id = ?')
    .bind(id)
    .first<Photo>();

  if (!photo) {
    return c.json({ error: 'Photo not found' }, 404);
  }

  const object = await c.env.PHOTOS.get(photo.r2_key);
  if (!object) {
    return c.json({ error: 'Photo not found in storage' }, 404);
  }

  const contentType = object.httpMetadata?.contentType || 'image/jpeg';
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'private, max-age=86400, immutable');

  return new Response(object.body, { headers });
});

// DELETE /api/photos/:id - Delete photo (auth required)
photosRouter.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas') || [];
  const id = parseInt(c.req.param('id') || '', 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid photo ID' }, 400);
  }

  const photo = await c.env.DB
    .prepare(`
      SELECT p.*, f.status as finding_status, f.area_id, a.status as audit_status
      FROM photos p
      JOIN findings f ON f.id = p.finding_id
      JOIN audits a ON a.id = f.audit_id
      WHERE p.id = ?
    `)
    .bind(id)
    .first<any>();

  if (!photo) {
    return c.json({ error: 'Photo not found' }, 404);
  }

  const canAudit = canAuditArea(user, userAreas, photo.area_id);
  const canManage = canManageArea(user, userAreas, photo.area_id);

  // State & Permission rules:
  if (photo.kind === 'before') {
    if (photo.audit_status !== 'draft' && photo.finding_status !== 'open') {
      return c.json({ error: 'Cannot delete before photos of a fixed or closed finding' }, 400);
    }
    if (!isAdmin(user) && !canAudit && photo.uploaded_by !== user.id) {
      return c.json({ error: 'Forbidden: You cannot delete this photo' }, 403);
    }
  } else {
    // kind === 'after'
    if (photo.finding_status !== 'open') {
      return c.json({ error: 'Cannot delete after photos of a finding that is not open' }, 400);
    }
    if (!isAdmin(user) && !canManage && photo.uploaded_by !== user.id) {
      return c.json({ error: 'Forbidden: You cannot delete this photo' }, 403);
    }
  }

  try {
    await c.env.PHOTOS.delete(photo.r2_key);
  } catch (e) {
    console.error('Failed to delete from R2:', photo.r2_key, e);
  }

  await c.env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
  await logActivity(c.env.DB, user.id, 'delete_photo', 'photo', id);

  return c.json({ ok: true });
});
