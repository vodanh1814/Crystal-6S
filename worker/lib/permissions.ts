import type { User, UserArea } from '../types';

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

export function isAuditor(user: User): boolean {
  return user.role === 'auditor';
}

export function isViewer(user: User): boolean {
  return user.role === 'viewer';
}

/**
 * Auditor is a plant-wide role (does NOT belong to a specific area).
 * Any user with role 'auditor' or 'admin' can audit and verify findings across all areas.
 */
export function canAuditArea(user: User, _userAreas?: UserArea[], _areaId?: number): boolean {
  return user.role === 'admin' || user.role === 'auditor';
}

/**
 * Area MNG ('manager') belongs strictly to their assigned area(s).
 * Only the Area MNG of that specific area (or Admin) can upload After photos and submit fixes.
 */
export function canManageArea(user: User, userAreas: UserArea[], areaId: number): boolean {
  if (user.role === 'admin') {
    return true;
  }
  if (user.role !== 'manager') {
    return false;
  }
  return userAreas.some((ua) => ua.area_id === areaId && ua.role === 'manager');
}

/**
 * Returns null (= all areas in the plant) for Admin and Auditor, or [] for other roles.
 */
export function getAuditedAreaIds(user: User, _userAreas?: UserArea[]): number[] | null {
  if (user.role === 'admin' || user.role === 'auditor') {
    return null; // null means all areas in the factory
  }
  return [];
}

/**
 * Returns null (= all areas) for Admin, assigned area IDs for Area MNG, or [] for Auditor/Viewer.
 */
export function getManagedAreaIds(user: User, userAreas: UserArea[]): number[] | null {
  if (user.role === 'admin') {
    return null; // null means all
  }
  if (user.role !== 'manager') {
    return [];
  }
  return userAreas.filter((ua) => ua.role === 'manager').map((ua) => ua.area_id);
}
