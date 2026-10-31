-- 0006_app_settings.sql
-- Store key-value application settings such as company_name and company_logo

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('company_name', 'CRYSTAL'),
  ('company_logo', '');
