-- Crystal 5S Audit - schema
-- Penalty unit: "điểm" (1 điểm = 1% of the weekly score). Score = max(0, 100 - sum(applied_penalty)).

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'auditor' CHECK (role IN ('admin', 'auditor', 'manager', 'viewer', 'user')),
  lang TEXT NOT NULL DEFAULT 'vi' CHECK (lang IN ('vi', 'en')),
  active INTEGER NOT NULL DEFAULT 1,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-area permission: a user can be auditor of some areas and manager (Area MNG) of others.
CREATE TABLE user_areas (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('auditor', 'manager')),
  PRIMARY KEY (user_id, area_id, role)
);
CREATE INDEX idx_user_areas_area ON user_areas(area_id);

CREATE TABLE checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  s_group INTEGER NOT NULL CHECK (s_group BETWEEN 1 AND 5),
  location_vi TEXT NOT NULL DEFAULT '',
  location_en TEXT NOT NULL DEFAULT '',
  content_vi TEXT NOT NULL,
  content_en TEXT NOT NULL DEFAULT '',
  penalty REAL NOT NULL CHECK (penalty >= 0),
  escalating INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Criteria that are Not Applicable for an area.
CREATE TABLE area_item_na (
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  PRIMARY KEY (area_id, item_id)
);

CREATE TABLE yearly_targets (
  year INTEGER PRIMARY KEY,
  target REAL NOT NULL CHECK (target BETWEEN 0 AND 100),
  warning_target REAL NOT NULL DEFAULT 90 CHECK (warning_target BETWEEN 0 AND 100)
);

CREATE TABLE audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auditor_id INTEGER NOT NULL REFERENCES users(id),
  audit_date TEXT NOT NULL,          -- YYYY-MM-DD
  iso_year INTEGER NOT NULL,
  iso_week INTEGER NOT NULL,
  week_start TEXT NOT NULL,          -- Monday, YYYY-MM-DD
  month TEXT NOT NULL,               -- YYYY-MM of week_start
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  total_penalty REAL,
  score REAL,
  note TEXT NOT NULL DEFAULT '',
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (iso_year, iso_week)
);
CREATE INDEX idx_audits_month ON audits(month, status);
CREATE INDEX idx_audits_week ON audits(week_start, status);

CREATE TABLE audit_area_scores (
  audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  finding_penalty REAL NOT NULL DEFAULT 0,
  bod_count INTEGER NOT NULL DEFAULT 0,
  customer_count INTEGER NOT NULL DEFAULT 0,
  ie_count INTEGER NOT NULL DEFAULT 0,
  external_penalty REAL NOT NULL DEFAULT 0,
  total_penalty REAL NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 100,
  PRIMARY KEY (audit_id, area_id)
);
CREATE INDEX idx_audit_area_scores_audit ON audit_area_scores(audit_id);
CREATE INDEX idx_audit_area_scores_area ON audit_area_scores(area_id);

CREATE TABLE findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  area_id INTEGER NOT NULL REFERENCES areas(id),
  item_id INTEGER NOT NULL REFERENCES checklist_items(id),
  prev_finding_id INTEGER REFERENCES findings(id),   -- finding of a previous week that was "not improved"
  repeat_level INTEGER NOT NULL DEFAULT 1,
  base_penalty REAL NOT NULL,
  applied_penalty REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- open: waiting Area MNG | fixed: improvement uploaded, waiting auditor
  -- closed: verified | carried: not improved, continued in a later week's finding
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fixed', 'closed', 'carried')),
  due_date TEXT NOT NULL,
  fix_note TEXT NOT NULL DEFAULT '',
  fixed_by INTEGER REFERENCES users(id),
  fixed_at TEXT,
  reject_note TEXT NOT NULL DEFAULT '',
  verified_by INTEGER REFERENCES users(id),
  closed_at TEXT,
  closed_in_audit_id INTEGER REFERENCES audits(id),  -- audit in which the carry-over decision was made
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_findings_audit ON findings(audit_id);
CREATE INDEX idx_findings_area_status ON findings(area_id, status);

CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('before', 'after')),
  r2_key TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_photos_finding ON photos(finding_id);

CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS historical_monthly_scores (
  year INTEGER NOT NULL,
  month TEXT NOT NULL,         -- '01'..'12'
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  score REAL NOT NULL CHECK (score BETWEEN 0 AND 100),
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (year, month, area_id)
);
CREATE INDEX IF NOT EXISTS idx_historical_scores_year_month ON historical_monthly_scores(year, month);

INSERT INTO yearly_targets (year, target, warning_target) VALUES (2026, 95, 90);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('company_name', 'CRYSTAL'),
  ('company_logo', '');

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  locked_until TEXT
);
