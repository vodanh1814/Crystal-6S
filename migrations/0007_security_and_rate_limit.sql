-- 0007_security_and_rate_limit.sql
-- Track login attempts per (ip + username) to prevent brute-force password guessing

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  locked_until TEXT
);
