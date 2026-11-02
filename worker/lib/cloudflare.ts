/**
 * Cloudflare Free Tier Quotas & Monitoring Helper for Crystal 5S Audit
 * Provides quota metrics, token verification, account info, and domain mapping.
 */

import type { Env } from '../types';

export const CF_FREE_TIER_LIMITS = {
  workers: {
    daily_requests: 100_000,
    cpu_time_ms: 10,
    description: '100.000 requests/ngày (Reset 00:00 UTC)',
  },
  d1: {
    daily_reads: 5_000_000,
    daily_writes: 100_000,
    max_storage_bytes: 500 * 1024 * 1024, // 500 MB per DB
    max_storage_mb: 500,
    description: '5M reads/ngày • 100k writes/ngày • 500 MB SQLite/DB',
  },
  r2: {
    max_storage_bytes: 10 * 1024 * 1024 * 1024, // 10 GB
    max_storage_gb: 10,
    class_a_monthly: 1_000_000, // Upload / list
    class_b_monthly: 10_000_000, // Read / download
    egress_cost_usd: 0,
    description: '10 GB lưu trữ miễn phí/tháng • 1M lượt tải ảnh • 0đ phí băng thông (Zero Egress)',
  },
} as const;

export interface CloudflareQuotaMetric {
  used: number;
  limit: number;
  percent: number;
  unit: string;
  status: 'safe' | 'warning' | 'danger';
}

export interface CloudflareStatusResponse {
  connected: boolean;
  mode: 'cloud_worker' | 'local_emulation';
  account: {
    id_masked: string;
    name: string;
    plan: string;
    has_token: boolean;
  };
  domains: {
    worker_subdomain: string;
    worker_url: string;
    custom_domain: string | null;
    custom_domain_url: string | null;
    ssl_active: boolean;
  };
  quotas: {
    workers_requests_daily: CloudflareQuotaMetric;
    d1_storage: CloudflareQuotaMetric;
    d1_reads_daily: CloudflareQuotaMetric;
    d1_writes_daily: CloudflareQuotaMetric;
    r2_storage: CloudflareQuotaMetric;
    r2_photos_count: number;
    r2_estimated_capacity_photos: number;
  };
  details: {
    d1_database_name: string;
    d1_database_id_masked: string;
    r2_bucket_name: string;
    worker_name: string;
    total_db_rows: number;
    activity_count_today: number;
  };
  last_checked: string;
  error?: string;
}

export function maskString(str: string, keepStart = 4, keepEnd = 4): string {
  if (!str) return '';
  const trimmed = str.trim();
  if (trimmed.length <= keepStart + keepEnd) {
    return '••••••••';
  }
  const start = trimmed.slice(0, keepStart);
  const end = trimmed.slice(-keepEnd);
  return `${start}••••••••${end}`;
}

export function calculateMetricStatus(percent: number): 'safe' | 'warning' | 'danger' {
  if (percent >= 90) return 'danger';
  if (percent >= 70) return 'warning';
  return 'safe';
}

/**
 * Verifies Cloudflare API Token validity via Cloudflare API v4
 */
export async function verifyCloudflareToken(apiToken: string, isEn: boolean = false): Promise<{
  valid: boolean;
  status?: string;
  message?: string;
}> {
  if (!apiToken || !apiToken.trim()) {
    return { valid: false, message: isEn ? 'API Token cannot be empty' : 'API Token không được để trống' };
  }

  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return {
        valid: true,
        status: data.result?.status || 'active',
        message: isEn ? 'Cloudflare Token is valid and active.' : 'Token Cloudflare hợp lệ và đang hoạt động.',
      };
    }

    const errMsg =
      data.errors?.[0]?.message ||
      (res.status === 401 ? (isEn ? 'Token is invalid or expired.' : 'Token không hợp lệ hoặc đã hết hạn.') : `HTTP ${res.status}`);
    return {
      valid: false,
      status: 'invalid',
      message: errMsg,
    };
  } catch (err: any) {
    return {
      valid: false,
      message: isEn ? `Cannot connect to Cloudflare API: ${err.message || ''}` : `Không thể kết nối đến Cloudflare API: ${err.message || ''}`,
    };
  }
}

