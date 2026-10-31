import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdmin,
  isViewer,
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

const auditorAreas: UserArea[] = [
  { user_id: 2, area_id: 10, role: 'auditor' },
  { user_id: 2, area_id: 20, role: 'auditor' },
];

const managerAreas: UserArea[] = [
  { user_id: 3, area_id: 30, role: 'manager' },
];

test('canAuditArea allows admin for any area', () => {
  assert.equal(canAuditArea(adminUser, [], 999), true);
});

test('canAuditArea enforces auditor role and assigned areas', () => {
  assert.equal(canAuditArea(auditorUser, auditorAreas, 10), true);
  assert.equal(canAuditArea(auditorUser, auditorAreas, 20), true);
  assert.equal(canAuditArea(auditorUser, auditorAreas, 30), false);

  // Area MNG cannot audit even if assigned
  assert.equal(canAuditArea(managerUser, auditorAreas, 10), false);
  // Viewer cannot audit
  assert.equal(canAuditArea(viewerUser, auditorAreas, 10), false);
});

test('canManageArea allows admin for any area', () => {
  assert.equal(canManageArea(adminUser, [], 999), true);
});

test('canManageArea enforces manager role and assigned areas', () => {
  assert.equal(canManageArea(managerUser, managerAreas, 30), true);
  assert.equal(canManageArea(managerUser, managerAreas, 10), false);

  // Auditor cannot manage areas
  assert.equal(canManageArea(auditorUser, managerAreas, 30), false);
  // Viewer cannot manage areas
  assert.equal(canManageArea(viewerUser, managerAreas, 30), false);
});

test('getAuditedAreaIds returns null for admin, empty for non-auditors, and area list for auditors', () => {
  assert.equal(getAuditedAreaIds(adminUser, auditorAreas), null);
  assert.deepEqual(getAuditedAreaIds(auditorUser, auditorAreas), [10, 20]);
  assert.deepEqual(getAuditedAreaIds(managerUser, auditorAreas), []);
  assert.deepEqual(getAuditedAreaIds(viewerUser, auditorAreas), []);
});

test('getManagedAreaIds returns null for admin, empty for non-managers, and area list for managers', () => {
  assert.equal(getManagedAreaIds(adminUser, managerAreas), null);
  assert.deepEqual(getManagedAreaIds(managerUser, managerAreas), [30]);
  assert.deepEqual(getManagedAreaIds(auditorUser, managerAreas), []);
  assert.deepEqual(getManagedAreaIds(viewerUser, managerAreas), []);
});
