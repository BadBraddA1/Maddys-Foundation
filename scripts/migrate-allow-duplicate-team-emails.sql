-- Allow multiple team registrations with the same captain email per event.
-- SQLite cannot DROP a table UNIQUE constraint in place — rebuild the table.

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS registrations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  guests INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed',
  paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  stripe_checkout_session_id TEXT,
  hold_expires_at INTEGER,
  team_name TEXT NOT NULL DEFAULT '',
  check_in_code TEXT,
  confirmation_email_sent_at TEXT,
  reminder_email_sent_at TEXT
);

INSERT INTO registrations_new (
  id, event_id, name, email, phone, guests, notes, status, paid, created_at,
  stripe_checkout_session_id, hold_expires_at, team_name, check_in_code,
  confirmation_email_sent_at, reminder_email_sent_at
)
SELECT
  id, event_id, name, email, phone, guests, notes, status, paid, created_at,
  stripe_checkout_session_id, hold_expires_at, team_name, check_in_code,
  confirmation_email_sent_at, reminder_email_sent_at
FROM registrations;

DROP TABLE registrations;
ALTER TABLE registrations_new RENAME TO registrations;

CREATE INDEX IF NOT EXISTS idx_registrations_event
  ON registrations (event_id, status);

CREATE INDEX IF NOT EXISTS idx_registrations_stripe_session
  ON registrations (stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_registrations_hold_expires
  ON registrations (status, hold_expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_check_in_code
  ON registrations (check_in_code);

CREATE INDEX IF NOT EXISTS idx_registrations_event_email
  ON registrations (event_id, email);

PRAGMA foreign_keys=ON;
