import { Hono } from 'hono';
import type { Env, Variables, AppSetting } from '../types';
import { authMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { logActivity } from '../lib/activity';
import { encryptSecret, decryptSecret } from '../lib/crypto';
import { APP_VERSION, APP_RELEASE_DATE, GITHUB_REPO, GITHUB_REPO_URL, compareSemver } from '../../src/version';

export const settingsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

async function resolveGithubToken(env: Env): Promise<string> {
  if (env.GITHUB_TOKEN && env.GITHUB_TOKEN.trim()) {
    return env.GITHUB_TOKEN.trim();
  }
  try {
    const row = await env.DB
      .prepare("SELECT value FROM app_settings WHERE key = 'github_token'")
      .first<{ value: string }>();
    if (row?.value) {
      return (await decryptSecret(row.value.trim(), env.JWT_SECRET)).trim();
    }
  } catch {}
  return '';
}

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
    const encryptedToken = ghToken ? await encryptSecret(ghToken, c.env.JWT_SECRET) : '';
    await c.env.DB
      .prepare(`
        INSERT INTO app_settings (key, value, updated_at) VALUES ('github_token', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `)
      .bind(encryptedToken)
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

  const ghToken = await resolveGithubToken(c.env);

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
        has_github_token: Boolean(ghToken),
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
      has_github_token: Boolean(ghToken),
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
      has_github_token: Boolean(ghToken),
      repo: GITHUB_REPO,
      repo_url: GITHUB_REPO_URL,
      checked_at: new Date().toISOString(),
      mode: 'cloud_worker',
      error: err.message || 'Failed to check GitHub for updates',
    });
  }
});

// POST /api/settings/cloud-update-apply - Trigger Cloudflare CI/CD deployment via GitHub Actions (Admin only!)
settingsRouter.post('/cloud-update-apply', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Only Admin can apply system updates' }, 403);
  }

  const ghToken = await resolveGithubToken(c.env);
  if (!ghToken) {
    return c.json(
      {
        error:
          'Cloudflare Auto-Update yêu cầu cấu hình GITHUB_TOKEN (có quyền workflow) trong biến môi trường Worker hoặc mục Quản trị để kích hoạt GitHub Actions Deploy tự động.',
      },
      400
    );
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Crystal-5S-Audit-Updater',
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${ghToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const dispatchRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/deploy.yml/dispatches`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ ref: 'main' }),
      }
    );

    if (!dispatchRes.ok && dispatchRes.status !== 204) {
      const errBody = await dispatchRes.text().catch(() => '');
      return c.json(
        {
          error: `Không thể kích hoạt GitHub Actions workflow (HTTP ${dispatchRes.status}): ${errBody.slice(0, 200)}`,
        },
        400
      );
    }

    await logActivity(
      c.env.DB,
      user.id,
      'trigger_cloud_update',
      'settings',
      null,
      `from=${APP_VERSION}`
    );

    return c.json({
      ok: true,
      mode: 'cloud_worker',
      previous_version: APP_VERSION,
      new_version: 'latest (CI/CD deploying)',
      log: [
        `▶ Đã xác thực quyền Admin (${user.username}).`,
        `▶ Đã gửi lệnh kích hoạt GitHub Actions Workflow (deploy.yml) trên nhánh main của ${GITHUB_REPO}.`,
        `✔ Tiến trình CI/CD trên GitHub đang tự động chạy kiểm tra (typecheck + test), áp dụng D1 migrations (--remote) và triển khai phiên bản mới lên Cloudflare Workers.`,
        `ℹ Vui lòng đợi khoảng 1-2 phút để Cloudflare cập nhật phiên bản mới trên toàn mạng lưới.`,
      ].join('\n'),
    });
  } catch (err: any) {
    return c.json(
      {
        error: 'Failed to trigger cloud auto-update: ' + (err.message || ''),
      },
      500
    );
  }
});

// GET /api/settings/demo-stats - Get current counts of demo/test data (Admin only)
settingsRouter.get('/demo-stats', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const auditsCount = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM audits')
    .first<{ cnt: number }>();
  const findingsCount = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM findings')
    .first<{ cnt: number }>();
  const photosCount = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM photos')
    .first<{ cnt: number }>();
  const historicalScoresCount = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM historical_monthly_scores')
    .first<{ cnt: number }>();
  const areasCount = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM areas')
    .first<{ cnt: number }>();

  const audits = auditsCount?.cnt || 0;
  const findings = findingsCount?.cnt || 0;
  const photos = photosCount?.cnt || 0;
  const historical = historicalScoresCount?.cnt || 0;
  const areas = areasCount?.cnt || 0;

  return c.json({
    audits_count: audits,
    findings_count: findings,
    photos_count: photos,
    historical_scores_count: historical,
    areas_count: areas,
    has_demo_data: audits > 0 || findings > 0 || photos > 0 || historical > 0,
  });
});

// POST /api/settings/clear-demo-data - Clear all test/demo audits and optional sample areas (Admin only)
settingsRouter.post('/clear-demo-data', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const clearAreas = Boolean(body.clear_areas);

  // 1. Delete all photos from R2 bucket
  let photosDeleted = 0;
  try {
    const photoRows = await c.env.DB
      .prepare('SELECT r2_key FROM photos')
      .all<{ r2_key: string }>();
    const keys = (photoRows.results || []).map((p) => p.r2_key).filter(Boolean);
    if (keys.length > 0) {
      photosDeleted = keys.length;
      try {
        await c.env.PHOTOS.delete(keys);
      } catch (r2Err) {
        console.warn('R2 delete warning:', r2Err);
      }
    }
  } catch (err) {
    console.warn('Failed querying photos for R2 deletion:', err);
  }

  // 2. Delete test data in D1
  const statements = [
    c.env.DB.prepare('DELETE FROM photos'),
    c.env.DB.prepare('DELETE FROM findings'),
    c.env.DB.prepare('DELETE FROM audit_area_scores'),
    c.env.DB.prepare('DELETE FROM audits'),
    c.env.DB.prepare('DELETE FROM historical_monthly_scores'),
    c.env.DB.prepare("DELETE FROM activity_log WHERE entity IN ('audit', 'finding', 'photo')"),
  ];

  if (clearAreas) {
    statements.push(
      c.env.DB.prepare('DELETE FROM user_areas'),
      c.env.DB.prepare('DELETE FROM area_item_na'),
      c.env.DB.prepare('DELETE FROM areas')
    );
  }

  await c.env.DB.batch(statements);

  // 3. Clear rate limit table if present
  try {
    await c.env.DB.prepare('DELETE FROM login_attempts').run();
  } catch {}

  await logActivity(
    c.env.DB,
    user.id,
    'clear_demo_data',
    'system',
    null,
    `clear_areas=${clearAreas}, photos_deleted=${photosDeleted}`
  );

  return c.json({
    ok: true,
    message: clearAreas
      ? 'Đã xóa toàn bộ dữ liệu audit và khu vực mẫu thành công'
      : 'Đã xóa toàn bộ dữ liệu audit và lỗi thử nghiệm thành công',
    cleared_areas: clearAreas,
    photos_deleted: photosDeleted,
  });
});
