import { Hono } from 'hono';
import type { Env, Variables, AppSetting } from '../types';
import { authMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { logActivity } from '../lib/activity';

export const settingsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Helper to fetch settings map
export async function getAppSettings(db: D1Database): Promise<{ company_name: string; company_logo: string }> {
  try {
    const rows = await db
      .prepare('SELECT key, value FROM app_settings WHERE key IN (\'company_name\', \'company_logo\')')
      .all<AppSetting>();

    const map: { [k: string]: string } = {};
    for (const r of rows.results || []) {
      map[r.key] = r.value;
    }

    return {
      company_name: map['company_name'] || 'CRYSTAL',
      company_logo: map['company_logo'] || '',
    };
  } catch (err) {
    console.error('Failed to query app_settings:', err);
    return {
      company_name: 'CRYSTAL',
      company_logo: '',
    };
  }
}

// GET /api/settings - Public read for branding across UI & TV screens
settingsRouter.get('/', async (c) => {
  const settings = await getAppSettings(c.env.DB);
  return c.json({ settings });
});

// PUT /api/settings - Update company branding (Admin only)
settingsRouter.put('/', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));

  if (body.company_name !== undefined) {
    const rawName = String(body.company_name).trim();
    const companyName = rawName || 'CRYSTAL';
    await c.env.DB
      .prepare(`
        INSERT INTO app_settings (key, value, updated_at) VALUES ('company_name', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `)
      .bind(companyName)
      .run();
  }

  if (body.company_logo !== undefined) {
    const companyLogo = String(body.company_logo || '').trim();
    await c.env.DB
      .prepare(`
        INSERT INTO app_settings (key, value, updated_at) VALUES ('company_logo', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `)
      .bind(companyLogo)
      .run();
  }

  const updated = await getAppSettings(c.env.DB);
  await logActivity(c.env.DB, user.id, 'update_branding', 'settings', null, `name=${updated.company_name}`);

  return c.json({ ok: true, settings: updated });
});
