-- 0008_ui_theme_setting.sql
-- Store default global UI theme ('classic' | 'crystal-glass' | 'crystal-hybrid')
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('ui_theme', 'classic');
