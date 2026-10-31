-- 0003_plant_wide_weekly_audit.sql
-- Change audits to plant-wide weekly sessions (1 audit per ISO week for the entire factory)
-- and add per-area scores & external audit table (BOD, Customer, IE).

CREATE TABLE IF NOT EXISTS audits_new (
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

INSERT OR IGNORE INTO audits_new (id, auditor_id, audit_date, iso_year, iso_week, week_start, month, status, total_penalty, score, note, submitted_at, created_at)
SELECT id, auditor_id, audit_date, iso_year, iso_week, week_start, month, status, total_penalty, score, note, submitted_at, created_at
FROM audits;

DROP TABLE audits;
ALTER TABLE audits_new RENAME TO audits;

CREATE INDEX idx_audits_month ON audits(month, status);
CREATE INDEX idx_audits_week ON audits(week_start, status);

CREATE TABLE IF NOT EXISTS audit_area_scores (
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
CREATE INDEX IF NOT EXISTS idx_audit_area_scores_audit ON audit_area_scores(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_area_scores_area ON audit_area_scores(area_id);
