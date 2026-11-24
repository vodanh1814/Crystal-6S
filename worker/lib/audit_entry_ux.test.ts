import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXTERNAL_CHECKLIST_CODES,
  MAX_PHOTOS_PER_KIND,
  applyOptimisticExternalCounts,
  clampNonNegativeInt,
  computePreviewEscalation,
  formatFileSize,
  getEligibleChecklistItems,
  getRemainingPhotoSlots,
  mergeServerDescriptions,
  summarizeAuditReadiness,
} from '../../src/lib/auditEntry.ts';

function readProjectFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8');
}

test('getEligibleChecklistItems excludes external audit codes and area-specific N/A criteria', () => {
  const items = [
    { id: 1, code: 'S1.1' },
    { id: 2, code: 'S2.1' },
    { id: 3, code: 'S5.2-BOD' },
    { id: 4, code: 'S5.2-CUS' },
    { id: 5, code: 'S5.3' },
  ];
  const naSet = new Set(['10_2', '11_1']);

  assert.equal(EXTERNAL_CHECKLIST_CODES.has('S5.2-BOD'), true);
  assert.deepEqual(
    getEligibleChecklistItems(items, naSet, 10).map((i) => i.code),
    ['S1.1']
  );
  assert.deepEqual(
    getEligibleChecklistItems(items, naSet, 11).map((i) => i.code),
    ['S2.1']
  );
  assert.deepEqual(
    getEligibleChecklistItems(items, naSet, '').map((i) => i.code),
    ['S1.1', 'S2.1']
  );
});

test('computePreviewEscalation matches backend repeat penalty calculation', () => {
  assert.deepEqual(computePreviewEscalation(2, 1, 0), { repeatLevel: 1, appliedPenalty: 2 });
  assert.deepEqual(computePreviewEscalation(2, 1, 1), { repeatLevel: 2, appliedPenalty: 3 });
  assert.deepEqual(computePreviewEscalation(2, 1, 3), { repeatLevel: 4, appliedPenalty: 5 });
  assert.deepEqual(computePreviewEscalation(4, 0, 2), { repeatLevel: 1, appliedPenalty: 4 });
});

test('mergeServerDescriptions preserves dirty local edits while updating clean rows', () => {
  const prevLocal = {
    101: 'Đang gõ dở ở máy #4...',
    102: 'Mô tả cũ',
    999: 'Lỗi đã xóa',
  };
  const dirtyIds = new Set([101]);
  const serverFindings = [
    { id: 101, description: '' },
    { id: 102, description: 'Mô tả mới từ server' },
    { id: 103, description: null },
  ];

  assert.deepEqual(mergeServerDescriptions(prevLocal, dirtyIds, serverFindings), {
    101: 'Đang gõ dở ở máy #4...',
    102: 'Mô tả mới từ server',
    103: '',
  });
});

test('clampNonNegativeInt handles empty, negative, invalid, and oversized values', () => {
  assert.equal(clampNonNegativeInt(''), 0);
  assert.equal(clampNonNegativeInt(null), 0);
  assert.equal(clampNonNegativeInt('-5'), 0);
  assert.equal(clampNonNegativeInt('abc'), 0);
  assert.equal(clampNonNegativeInt('12.9'), 12);
  assert.equal(clampNonNegativeInt('1500'), 999);
  assert.equal(clampNonNegativeInt('7', 10), 7);
});

test('getRemainingPhotoSlots and formatFileSize enforce limits and display units cleanly', () => {
  assert.equal(MAX_PHOTOS_PER_KIND, 6);
  assert.equal(getRemainingPhotoSlots(2, 1), 3);
  assert.equal(getRemainingPhotoSlots(4, 3), 0);
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(320 * 1024), '320 KB');
  assert.equal(formatFileSize(2.5 * 1024 * 1024), '2.50 MB');
});

