-- Public sponsor packages: 10-minute inventory holds + unpaid draft timer.
-- Safe to re-run (idempotent ALTERs / CREATE IF NOT EXISTS).

ALTER TABLE sponsors ADD COLUMN hold_expires_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_sponsors_level_hold
  ON sponsors (level_key, payment_status, hold_expires_at);

CREATE TABLE IF NOT EXISTS sponsor_package_holds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_key TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  hold_expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_package_holds_pkg_expires
  ON sponsor_package_holds (package_key, hold_expires_at);
