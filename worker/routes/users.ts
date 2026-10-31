import { Hono } from 'hono';
import type { Env, Variables, User, UserArea } from '../types';
import { hashPassword } from '../lib/crypto';
import { authMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { logActivity } from '../lib/activity';

export const usersRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

usersRouter.use('/*', authMiddleware);

// Middleware: admin only
usersRouter.use('/*', async (c, next) => {
  const currentUser = c.get('user');
  if (!isAdmin(currentUser)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }
  await next();
});

// GET /api/users - List all users with area assignments
usersRouter.get('/', async (c) => {
  const usersRes = await c.env.DB
    .prepare('SELECT id, username, full_name, role, lang, active, created_at FROM users ORDER BY id ASC')
    .all<Omit<User, 'password_hash' | 'token_version'>>();

  const areasRes = await c.env.DB
    .prepare(`
      SELECT ua.user_id, ua.area_id, ua.role, a.code as area_code, a.name as area_name
      FROM user_areas ua
      JOIN areas a ON a.id = ua.area_id
      ORDER BY a.sort_order ASC, a.code ASC
    `)
    .all<{ user_id: number; area_id: number; role: 'auditor' | 'manager'; area_code: string; area_name: string }>();

  const assignmentsByUser = new Map<number, any[]>();
  for (const item of areasRes.results || []) {
    if (!assignmentsByUser.has(item.user_id)) {
      assignmentsByUser.set(item.user_id, []);
    }
    assignmentsByUser.get(item.user_id)!.push({
      area_id: item.area_id,
      role: item.role,
      area_code: item.area_code,
      area_name: item.area_name,
    });
  }

  const usersWithAreas = (usersRes.results || []).map((u) => ({
    ...u,
    areas: assignmentsByUser.get(u.id) || [],
  }));

  return c.json({ users: usersWithAreas });
});

function extractAreaIds(body: any): number[] {
  if (Array.isArray(body.area_ids)) {
    return Array.from(new Set(body.area_ids.map((id: any) => parseInt(id, 10)).filter((n: number) => !isNaN(n))));
  }
  if (Array.isArray(body.assignments)) {
    return Array.from(new Set(body.assignments.map((a: any) => parseInt(a?.area_id, 10)).filter((n: number) => !isNaN(n))));
  }
  return [];
}

// POST /api/users - Create new user
usersRouter.post('/', async (c) => {
  const adminUser = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const fullName = String(body.full_name || '').trim();
  const role = (['admin', 'auditor', 'manager', 'viewer'] as const).includes(body.role)
    ? body.role
    : 'auditor';
  const lang = body.lang === 'en' ? 'en' : 'vi';

  if (!username || username.length < 3) {
    return c.json({ error: 'Username must be at least 3 characters' }, 400);
  }
  if (!password || password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }
  if (!fullName) {
    return c.json({ error: 'Full name is required' }, 400);
  }

  // Check unique username
  const existing = await c.env.DB
    .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
    .bind(username)
    .first();
  if (existing) {
    return c.json({ error: 'Username already exists' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const insertRes = await c.env.DB
    .prepare(
      'INSERT INTO users (username, password_hash, full_name, role, lang, active, token_version) VALUES (?, ?, ?, ?, ?, 1, 0)'
    )
    .bind(username, passwordHash, fullName, role, lang)
    .run();

  const newUserId = insertRes.meta.last_row_id as number;

  // Area assignments enforcing role exclusivity
  const areaIds = extractAreaIds(body);
  if (role === 'auditor' || role === 'manager') {
    for (const aid of areaIds) {
      await c.env.DB
        .prepare('INSERT OR IGNORE INTO user_areas (user_id, area_id, role) VALUES (?, ?, ?)')
        .bind(newUserId, aid, role)
        .run();
    }
  }

  await logActivity(c.env.DB, adminUser.id, 'create_user', 'user', newUserId, username);

  return c.json({
    user: {
      id: newUserId,
      username,
      full_name: fullName,
      role,
      lang,
      active: 1,
    },
  }, 201);
});

// PUT /api/users/:id - Update user details or reset password
usersRouter.put('/:id', async (c) => {
  const adminUser = c.get('user');
  const targetId = parseInt(c.req.param('id'), 10);
  if (isNaN(targetId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  const existing = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(targetId)
    .first<User>();
  if (!existing) {
    return c.json({ error: 'User not found' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const fullName = body.full_name !== undefined ? String(body.full_name).trim() : existing.full_name;
  const rawRole = body.role !== undefined ? body.role : existing.role;
  const role: User['role'] = (['admin', 'auditor', 'manager', 'viewer'] as const).includes(rawRole)
    ? rawRole
    : existing.role;
  const active = body.active !== undefined ? (body.active ? 1 : 0) : existing.active;
  const lang = body.lang !== undefined ? (body.lang === 'en' ? 'en' : 'vi') : existing.lang;

  // Admin cannot demote or deactivate themselves
  if (adminUser.id === targetId) {
    if (role !== 'admin') {
      return c.json({ error: 'Admin cannot demote themselves' }, 400);
    }
    if (active === 0) {
      return c.json({ error: 'Admin cannot deactivate themselves' }, 400);
    }
  }

  let passwordHash = existing.password_hash;
  let tokenVersion = existing.token_version;

  // Password reset if provided
  if (body.password) {
    const newPass = String(body.password);
    if (newPass.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }
    passwordHash = await hashPassword(newPass);
    tokenVersion += 1; // Invalidate current sessions of target user
  } else if (active === 0 && existing.active === 1) {
    tokenVersion += 1; // Invalidate sessions on deactivation
  }

  await c.env.DB
    .prepare(
      'UPDATE users SET full_name = ?, role = ?, active = ?, lang = ?, password_hash = ?, token_version = ? WHERE id = ?'
    )
    .bind(fullName, role, active, lang, passwordHash, tokenVersion, targetId)
    .run();

  // Handle area assignments
  const hasAreaIdsParam = body.area_ids !== undefined || body.assignments !== undefined;
  if (hasAreaIdsParam) {
    const areaIds = extractAreaIds(body);
    await c.env.DB.prepare('DELETE FROM user_areas WHERE user_id = ?').bind(targetId).run();

    if (role === 'auditor' || role === 'manager') {
      for (const aid of areaIds) {
        await c.env.DB
          .prepare('INSERT OR IGNORE INTO user_areas (user_id, area_id, role) VALUES (?, ?, ?)')
          .bind(targetId, aid, role)
          .run();
      }
    }
  } else if (role !== existing.role) {
    // Role changed without explicit area_ids
    if (role === 'admin' || role === 'viewer') {
      await c.env.DB.prepare('DELETE FROM user_areas WHERE user_id = ?').bind(targetId).run();
    } else if (role === 'auditor' || role === 'manager') {
      await c.env.DB
        .prepare('UPDATE user_areas SET role = ? WHERE user_id = ?')
        .bind(role, targetId)
        .run();
    }
  }

  await logActivity(c.env.DB, adminUser.id, 'update_user', 'user', targetId, `role=${role}, active=${active}`);

  return c.json({
    user: {
      id: targetId,
      username: existing.username,
      full_name: fullName,
      role,
      lang,
      active,
    },
  });
});

// PUT /api/users/:id/areas - Replace area assignments for user
usersRouter.put('/:id/areas', async (c) => {
  const adminUser = c.get('user');
  const targetId = parseInt(c.req.param('id'), 10);
  if (isNaN(targetId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  const existing = await c.env.DB
    .prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(targetId)
    .first<User>();
  if (!existing) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Delete current assignments
  await c.env.DB
    .prepare('DELETE FROM user_areas WHERE user_id = ?')
    .bind(targetId)
    .run();

  const body = await c.req.json().catch(() => ({}));
  const areaIds = extractAreaIds(body);

  let insertedCount = 0;
  if (existing.role === 'auditor' || existing.role === 'manager') {
    for (const aid of areaIds) {
      await c.env.DB
        .prepare('INSERT OR IGNORE INTO user_areas (user_id, area_id, role) VALUES (?, ?, ?)')
        .bind(targetId, aid, existing.role)
        .run();
      insertedCount++;
    }
  }

  await logActivity(
    c.env.DB,
    adminUser.id,
    'update_user_areas',
    'user',
    targetId,
    `role=${existing.role}, count=${insertedCount}`
  );

  return c.json({ ok: true, count: insertedCount });
});