/**
 * Fetches Account details (Name, Plan) from Cloudflare API
 */
export async function getCloudflareAccountInfo(
  apiToken: string,
  accountId: string,
  isEn: boolean = false
): Promise<{ valid: boolean; account_name?: string; plan?: string; error?: string }> {
  if (!apiToken || !accountId) {
    return { valid: false, error: isEn ? 'Missing API Token or Account ID' : 'Thiếu API Token hoặc Account ID' };
  }

  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}`, {
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.result) {
      let plan = 'Free Tier';
      const rawType = String(data.result.type || '').toLowerCase();
      if (rawType.includes('pro')) plan = 'Cloudflare Pro';
      else if (rawType.includes('business')) plan = 'Cloudflare Business';
      else if (rawType.includes('enterprise')) plan = 'Cloudflare Enterprise';
      else if (rawType.includes('paid')) plan = 'Workers Paid Plan';
      else {
        // Check subscriptions endpoint for workers_paid
        try {
          const subRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/subscriptions`, {
            headers: {
              Authorization: `Bearer ${apiToken.trim()}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(4000),
          });
          const subData: any = await subRes.json().catch(() => ({}));
          if (subRes.ok && Array.isArray(subData.result)) {
            const hasPaid = subData.result.some((s: any) =>
              String(s.rate_plan?.id || s.component_values?.[0]?.name || '').toLowerCase().includes('paid')
            );
            if (hasPaid) plan = 'Workers Paid Plan';
          }
        } catch {}
      }

      return {
        valid: true,
        account_name: data.result.name || 'Cloudflare Account',
        plan,
      };
    }

    const errMsg = data.errors?.[0]?.message || `HTTP ${res.status}`;
    return { valid: false, error: errMsg };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

/**
 * Fetches Worker Subdomain for the given Account from Cloudflare API
 * E.g. returns "factory-subdomain" for "factory-subdomain.workers.dev"
 */
export async function getCloudflareWorkerSubdomain(
  apiToken: string,
  accountId: string
): Promise<string | null> {
  if (!apiToken || !accountId) return null;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/workers/subdomain`,
      {
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.result?.subdomain) {
      return String(data.result.subdomain).trim();
    }
  } catch {}
  return null;
}

/**
 * Fetches D1 Database details (size, num_tables) from Cloudflare API
 */
export async function getCloudflareD1Database(
  apiToken: string,
  accountId: string,
  databaseId: string
): Promise<{ file_size?: number; num_tables?: number; database_name?: string } | null> {
  if (!apiToken || !accountId || !databaseId || databaseId.startsWith('placeholder-')) {
    return null;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/d1/database/${databaseId.trim()}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.result) {
      return {
        file_size: data.result.file_size || 0,
        num_tables: data.result.num_tables || 0,
        database_name: data.result.name || '',
      };
    }
  } catch {}
  return null;
}

/**
 * Queries internal database records to calculate realistic fallback metrics
 * when Cloudflare API is not yet configured or running in local dev.
 */
