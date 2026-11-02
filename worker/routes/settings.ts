import { Hono } from 'hono';
import type { Env, Variables, AppSetting } from '../types';
import { authMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { logActivity } from '../lib/activity';
import { encryptSecret, decryptSecret } from '../lib/crypto';
import { APP_VERSION, APP_RELEASE_DATE, GITHUB_REPO, GITHUB_REPO_URL, compareSemver } from '../../src/version';
import {
  CF_FREE_TIER_LIMITS,
  maskString,
  calculateMetricStatus,
  verifyCloudflareToken,
  getCloudflareAccountInfo,
  getCloudflareD1Database,
  getCloudflareWorkerSubdomain,
  generateDatabaseBackupSql,
  getInternalUsageMetrics,
  type CloudflareStatusResponse,
} from '../lib/cloudflare';

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

async function resolveGithubRepo(db: D1Database): Promise<string> {
  try {
    const row = await db
      .prepare("SELECT value FROM app_settings WHERE key = 'github_repo'")
      .first<{ value: string }>();
    if (row?.value && row.value.trim().includes('/')) {
      return row.value.trim();
    }
  } catch {}
  return GITHUB_REPO;
}

// Helper to fetch settings map
export async function getAppSettings(
  db: D1Database
): Promise<{ company_name: string; company_logo: string; github_repo: string }> {
  try {
    const rows = await db
      .prepare(
        "SELECT key, value FROM app_settings WHERE key IN ('company_name', 'company_logo', 'github_repo')"
      )
      .all<AppSetting>();

    const map: { [k: string]: string } = {};
    for (const r of rows.results || []) {
      map[r.key] = r.value;
    }

    return {
      company_name: map['company_name'] || 'CRYSTAL',
      company_logo: map['company_logo'] || '',
      github_repo: map['github_repo'] || GITHUB_REPO,
    };
  } catch (err) {
    console.error('Failed to query app_settings:', err);
    return {
      company_name: 'CRYSTAL',
      company_logo: '',
      github_repo: GITHUB_REPO,
    };
  }
}

// GET /api/settings - Public read for branding & app version across UI & TV screens
settingsRouter.get('/', async (c) => {
  const settings = await getAppSettings(c.env.DB);
  const ghToken = await resolveGithubToken(c.env);
  const activeRepo = await resolveGithubRepo(c.env.DB);
  const activeRepoUrl = `https://github.com/${activeRepo}`;
  return c.json({
    settings: {
      ...settings,
      github_repo: activeRepo,
      has_github_token: Boolean(ghToken),
    },
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

  
  if (body.github_repo !== undefined) {
    const rawRepo = String(body.github_repo || '').trim();
    if (rawRepo) {
      await c.env.DB
        .prepare(`
          INSERT INTO app_settings (key, value, updated_at) VALUES ('github_repo', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `)
        .bind(rawRepo)
        .run();
    } else {
      await c.env.DB
        .prepare("DELETE FROM app_settings WHERE key = 'github_repo'")
        .run();
    }
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
  const isEn = c.req.header('accept-language')?.toLowerCase().includes('en');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Only Admin can check or apply system updates' }, 403);
  }

  const ghToken = await resolveGithubToken(c.env);
  const activeRepo = await resolveGithubRepo(c.env.DB);
  const activeRepoUrl = `https://github.com/${activeRepo}`;

  const headers: Record<string, string> = {
    'User-Agent': 'Crystal-5S-Audit-Updater',
    Accept: 'application/vnd.github.v3+json',
  };
  if (ghToken) {
    headers['Authorization'] = `Bearer ${ghToken}`;
  }

  try {
    let latestVersion = APP_VERSION;
    let changelog = '';
    let fetched = false;

    // 1. Try GitHub API
    try {
      const pkgRes = await fetch(
        `https://api.github.com/repos/${activeRepo}/contents/package.json?ref=main`,
        { headers }
      );
      if (pkgRes.ok) {
        const pkgData: any = await pkgRes.json();
        const decodedPkg = JSON.parse(atob(String(pkgData.content || '').replace(/\s/g, '')));
        latestVersion = String(decodedPkg.version || APP_VERSION).trim();
        fetched = true;
      }
    } catch {}

    // 2. Fallback to raw.githubusercontent.com (works for Public repos or with Authorization token)
    if (!fetched) {
      try {
        const rawHeaders: Record<string, string> = {
          'User-Agent': 'Crystal-5S-Audit-Updater',
        };
        if (ghToken) {
          rawHeaders['Authorization'] = `token ${ghToken}`;
        }
        const rawRes = await fetch(
          `https://raw.githubusercontent.com/${activeRepo}/main/package.json`,
          { headers: rawHeaders }
        );
        if (rawRes.ok) {
          const rawPkg = (await rawRes.json()) as any;
          if (rawPkg?.version) {
            latestVersion = String(rawPkg.version).trim();
            fetched = true;
          }
        }
      } catch {}
    }

    if (!fetched) {
      return c.json({
        current_version: APP_VERSION,
        latest_version: APP_VERSION,
        has_update: false,
        has_github_token: Boolean(ghToken),
        repo: activeRepo,
        repo_url: activeRepoUrl,
        checked_at: new Date().toISOString(),
        mode: 'cloud_worker',
        notice: isEn
          ? (ghToken
              ? 'Cannot access GitHub repository with current Token. Please check token permissions.'
              : 'GitHub repository is Private or unconfigured Token. If Public, auto-update is enabled.')
          : (ghToken
              ? 'Không thể truy cập GitHub repository với Token hiện tại. Vui lòng kiểm tra lại quyền hạn của Token.'
              : 'Kho GitHub đang ở chế độ Private hoặc chưa được cấu hình Token. Nếu chuyển repo sang Public, hệ thống sẽ tự động cập nhật mà không cần Token.'),
      });
    }

    const hasUpdate = compareSemver(latestVersion, APP_VERSION) > 0;

    // Fetch CHANGELOG.md (GitHub API first, then raw fallback)
    try {
      const chgRes = await fetch(
        `https://api.github.com/repos/${activeRepo}/contents/CHANGELOG.md?ref=main`,
        { headers }
      );
      if (chgRes.ok) {
        const chgData: any = await chgRes.json();
        const binStr = atob(String(chgData.content || '').replace(/\s/g, ''));
        const bytes = Uint8Array.from(binStr, (ch) => ch.charCodeAt(0));
        changelog = new TextDecoder('utf-8').decode(bytes);
      } else {
        const rawChg = await fetch(
          `https://raw.githubusercontent.com/${activeRepo}/main/CHANGELOG.md`,
          {
            headers: ghToken
              ? { Authorization: `token ${ghToken}`, 'User-Agent': 'Crystal-5S-Audit-Updater' }
              : { 'User-Agent': 'Crystal-5S-Audit-Updater' },
          }
        );
        if (rawChg.ok) {
          changelog = await rawChg.text();
        }
      }
    } catch {}

    return c.json({
      current_version: APP_VERSION,
      latest_version: latestVersion,
      has_update: hasUpdate,
      has_github_token: Boolean(ghToken),
      changelog: changelog.slice(0, 3000),
      repo: activeRepo,
      repo_url: activeRepoUrl,
      checked_at: new Date().toISOString(),
      mode: 'cloud_worker',
    });
  } catch (err: any) {
    return c.json({
      current_version: APP_VERSION,
      latest_version: APP_VERSION,
      has_update: false,
      has_github_token: Boolean(ghToken),
      repo: activeRepo,
      repo_url: activeRepoUrl,
      checked_at: new Date().toISOString(),
      mode: 'cloud_worker',
      error: err.message || 'Failed to check GitHub for updates',
    });
  }
});

// POST /api/settings/cloud-update-apply - Trigger Cloudflare CI/CD deployment via GitHub Actions (Admin only!)
settingsRouter.post('/cloud-update-apply', authMiddleware, async (c) => {
  const user = c.get('user');
  const isEn = c.req.header('accept-language')?.toLowerCase().includes('en');
  if (!isAdmin(user)) {
    return c.json({ error: isEn ? 'Forbidden: Only Admin can apply system updates' : 'Forbidden: Chỉ Admin mới có quyền cập nhật hệ thống' }, 403);
  }

  const ghToken = await resolveGithubToken(c.env);
  if (!ghToken) {
    return c.json(
      {
        code: 'MISSING_GITHUB_TOKEN',
        error: isEn
          ? 'Cloudflare Auto-Update requires a configured GITHUB_TOKEN (with workflow scope) in the Token Settings section below to trigger GitHub Actions Deploy. Or you can run \'npx wrangler deploy\' directly from your computer.'
          : 'Cloudflare Auto-Update yêu cầu cấu hình GITHUB_TOKEN (có quyền workflow) trong ô Cấu hình Token bên dưới để kích hoạt GitHub Actions Deploy tự động. Hoặc bạn có thể chạy lệnh "npx wrangler deploy" trực tiếp từ máy tính.',
      },
      400
    );
  }

  const activeRepo = await resolveGithubRepo(c.env.DB);
  const cfConfig = await resolveCloudflareConfig(c.env);

  const headers: Record<string, string> = {
    'User-Agent': 'Crystal-5S-Audit-Updater',
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${ghToken}`,
    'Content-Type': 'application/json',
  };

  const dispatchPayload: Record<string, any> = {
    ref: 'main',
  };
  if (cfConfig.apiToken || cfConfig.accountId) {
    dispatchPayload.inputs = {
      cf_token: cfConfig.apiToken || '',
      cf_account_id: cfConfig.accountId || '',
    };
  }

  try {
    const dispatchRes = await fetch(
      `https://api.github.com/repos/${activeRepo}/actions/workflows/deploy.yml/dispatches`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(dispatchPayload),
      }
    );

    if (!dispatchRes.ok && dispatchRes.status !== 204) {
      const errBody = await dispatchRes.text().catch(() => '');
      let helpfulTip = '';
      if (dispatchRes.status === 404) {
        helpfulTip = isEn
          ? ` (Please check repository "${activeRepo}" or verify that your Token has permission to access it)`
          : ` (Kiểm tra lại repository "${activeRepo}" hoặc đảm bảo Token có quyền truy cập repo)`;
      } else if (dispatchRes.status === 401 || dispatchRes.status === 403) {
        helpfulTip = isEn
          ? ' (Token does not have sufficient "workflow" permission or has expired)'
          : ' (Token không đủ quyền "workflow" hoặc đã hết hạn)';
      }
      return c.json(
        {
          code: 'DISPATCH_FAILED',
          error: isEn
            ? `Unable to trigger GitHub Actions workflow (HTTP ${dispatchRes.status}): ${errBody.slice(0, 150)}${helpfulTip}`
            : `Không thể kích hoạt GitHub Actions workflow (HTTP ${dispatchRes.status}): ${errBody.slice(0, 150)}${helpfulTip}`,
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
      `from=${APP_VERSION}&repo=${activeRepo}`
    );

    return c.json({
      ok: true,
      mode: 'cloud_worker',
      previous_version: APP_VERSION,
      new_version: 'latest (CI/CD deploying)',
      log: isEn
        ? [
            `▶ Authenticated as Administrator (${user.username}).`,
            `▶ Dispatched GitHub Actions Workflow (deploy.yml) on main branch of ${activeRepo}.`,
            cfConfig.apiToken
              ? '✔ Successfully auto-passed Cloudflare API credentials from Web Settings into GitHub Actions.'
              : 'ℹ No Cloudflare credentials in Web Settings; utilizing GitHub Repository Secrets.',
            '✔ GitHub Actions CI/CD is executing verification (typecheck + test), remote D1 migrations, and deploying to Cloudflare Workers.',
            'ℹ Please allow 1-2 minutes for Cloudflare edge network to propagate the new release.',
          ].join('\n')
        : [
            `▶ Đã xác thực quyền Admin (${user.username}).`,
            `▶ Đã gửi lệnh kích hoạt GitHub Actions Workflow (deploy.yml) trên nhánh main của ${activeRepo}.`,
            cfConfig.apiToken
              ? '✔ Đã tự động truyền Cloudflare API Token từ trang Cài đặt sang GitHub Actions an toàn.'
              : 'ℹ Đang sử dụng Cloudflare Secrets được cấu hình sẵn trên GitHub Repository.',
            '✔ Tiến trình CI/CD trên GitHub đang tự động chạy kiểm tra (typecheck + test), áp dụng D1 migrations (--remote) và triển khai phiên bản mới lên Cloudflare Workers.',
            'ℹ Vui lòng đợi khoảng 1-2 phút để Cloudflare cập nhật phiên bản mới trên toàn mạng lưới.',
          ].join('\n'),
    });
  } catch (err: any) {
    return c.json(
      {
        error: (isEn ? 'Failed to trigger cloud auto-update: ' : 'Lỗi khi kích hoạt cập nhật Cloudflare: ') + (err.message || ''),
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

// ── Cloudflare Account & Free Tier Monitoring (Admin only) ──

interface ResolvedCloudflareConfig {
  accountId: string;
  apiToken: string;
  customDomain: string;
  workerName: string;
  databaseId: string;
  bucketName: string;
}

async function resolveCloudflareConfig(env: Env): Promise<ResolvedCloudflareConfig> {
  let accountId = (env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  let apiToken = (env.CLOUDFLARE_API_TOKEN || '').trim();
  let customDomain = '';
  let workerName = '5s-audit';
  let databaseId = '';
  let bucketName = 'crystal5s-photos';

  try {
    const rows = await env.DB
      .prepare(`
        SELECT key, value FROM app_settings 
        WHERE key IN ('cf_account_id', 'cf_api_token', 'cf_custom_domain', 'cf_worker_name', 'cf_database_id', 'cf_bucket_name')
      `)
      .all<{ key: string; value: string }>();

    for (const r of rows.results || []) {
      if (r.key === 'cf_account_id' && !accountId && r.value) {
        accountId = r.value.trim();
      } else if (r.key === 'cf_api_token' && !apiToken && r.value) {
        apiToken = (await decryptSecret(r.value.trim(), env.JWT_SECRET)).trim();
      } else if (r.key === 'cf_custom_domain' && r.value) {
        customDomain = r.value.trim();
      } else if (r.key === 'cf_worker_name' && r.value) {
        workerName = r.value.trim();
      } else if (r.key === 'cf_database_id' && r.value) {
        databaseId = r.value.trim();
      } else if (r.key === 'cf_bucket_name' && r.value) {
        bucketName = r.value.trim();
      }
    }
  } catch {}

  return { accountId, apiToken, customDomain, workerName, databaseId, bucketName };
}

// GET /api/settings/cloudflare-status - Get Cloudflare account info, domains, and Free Tier quotas (Admin only)
settingsRouter.get('/cloudflare-status', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const cfCfg = await resolveCloudflareConfig(c.env);
  const internal = await getInternalUsageMetrics(c.env.DB);
  const host = c.req.header('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  let accountName = 'Crystal Factory 5S';
  let plan = 'Cloudflare Free Tier';
  let hasValidToken = false;
  let remoteD1Size = 0;
  let cfApiError: string | undefined;

  if (cfCfg.apiToken && cfCfg.accountId) {
    const acc = await getCloudflareAccountInfo(cfCfg.apiToken, cfCfg.accountId);
    if (acc.valid) {
      hasValidToken = true;
      if (acc.account_name) accountName = acc.account_name;
      if (acc.plan) plan = acc.plan;

      if (cfCfg.databaseId) {
        const d1 = await getCloudflareD1Database(cfCfg.apiToken, cfCfg.accountId, cfCfg.databaseId);
        if (d1 && typeof d1.file_size === 'number') {
          remoteD1Size = d1.file_size;
        }
      }
    } else {
      cfApiError = acc.error;
    }
  }

  // Calculate Quotas vs Cloudflare Plan (Free Tier vs Paid Plan)
  const isPaidPlan =
    plan.toLowerCase().includes('paid') ||
    plan.toLowerCase().includes('pro') ||
    plan.toLowerCase().includes('business') ||
    plan.toLowerCase().includes('enterprise');

  const workersReqUsed = Math.max(internal.activity_count_today * 12, 65);
  const workersReqLimit = isPaidPlan ? 10_000_000 : CF_FREE_TIER_LIMITS.workers.daily_requests;
  const workersReqPercent = Number(((workersReqUsed / workersReqLimit) * 100).toFixed(2));

  const d1BytesUsed = remoteD1Size > 0 ? remoteD1Size : internal.d1_bytes_estimated;
  const d1BytesLimit = isPaidPlan ? 10 * 1024 * 1024 * 1024 : CF_FREE_TIER_LIMITS.d1.max_storage_bytes;
  const d1StorageLimitMb = isPaidPlan ? 10240 : CF_FREE_TIER_LIMITS.d1.max_storage_mb;
  const d1Percent = Number(((d1BytesUsed / d1BytesLimit) * 100).toFixed(2));

  const d1ReadsUsed = internal.reads_today_estimated;
  const d1ReadsLimit = isPaidPlan ? 25_000_000_000 : CF_FREE_TIER_LIMITS.d1.daily_reads;
  const d1ReadsPercent = Number(((d1ReadsUsed / d1ReadsLimit) * 100).toFixed(3));

  const d1WritesUsed = internal.writes_today_estimated;
  const d1WritesLimit = isPaidPlan ? 50_000_000 : CF_FREE_TIER_LIMITS.d1.daily_writes;
  const d1WritesPercent = Number(((d1WritesUsed / d1WritesLimit) * 100).toFixed(2));

  const r2BytesUsed = internal.r2_bytes_estimated;
  const r2BytesLimit = CF_FREE_TIER_LIMITS.r2.max_storage_bytes;
  const r2Percent = Number(((r2BytesUsed / r2BytesLimit) * 100).toFixed(2));

  const response: CloudflareStatusResponse = {
    connected: hasValidToken || !isLocal,
    mode: isLocal ? 'local_emulation' : 'cloud_worker',
    account: {
      id_masked: cfCfg.accountId ? maskString(cfCfg.accountId, 6, 4) : 'cf-demo-tier-free',
      name: accountName,
      plan,
      has_token: Boolean(cfCfg.apiToken),
    },
    domains: {
      worker_subdomain: `${cfCfg.workerName}.workers.dev`,
      worker_url: `https://${cfCfg.workerName}.workers.dev`,
      custom_domain: cfCfg.customDomain || null,
      custom_domain_url: cfCfg.customDomain
        ? (cfCfg.customDomain.startsWith('http') ? cfCfg.customDomain : `https://${cfCfg.customDomain}`)
        : null,
      ssl_active: true,
    },
    quotas: {
      workers_requests_daily: {
        used: workersReqUsed,
        limit: workersReqLimit,
        percent: workersReqPercent,
        unit: isPaidPlan ? 'requests/tháng (Paid)' : 'requests/ngày',
        status: calculateMetricStatus(workersReqPercent),
      },
      d1_storage: {
        used: Math.round((d1BytesUsed / (1024 * 1024)) * 100) / 100,
        limit: d1StorageLimitMb,
        percent: d1Percent,
        unit: 'MB',
        status: calculateMetricStatus(d1Percent),
      },
      d1_reads_daily: {
        used: d1ReadsUsed,
        limit: d1ReadsLimit,
        percent: d1ReadsPercent,
        unit: 'rows read/ngày',
        status: calculateMetricStatus(d1ReadsPercent),
      },
      d1_writes_daily: {
        used: d1WritesUsed,
        limit: d1WritesLimit,
        percent: d1WritesPercent,
        unit: 'rows written/ngày',
        status: calculateMetricStatus(d1WritesPercent),
      },
      r2_storage: {
        used: Math.round((r2BytesUsed / (1024 * 1024 * 1024)) * 1000) / 1000,
        limit: CF_FREE_TIER_LIMITS.r2.max_storage_gb,
        percent: r2Percent,
        unit: 'GB',
        status: calculateMetricStatus(r2Percent),
      },
      r2_photos_count: internal.photos_count,
      r2_estimated_capacity_photos: Math.max(0, Math.floor((r2BytesLimit - r2BytesUsed) / (200 * 1024))),
    },
    details: {
      d1_database_name: 'cetvn-5s-db',
      d1_database_id_masked: cfCfg.databaseId ? maskString(cfCfg.databaseId, 6, 4) : 'd1-auto-binding',
      r2_bucket_name: cfCfg.bucketName,
      worker_name: cfCfg.workerName,
      total_db_rows: internal.total_db_rows,
      activity_count_today: internal.activity_count_today,
    },
    last_checked: new Date().toISOString(),
    error: cfApiError,
  };

  return c.json(response);
});

// POST /api/settings/cloudflare-test - Verify token and account ID without saving (Admin only)
settingsRouter.post('/cloudflare-test', authMiddleware, async (c) => {
  const user = c.get('user');
  const isEn = c.req.header('accept-language')?.toLowerCase().includes('en');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const apiToken = String(body.api_token || '').trim();
  const accountId = String(body.account_id || '').trim();

  if (!apiToken) {
    return c.json({ ok: false, error: isEn ? 'Please enter a Cloudflare API Token to test' : 'Vui lòng nhập Cloudflare API Token để kiểm tra' }, 400);
  }

  const verify = await verifyCloudflareToken(apiToken, isEn);
  if (!verify.valid) {
    return c.json({ ok: false, error: verify.message || 'API Token không hợp lệ' }, 400);
  }

  let accountName = 'Tài khoản Cloudflare';
  let plan = 'Free Tier';
  let predictedSubdomain: string | null = null;
  let predictedWorkerUrl: string | null = null;

  if (accountId) {
    const acc = await getCloudflareAccountInfo(apiToken, accountId, isEn);
    if (!acc.valid) {
      return c.json({
        ok: false,
        error: `Token hợp lệ nhưng không thể truy cập Account ID "${accountId}": ${acc.error || 'Quyền bị từ chối'}`,
      }, 400);
    }
    if (acc.account_name) accountName = acc.account_name;
    if (acc.plan) plan = acc.plan;

    const sub = await getCloudflareWorkerSubdomain(apiToken, accountId);
    if (sub) {
      predictedSubdomain = sub;
      const workerName = String(body.worker_name || '5s-audit').trim();
      predictedWorkerUrl = `https://${workerName}.${sub}.workers.dev`;
    }
  }

  return c.json({
    ok: true,
    message: isEn ? 'Cloudflare connection successful! Token is valid.' : 'Kết nối Cloudflare thành công! Token có hiệu lực.',
    account_name: accountName,
    plan,
    predicted_subdomain: predictedSubdomain,
    predicted_worker_url: predictedWorkerUrl,
  });
});

// GET /api/settings/export-backup - Download complete SQLite SQL dump for D1 backup & account migration (Admin only)
settingsRouter.get('/export-backup', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const backup = await generateDatabaseBackupSql(c.env.DB);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `crystal5s_backup_${dateStr}.sql`;

  await logActivity(
    c.env.DB,
    user.id,
    'export_database_backup',
    'settings',
    null,
    `tables=${backup.summary.tables}, rows=${backup.summary.rows}`
  );

  c.header('Content-Type', 'application/sql; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
  return c.text(backup.sql);
});

// PUT /api/settings/cloudflare-config - Update Account ID, API Token (encrypted), Worker name, Custom domain (Admin only)
settingsRouter.put('/cloudflare-config', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const statements: D1PreparedStatement[] = [];

  if (body.account_id !== undefined) {
    const accId = String(body.account_id || '').trim();
    statements.push(
      c.env.DB.prepare(`
        INSERT INTO app_settings (key, value, updated_at) VALUES ('cf_account_id', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).bind(accId)
    );
  }

  if (body.api_token !== undefined) {
    const rawToken = String(body.api_token || '').trim();
    const encryptedToken = rawToken ? await encryptSecret(rawToken, c.env.JWT_SECRET) : '';
    statements.push(
      c.env.DB.prepare(`
        INSERT INTO app_settings (key, value, updated_at) VALUES ('cf_api_token', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).bind(encryptedToken)
    );
  }

  if (body.worker_name !== undefined) {
    const workerName = String(body.worker_name || '').trim();
    if (workerName) {
      statements.push(
        c.env.DB.prepare(`
          INSERT INTO app_settings (key, value, updated_at) VALUES ('cf_worker_name', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).bind(workerName)
      );
    }
  }

  if (body.custom_domain !== undefined) {
    const customDomain = String(body.custom_domain || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    statements.push(
      c.env.DB.prepare(`
        INSERT INTO app_settings (key, value, updated_at) VALUES ('cf_custom_domain', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).bind(customDomain)
    );
  }

  if (body.database_id !== undefined) {
    const dbId = String(body.database_id || '').trim();
    if (dbId) {
      statements.push(
        c.env.DB.prepare(`
          INSERT INTO app_settings (key, value, updated_at) VALUES ('cf_database_id', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).bind(dbId)
      );
    }
  }

  if (body.bucket_name !== undefined) {
    const bucket = String(body.bucket_name || '').trim();
    if (bucket) {
      statements.push(
        c.env.DB.prepare(`
          INSERT INTO app_settings (key, value, updated_at) VALUES ('cf_bucket_name', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).bind(bucket)
      );
    }
  }

  if (statements.length > 0) {
    await c.env.DB.batch(statements);
  }

  await logActivity(
    c.env.DB,
    user.id,
    'update_cf_config',
    'settings',
    null,
    `account_id_updated=${body.account_id !== undefined}, token_updated=${body.api_token !== undefined}`
  );

  return c.json({
    ok: true,
    message: c.req.header('accept-language')?.toLowerCase().includes('en') ? 'Successfully updated Cloudflare account and domain configuration' : 'Đã cập nhật cấu hình tài khoản Cloudflare và tên miền thành công',
  });
});

