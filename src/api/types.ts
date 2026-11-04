export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'auditor' | 'manager' | 'viewer';
  lang: 'vi' | 'en';
  active: number;
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

export interface UserAreaAssignment {
  area_id: number;
  role: 'auditor' | 'manager';
  area_code?: string;
  area_name?: string;
}

export interface UserWithAreas extends User {
  areas: UserAreaAssignment[];
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
  is_na?: number;
}

export interface Photo {
  id: number;
  finding_id: number;
  kind: 'before' | 'after';
  r2_key: string;
  uploaded_by: number;
  created_at: string;
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
  audit_date?: string;
  month?: string;
  iso_year?: number;
  iso_week?: number;
  area_code?: string;
  area_name?: string;
  item_code?: string;
  s_group?: number;
  location_vi?: string;
  location_en?: string;
  content_vi?: string;
  content_en?: string;
  item_escalating?: number;
  creator_name?: string;
  fixer_name?: string;
  verifier_name?: string;
  photos?: Photo[];
  before_photos?: Photo[];
  after_photos?: Photo[];
  history?: any[];
  days_remaining?: number;
  is_overdue?: boolean;
  handled_in_this_audit?: boolean;
  alarm_type?: string;
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
  sort_order?: number;
  area_active?: number;
}

export interface Audit {
  id: number;
  area_id?: number;
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
  area_code?: string;
  area_name?: string;
  auditor_name?: string;
  area_scores?: AuditAreaScore[];
}

export interface YearlyTarget {
  year: number;
  target: number;
  warning_target?: number;
}

export interface AppSettings {
  company_name: string;
  company_logo: string;
}

export interface HistoricalMonthlyScore {
  year: number;
  month: string;
  area_id: number;
  score: number;
  updated_by?: number | null;
  updated_at?: string;
}