export async function getInternalUsageMetrics(db: D1Database): Promise<{
  photos_count: number;
  r2_bytes_estimated: number;
  d1_bytes_estimated: number;
  total_db_rows: number;
  activity_count_today: number;
  writes_today_estimated: number;
  reads_today_estimated: number;
}> {
  let photosCount = 0;
  let totalDbRows = 0;
  let activityToday = 0;

  try {
    const pRow = await db.prepare('SELECT COUNT(*) as cnt FROM photos').first<{ cnt: number }>();
    photosCount = pRow?.cnt || 0;
  } catch {}

  try {
    const actRow = await db
      .prepare("SELECT COUNT(*) as cnt FROM activity_log WHERE date(created_at) = date('now')")
      .first<{ cnt: number }>();
    activityToday = actRow?.cnt || 0;
  } catch {}

  try {
    const [audits, findings, scores, users, areas, criteria] = await Promise.all([
      db.prepare('SELECT COUNT(*) as cnt FROM audits').first<{ cnt: number }>(),
      db.prepare('SELECT COUNT(*) as cnt FROM findings').first<{ cnt: number }>(),
      db.prepare('SELECT COUNT(*) as cnt FROM audit_area_scores').first<{ cnt: number }>(),
      db.prepare('SELECT COUNT(*) as cnt FROM users').first<{ cnt: number }>(),
      db.prepare('SELECT COUNT(*) as cnt FROM areas').first<{ cnt: number }>(),
      db.prepare('SELECT COUNT(*) as cnt FROM checklist_items').first<{ cnt: number }>(),
    ]);

    totalDbRows =
      photosCount +
      (audits?.cnt || 0) +
      (findings?.cnt || 0) +
      (scores?.cnt || 0) +
      (users?.cnt || 0) +
      (areas?.cnt || 0) +
      (criteria?.cnt || 0) +
      activityToday;
  } catch {}

  // Photos are compressed JPEGs: avg ~200 KB per photo
  const r2BytesEstimated = photosCount * 200 * 1024;

  // D1 DB size estimation: ~512 bytes per row + 64KB base SQLite page tables
  const d1BytesEstimated = Math.max(64 * 1024, totalDbRows * 512);

  // Daily operations estimation:
  // Activity today represents core actions. Each action causes ~5-10 reads and 1-3 writes.
  const writesToday = Math.max(activityToday * 3, 12);
  const readsToday = Math.max(activityToday * 25, 150);

  return {
    photos_count: photosCount,
    r2_bytes_estimated: r2BytesEstimated,
    d1_bytes_estimated: d1BytesEstimated,
    total_db_rows: totalDbRows,
    activity_count_today: activityToday,
    writes_today_estimated: writesToday,
    reads_today_estimated: readsToday,
  };
}

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Generates a complete SQLite SQL dump for D1 data portability & migration
 */
export async function generateDatabaseBackupSql(db: D1Database): Promise<{
  sql: string;
  summary: { tables: number; rows: number };
}> {
  const tables = [
    'app_settings',
    'users',
    'areas',
    'checklist_items',
    'user_areas',
    'area_item_na',
    'yearly_targets',
    'historical_monthly_scores',
    'audits',
    'audit_area_scores',
    'findings',
    'photos',
  ];

  const lines: string[] = [
    '-- Crystal 5S Audit - Database Backup & Migration Dump',
    `-- Exported At: ${new Date().toISOString()}`,
    '-- Compatible with Cloudflare D1 (SQLite)',
    '',
    'PRAGMA foreign_keys = OFF;',
    'BEGIN TRANSACTION;',
    '',
  ];

  let totalRows = 0;
  let tableCount = 0;

  for (const table of tables) {
    try {
      const result = await db.prepare(`SELECT * FROM ${table}`).all();
      const rows = result.results || [];
      if (rows.length > 0) {
        tableCount++;
        totalRows += rows.length;
        lines.push(`-- Table: ${table} (${rows.length} rows)`);
        lines.push(`DELETE FROM ${table};`);

        for (const row of rows) {
          // Cloudflare D1 /import API has a hard limit of 100,000 characters per SQL statement (SQLITE_TOOBIG).
          // Guard against oversized BLOBs or large base64 logos during backup/restore.
          if (table === 'app_settings' && (row as any).key === 'company_logo') {
            const val = String((row as any).value || '');
            if (val.length > 45000) {
              lines.push(
                `-- Note: company_logo omitted from SQL dump because size (${val.length} chars) exceeds SQLite statement limit.`
              );
              continue;
            }
          }

          const cols = Object.keys(row);
          const vals = cols.map((col) => escapeSqlValue((row as any)[col]));
          const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});`;

          if (sql.length > 80000) {
            lines.push(
              `-- Note: Row in ${table} omitted because statement length (${sql.length} chars) exceeds SQLite statement limit.`
            );
            continue;
          }

          lines.push(sql);
        }
        lines.push('');
      }
    } catch {}
  }

  lines.push('COMMIT;');
  lines.push('PRAGMA foreign_keys = ON;');
  lines.push('');

  return {
    sql: lines.join('\n'),
    summary: { tables: tableCount, rows: totalRows },
  };
}

