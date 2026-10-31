-- 0005_historical_scores.sql
-- Store historical monthly scores imported from Excel (e.g. from beginning of the year)

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
