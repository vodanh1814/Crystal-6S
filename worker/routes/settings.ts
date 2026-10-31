import { Hono } from 'hono';
import type { Env, Variables, AppSetting } from '../types';
import { authMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { logActivity } from '../lib/activity';
import { APP_VERSION, APP_RELEASE_DATE, GITHUB_REPO, GITHUB_REPO_URL, compareSemver } from '../../src/version';

export const settingsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Helper to fetch settings map
export async function getAppSettings(
  db: D1Database
): Promise<{ company_name: string; company_logo: string }> {
  try {
    const rows = await db
      .prepare(
        "SELECT key, value FROM app_settings WHERE key IN ('company_name', 'company_logo')"
      )
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

// GET /api/settings - Public read for branding & app version across UI & TV screens
settingsRouter.get('/', async (c) => {
  const settings = await getAppSettings(c.env.DB);
  return c.json({
    settings,
    version: APP_VERSION,
    release_date: APP_RELEASE_DATE,
    repo: GITHUB_REPO,
    repo_url: GITHUB_REPO_URL,
  });
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

  if (body.github_token !== undefined) {
    const ghToken = String(body.github_token || '').trim();
    await c.env.DB
      .prepare(`
        INSERT INTO app_settings (key, value, updated_at) VALUES ('github_token', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `)
      .bind(ghToken)
      .run();
  }

  const updated = await getAppSettings(c.env.DB);
  await logActivity(
    c.env.DB,
    user.id,
    'update_branding',
    'settings',
    null,
    `name=${updated.company_name}`
  );

  return c.json({ ok: true, settings: updated });
});

// GET /api/settings/update-check - Check GitHub repository for newer version (Admin only!)
settingsRouter.get('/update-check', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Only Admin can check or apply system updates' }, 403);
  }

  // Optional GitHub token from app_settings for private repository access on Cloudflare
  let ghToken = '';
  try {
    const row = await c.env.DB
      .prepare("SELECT value FROM app_settings WHERE key = 'github_token'")
      .first<{ value: string }>();
    if (row?.value) ghToken = row.value.trim();
  } catch {}

  const headers: Record<string, string> = {
    'User-Agent': 'Crystal-5S-Audit-Updater',
    Accept: 'application/vnd.github.v3+json',
  };
  if (ghToken) {
    headers['Authorization'] = `Bearer ${ghToken}`;
  }

  try {
    // Try fetching package.json from GitHub API
    const pkgRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/package.json?ref=main`,
      { headers }
    );

    if (!pkgRes.ok) {
      return c.json({
        current_version: APP_VERSION,
        latest_version: APP_VERSION,
        has_update: false,
        repo: GITHUB_REPO,
        repo_url: GITHUB_REPO_URL,
        checked_at: new Date().toISOString(),
        mode: 'cloud_worker',
        notice:
          pkgRes.status === 404
            ? 'Private GitHub repository requires local Git/GH CLI or a GitHub Token in Admin Settings.'
            : `GitHub API returned status ${pkgRes.status}`,
      });
    }

    const pkgData: any = await pkgRes.json();
    const decodedPkg = JSON.parse(atob(String(pkgData.content || '').replace(/\s/g, '')));
    const latestVersion = String(decodedPkg.version || APP_VERSION).trim();
    const hasUpdate = compareSemver(latestVersion, APP_VERSION) > 0;

    // Also try fetching CHANGELOG.md
    let changelog = '';
    try {
      const chgRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/CHANGELOG.md?ref=main`,
        { headers }
      );
      if (chgRes.ok) {
        const chgData: any = await chgRes.json();
        const binStr = atob(String(chgData.content || '').replace(/\s/g, ''));
        const bytes = Uint8Array.from(binStr, (ch) => ch.charCodeAt(0));
        changelog = new TextDecoder('utf-8').decode(bytes);
      }
    } catch {}

    return c.json({
      current_version: APP_VERSION,
      latest_version: latestVersion,
      has_update: hasUpdate,
      changelog: changelog.slice(0, 3000),
      repo: GITHUB_REPO,
      repo_url: GITHUB_REPO_URL,
      checked_at: new Date().toISOString(),
      mode: 'cloud_worker',
    });
  } catch (err: any) {
    return c.json({
      current_version: APP_VERSION,
      latest_version: APP_VERSION,
      has_update: false,
      repo: GITHUB_REPO,
      repo_url: GITHUB_REPO_URL,
      checked_at: new Date().toISOString(),
      mode: 'cloud_worker',
      error: err.message || 'Failed to check GitHub for updates',
    });
  }
});
