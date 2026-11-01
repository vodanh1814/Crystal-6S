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
    await c.env.DB
      .prepare(
        `DELETE FROM areas
         WHERE id NOT IN (SELECT DISTINCT area_id FROM audit_area_scores)
           AND id NOT IN (SELECT DISTINCT area_id FROM findings)`
      )
      .run();
  }
  if (body.default_target !== undefined) {
    const targetVal = Math.min(100, Math.max(50, Number(body.default_target) || 90));
    const currentYear = new Date().getUTCFullYear();
    await c.env.DB.prepare('UPDATE yearly_targets SET target = ?').bind(targetVal).run();
    await c.env.DB
      .prepare(
        `INSERT INTO yearly_targets (year, target) VALUES (?, ?)
         ON CONFLICT(year) DO UPDATE SET target = excluded.target`
      )
      .bind(currentYear, targetVal)
      .run();
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

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async function ensureLoginAttemptsTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS login_attempts (
        key TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        first_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
        locked_until TEXT
      )`
    )
    .run();
}

// POST /api/auth/login
authRouter.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }

  const clientIp =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local';
  const rateLimitKey = `${clientIp}:${username}`;
  const nowMs = Date.now();

  try {
    await ensureLoginAttemptsTable(c.env.DB);
    const attemptRow = await c.env.DB
      .prepare('SELECT attempts, first_attempt_at, locked_until FROM login_attempts WHERE key = ?')
      .bind(rateLimitKey)
      .first<{ attempts: number; first_attempt_at: string; locked_until: string | null }>();

    if (attemptRow?.locked_until) {
      const lockUntilMs = Date.parse(attemptRow.locked_until);
      if (!isNaN(lockUntilMs) && lockUntilMs > nowMs) {
        const remainingMinutes = Math.max(1, Math.ceil((lockUntilMs - nowMs) / 60000));
        return c.json(
          {
            error: `Tài khoản đang tạm khóa do nhập sai mật khẩu quá ${MAX_LOGIN_ATTEMPTS} lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
          },
          429
        );
      }
    }
  } catch (err) {
    console.error('Rate-limit check warning:', err);
  }

  const recordFailedAttempt = async () => {
    try {
      const existing = await c.env.DB
        .prepare('SELECT attempts, first_attempt_at FROM login_attempts WHERE key = ?')
        .bind(rateLimitKey)
        .first<{ attempts: number; first_attempt_at: string }>();

      const firstMs = existing?.first_attempt_at ? Date.parse(existing.first_attempt_at) : nowMs;
      const withinWindow = !isNaN(firstMs) && nowMs - firstMs < LOCKOUT_DURATION_MS;
      const nextAttempts = withinWindow ? (existing?.attempts || 0) + 1 : 1;
      const nextFirstAt = withinWindow && existing?.first_attempt_at
        ? existing.first_attempt_at
        : new Date(nowMs).toISOString();
      const lockedUntil =
        nextAttempts >= MAX_LOGIN_ATTEMPTS
          ? new Date(nowMs + LOCKOUT_DURATION_MS).toISOString()
          : null;

      await c.env.DB
        .prepare(
          `INSERT INTO login_attempts (key, attempts, first_attempt_at, locked_until)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             attempts = excluded.attempts,
             first_attempt_at = excluded.first_attempt_at,
             locked_until = excluded.locked_until`
        )
        .bind(rateLimitKey, nextAttempts, nextFirstAt, lockedUntil)
        .run();
    } catch (err) {
      console.error('Failed to record login attempt:', err);
    }
  };

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
    .bind(username)
    .first<User>();

  if (!user || user.active !== 1) {
    await recordFailedAttempt();
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    await recordFailedAttempt();
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  // Clear failed attempts on successful login
  try {
    await c.env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(rateLimitKey).run();
  } catch {}

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