test('summarizeAuditReadiness detects findings missing before photos or descriptions', () => {
  const summary = summarizeAuditReadiness([
    { id: 1, area_id: 10, description: 'OK', photos: [{ kind: 'before' }] },
    { id: 2, area_id: 10, description: '   ', photos: [{ kind: 'before' }] },
    { id: 3, area_id: 11, description: 'Bụi bẩn', photos: [] },
    { id: 4, area_id: 12, description: '', photos: [{ kind: 'after' }] },
  ]);

  assert.equal(summary.totalFindings, 4);
  assert.equal(summary.missingPhotoCount, 2);
  assert.equal(summary.missingDescCount, 2);
  assert.deepEqual(
    summary.missingPhotoFindings.map((f) => f.id),
    [3, 4]
  );
  assert.deepEqual(
    summary.missingDescFindings.map((f) => f.id),
    [2, 4]
  );
});

test('applyOptimisticExternalCounts computes area and plant live scores accurately', () => {
  const initial = [
    {
      area_id: 1,
      finding_penalty: 2,
      bod_count: 0,
      customer_count: 0,
      ie_count: 0,
      external_penalty: 0,
      total_penalty: 2,
      score: 98,
    },
    {
      area_id: 2,
      finding_penalty: 0,
      bod_count: 0,
      customer_count: 0,
      ie_count: 0,
      external_penalty: 0,
      total_penalty: 0,
      score: 100,
    },
  ];

  const updated = applyOptimisticExternalCounts(initial, 1, {
    bod_count: 1, // -4
    customer_count: 1, // -6
    ie_count: 2, // -2
  });

  // Area 1: finding=2 + external=(4+6+2)=12 => total=14 => score=86
  assert.equal(updated.areaScores[0].external_penalty, 12);
  assert.equal(updated.areaScores[0].total_penalty, 14);
  assert.equal(updated.areaScores[0].score, 86);
  // Plant: (86 + 100) / 2 = 93
  assert.equal(updated.liveScore.totalPenalty, 14);
  assert.equal(updated.liveScore.score, 93);
});

test('Photo approval flow, Lightbox local preview, and Audit/Finding UX safeguards are integrated', () => {
  const lightbox = readProjectFile('src/components/Lightbox.tsx');
  const photoUpload = readProjectFile('src/components/PhotoUpload.tsx');
  const photoApprovalModal = readProjectFile('src/components/PhotoApprovalModal.tsx');
  const auditDetail = readProjectFile('src/pages/AuditDetail.tsx');
  const findingDetail = readProjectFile('src/pages/FindingDetail.tsx');

  // Lightbox supports local ObjectURL previews and capture-phase Escape handling
  assert.match(lightbox, /src\?:\s*string/);
  assert.match(lightbox, /stopImmediatePropagation/);

  // PhotoApprovalModal provides 2K preview, rotation, zoom, and approval upload
  assert.match(photoApprovalModal, /rotateImageBlob/);
  assert.match(photoApprovalModal, /revokeStagedPhotos/);
  assert.match(photoApprovalModal, /btn_approve_upload/);

  // PhotoUpload routes selections through PhotoApprovalModal
  assert.match(photoUpload, /PhotoApprovalModal/);
  assert.match(photoUpload, /onUploadBatch/);

  // AuditDetail preserves dirty inline notes, supports direct numeric external entry, and keeps sticky bar above mobile nav
  assert.match(auditDetail, /mergeServerDescriptions/);
  assert.match(auditDetail, /inputMode="numeric"/);
  assert.match(auditDetail, /PhotoApprovalModal/);
  assert.match(auditDetail, /StagedPhotoTray/);
  assert.match(auditDetail, /bottom-16 md:bottom-2/);
  assert.match(auditDetail, /isComposing/);

  // FindingDetail preserves fixNote during photo updates and uses unified Lightbox
  assert.match(findingDetail, /fixNoteDirtyRef/);
  assert.match(findingDetail, /handleUploadAfterPhotoBatch/);
  assert.match(findingDetail, /<Lightbox/);
});
