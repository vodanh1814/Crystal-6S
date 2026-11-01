import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  maskString,
  calculateMetricStatus,
  verifyCloudflareToken,
  CF_FREE_TIER_LIMITS,
} from './cloudflare.ts';

test('maskString masks IDs properly', () => {
  assert.equal(maskString('1234567890abcdef', 4, 4), '1234••••••••cdef');
  assert.equal(maskString('short'), '••••••••');
  assert.equal(maskString(''), '');
});

test('calculateMetricStatus reflects Free Tier thresholds', () => {
  assert.equal(calculateMetricStatus(10), 'safe');
  assert.equal(calculateMetricStatus(69.9), 'safe');
  assert.equal(calculateMetricStatus(70), 'warning');
  assert.equal(calculateMetricStatus(89.9), 'warning');
  assert.equal(calculateMetricStatus(90), 'danger');
  assert.equal(calculateMetricStatus(105), 'danger');
});

test('verifyCloudflareToken handles empty or missing tokens safely', async () => {
  const emptyRes = await verifyCloudflareToken('');
  assert.equal(emptyRes.valid, false);

  const whitespaceRes = await verifyCloudflareToken('   ');
  assert.equal(whitespaceRes.valid, false);
});

test('CF_FREE_TIER_LIMITS defines accurate Cloudflare free quotas', () => {
  assert.equal(CF_FREE_TIER_LIMITS.workers.daily_requests, 100_000);
  assert.equal(CF_FREE_TIER_LIMITS.d1.daily_reads, 5_000_000);
  assert.equal(CF_FREE_TIER_LIMITS.d1.daily_writes, 100_000);
  assert.equal(CF_FREE_TIER_LIMITS.d1.max_storage_bytes, 500 * 1024 * 1024);
  assert.equal(CF_FREE_TIER_LIMITS.r2.max_storage_bytes, 10 * 1024 * 1024 * 1024);
});

test('generateDatabaseBackupSql produces valid SQLite SQL statements', async () => {
  const mockDb = {
    prepare: (query: string) => ({
      all: async () => {
        if (query.includes('users')) {
          return {
            results: [
              { id: 1, username: 'admin', role: 'admin' },
              { id: 2, username: 'auditor1', role: 'auditor' },
            ],
          };
        }
        return { results: [] };
      },
    }),
  } as unknown as D1Database;

  const { generateDatabaseBackupSql } = await import('./cloudflare.ts');
  const backup = await generateDatabaseBackupSql(mockDb);

  assert.equal(typeof backup.sql, 'string');
  assert.equal(backup.sql.includes('BEGIN TRANSACTION;'), true);
  assert.equal(backup.sql.includes('INSERT OR REPLACE INTO users'), true);
  assert.equal(backup.sql.includes("VALUES (1, 'admin', 'admin');"), true);
  assert.equal(backup.sql.includes('COMMIT;'), true);
  assert.equal(backup.summary.rows, 2);
  assert.equal(backup.summary.tables, 1);
});
