import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAuditArea,
  canManageArea,
  getAuditedAreaIds,
  getManagedAreaIds,
} from './permissions.ts';
import type { User, UserArea } from '../types';

const adminUser: User = {
  id: 1,
  username: 'admin',
  password_hash: '',
  full_name: 'Admin User',
  role: 'admin',
  lang: 'vi',
  active: 1,
  token_version: 0,
  created_at: '',
};

const auditorUser: User = {
  id: 2,
  username: 'auditor1',
  password_hash: '',
  full_name: 'Auditor 1',
  role: 'auditor',
  lang: 'vi',
  active: 1,
  token_version: 0,
  created_at: '',
};

const managerUser: User = {
  id: 3,
  username: 'manager1',
  password_hash: '',
  full_name: 'Manager 1',
  role: 'manager',
  lang: 'vi',
  active: 1,
  token_version: 0,
  created_at: '',
};

const viewerUser: User = {
  id: 4,
  username: 'viewer1',
  password_hash: '',
  full_name: 'Viewer 1',
  role: 'viewer',
  lang: 'vi',
  active: 1,
  token_version: 0,
  created_at: '',
};

const managerAreas: UserArea[] = [
  { user_id: 3, area_id: 30, role: 'manager' },
];

test('canAuditArea allows admin and plant-wide auditor for any area', () => {
  assert.equal(canAuditArea(adminUser, [], 999), true);
  assert.equal(canAuditArea(auditorUser, [], 10), true);
  assert.equal(canAuditArea(auditorUser, [], 20), true);
  assert.equal(canAuditArea(auditorUser, [], 30), true);
});

test('canAuditArea blocks manager and viewer from auditing or verifying', () => {
  assert.equal(canAuditArea(managerUser, managerAreas, 30), false);
  assert.equal(canAuditArea(viewerUser, [], 10), false);
});

test('canManageArea allows admin for any area', () => {
  assert.equal(canManageArea(adminUser, [], 999), true);
});

test('canManageArea enforces manager role and assigned areas only', () => {
  assert.equal(canManageArea(managerUser, managerAreas, 30), true);
  assert.equal(canManageArea(managerUser, managerAreas, 10), false);

  // Auditor is independent of areas and cannot act as Area MNG
  assert.equal(canManageArea(auditorUser, managerAreas, 30), false);
  // Viewer cannot manage areas
  assert.equal(canManageArea(viewerUser, managerAreas, 30), false);
});

test('getAuditedAreaIds returns null (all areas) for admin and auditor, empty for others', () => {
  assert.equal(getAuditedAreaIds(adminUser, []), null);
  assert.equal(getAuditedAreaIds(auditorUser, []), null);
  assert.deepEqual(getAuditedAreaIds(managerUser, managerAreas), []);
  assert.deepEqual(getAuditedAreaIds(viewerUser, []), []);
});

test('getManagedAreaIds returns null for admin, empty for non-managers, and area list for managers', () => {
  assert.equal(getManagedAreaIds(adminUser, managerAreas), null);
  assert.deepEqual(getManagedAreaIds(managerUser, managerAreas), [30]);
  assert.deepEqual(getManagedAreaIds(auditorUser, managerAreas), []);
  assert.deepEqual(getManagedAreaIds(viewerUser, managerAreas), []);
});
