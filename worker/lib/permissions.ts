import type { User, UserArea } from '../types';

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

export function isViewer(user: User): boolean {
  return user.role === 'viewer';
}

export function canAuditArea(user: User, userAreas: UserArea[], areaId: number): boolean {
  if (user.role === 'admin') {
    return true;
  }
  if (user.role !== 'auditor') {
    return false;
  }
  return userAreas.some((ua) => ua.area_id === areaId && ua.role === 'auditor');
}

export function canManageArea(user: User, userAreas: UserArea[], areaId: number): boolean {
  if (user.role === 'admin') {
    return true;
  }
  if (user.role !== 'manager') {
    return false;
  }
  return userAreas.some((ua) => ua.area_id === areaId && ua.role === 'manager');
}

export function getAuditedAreaIds(user: User, userAreas: UserArea[]): number[] | null {
  if (user.role === 'admin') {
    return null; // null means all
  }
  if (user.role !== 'auditor') {
    return [];
  }
  return userAreas.filter((ua) => ua.role === 'auditor').map((ua) => ua.area_id);
}

export function getManagedAreaIds(user: User, userAreas: UserArea[]): number[] | null {
  if (user.role === 'admin') {
    return null; // null means all
  }
  if (user.role !== 'manager') {
    return [];
  }
  return userAreas.filter((ua) => ua.role === 'manager').map((ua) => ua.area_id);
}
