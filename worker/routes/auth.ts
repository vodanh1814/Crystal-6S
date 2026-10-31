import { Hono } from 'hono';
import type { Env, Variables, User } from '../types';
import { hashPassword, verifyPassword } from '../lib/crypto';
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  authMiddleware,
} from '../lib/auth';
import { logActivity } from '../lib/activity';
import { getAppSettings } from './settings';

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/auth/setup - Check if initial setup is needed
authRouter.get('/setup', async (c) => {
  const countRow = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM users')
    .first<{ cnt: number }>();
  const count = countRow ? countRow.cnt : 0;
  const settings = await getAppSettings(c.env.DB);
  return c.json({ needsSetup: count === 0, settings });
});

// POST /api/auth/setup - Create initial admin user
authRouter.post('/setup', async (c) => {
  const countRow = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM users')
    .first<{ cnt: number }>();
  if (countRow && countRow.cnt > 0) {
    return c.json({ error: 'Initial setup has already been completed' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const fullName = String(body.full_name || '').trim();

  if (!username || username.length < 3) {
    return c.json({ error: 'Username must be at least 3 characters' }, 400);
  }
  if (!password || password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }
  if (!fullName) {
    return c.json({ error: 'Full name is required' }, 400);
  }

  // Optional company branding during setup
  if (body.company_name) {
    await c.env.DB
      .prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES ('company_name', ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(String(body.company_name).trim())
      .run();
  }
  if (body.company_logo !== undefined) {
    await c.env.DB
      .prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES ('company_logo', ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(String(body.company_logo).trim())
      .run();
  }

  // Optional factory initial config (seed areas & default KPI target)
  if (body.seed_sample_areas === false) {
    await c.env.DB.prepare('DELETE FROM areas WHERE id NOT IN (SELECT DISTINCT area_id FROM audit_areas)').run();
  }
  if (body.default_target !== undefined) {
    const targetVal = Math.min(100, Math.max(50, Number(body.default_target) || 90));
    await c.env.DB.prepare('UPDATE areas SET target_score = ?').bind(targetVal).run();
    await c.env.DB.prepare('UPDATE area_targets SET target_score = ?').bind(targetVal).run();
  }

  const userLang = body.lang === 'en' ? 'en' : 'vi';
  const passwordHash = await hashPassword(password);

  const insertRes = await c.env.DB
    .prepare(
      'INSERT INTO users (username, password_hash, full_name, role, lang, active, token_version) VALUES (?, ?, ?, ?, ?, 1, 0)'
    )
    .bind(username, passwordHash, fullName, 'admin', userLang)
    .run();

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(insertRes.meta.last_row_id)
    .first<User>();

  if (!user) {
    return c.json({ error: 'Failed to create user' }, 500);
  }

  const token = await createSessionToken(user, c.env.JWT_SECRET);
  setSessionCookie(c, token);
  await logActivity(c.env.DB, user.id, 'setup_first_admin', 'user', user.id, username);

  const { password_hash, ...safeUser } = user;
  return c.json({ user: safeUser }, 201);
});

// POST /api/auth/login
authRouter.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
    .bind(username)
    .first<User>();

  if (!user || user.active !== 1) {
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  const token = await createSessionToken(user, c.env.JWT_SECRET);
  setSessionCookie(c, token);
  await logActivity(c.env.DB, user.id, 'login', 'user', user.id);

  const { password_hash, ...safeUser } = user;
  return c.json({ user: safeUser });
});

// POST /api/auth/logout
authRouter.post('/logout', (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});

// Protected routes below
authRouter.use('/*', authMiddleware);

// GET /api/auth/me
authRouter.get('/me', (c) => {
  const user = c.get('user');
  const userAreas = c.get('userAreas');
  const { password_hash, ...safeUser } = user;
  return c.json({ user: safeUser, areas: userAreas });
});

// POST /api/auth/password
authRouter.post('/password', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const currentPassword = String(body.current_password || '');
  const newPassword = String(body.new_password || '');

  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current password and new password are required' }, 400);
  }
  if (newPassword.length < 6) {
    return c.json({ error: 'New password must be at least 6 characters' }, 400);
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Current password is incorrect' }, 400);
  }

  const newHash = await hashPassword(newPassword);
  const newTokenVersion = user.token_version + 1;

  await c.env.DB
    .prepare('UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?')
    .bind(newHash, newTokenVersion, user.id)
    .run();

  // Issue new session token in httpOnly cookie
  const updatedUser = { ...user, token_version: newTokenVersion, password_hash: newHash };
  const token = await createSessionToken(updatedUser, c.env.JWT_SECRET);
  setSessionCookie(c, token);
  await logActivity(c.env.DB, user.id, 'change_password', 'user', user.id);

  return c.json({ ok: true });
});

// PUT /api/auth/lang
authRouter.put('/lang', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const lang = body.lang === 'en' ? 'en' : 'vi';

  await c.env.DB
    .prepare('UPDATE users SET lang = ? WHERE id = ?')
    .bind(lang, user.id)
    .run();

  return c.json({ ok: true, lang });
});
