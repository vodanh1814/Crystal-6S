-- Crystal 5S Audit - 0006_warning_target.sql
-- Add warning_target column to yearly_targets (default 90% for yellow level)
-- Order of tiers: Red (< warning_target) -> Yellow (warning_target to < target) -> Green (>= target)

ALTER TABLE yearly_targets ADD COLUMN warning_target REAL NOT NULL DEFAULT 90;
UPDATE yearly_targets SET warning_target = 90 WHERE year = 2026;
