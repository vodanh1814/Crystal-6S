export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'auditor' | 'manager' | 'viewer';
  lang: 'vi' | 'en';
  active: number;
  token_version: number;
  created_at: string;
}

export interface Area {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  active: number;
  created_at: string;
}

export interface UserArea {
  user_id: number;
  area_id: number;
  role: 'auditor' | 'manager';
}

export interface ChecklistItem {
  id: number;
  code: string;
  s_group: number;
  location_vi: string;
  location_en: string;
  content_vi: string;
  content_en: string;
  penalty: number;
  escalating: number;
  sort_order: number;
  active: number;
  updated_at: string;
}

export interface AreaItemNA {
  area_id: number;
  item_id: number;
}

export interface YearlyTarget {
  year: number;
  target: number;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface HistoricalMonthlyScore {
  year: number;
  month: string;
  area_id: number;
  score: number;
  updated_by: number | null;
  updated_at: string;
}

export interface Audit {
  id: number;
  auditor_id: number;
  audit_date: string;
  iso_year: number;
  iso_week: number;
  week_start: string;
  month: string;
  status: 'draft' | 'submitted';
  total_penalty: number | null;
  score: number | null;
  note: string;
  submitted_at: string | null;
  created_at: string;
}

export interface AuditAreaScore {
  audit_id: number;
  area_id: number;
  finding_penalty: number;
  bod_count: number;
  customer_count: number;
  ie_count: number;
  external_penalty: number;
  total_penalty: number;
  score: number;
  area_code?: string;
  area_name?: string;
}

export interface Finding {
  id: number;
  audit_id: number;
  area_id: number;
  item_id: number;
  prev_finding_id: number | null;
  repeat_level: number;
  base_penalty: number;
  applied_penalty: number;
  description: string;
  status: 'open' | 'fixed' | 'closed' | 'carried';
  due_date: string;
  fix_note: string;
  fixed_by: number | null;
  fixed_at: string | null;
  reject_note: string;
  verified_by: number | null;
  closed_at: string | null;
  closed_in_audit_id: number | null;
  created_by: number;
  created_at: string;
}

export interface Photo {
  id: number;
  finding_id: number;
  kind: 'before' | 'after';
  r2_key: string;
  uploaded_by: number;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  detail: string;
  created_at: string;
}

export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  JWT_SECRET: string;
  GITHUB_TOKEN?: string;
}

export interface Variables {
  user: User;
  userAreas: UserArea[];
}
