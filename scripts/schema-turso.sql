-- Madalyn Robinson Foundation — Turso / libSQL schema

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  capacity INTEGER,
  is_published INTEGER NOT NULL DEFAULT 0,
  registration_open INTEGER NOT NULL DEFAULT 0,
  open_at TEXT,
  close_at TEXT,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  team_size INTEGER,
  cover_image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_events_published_starts
  ON events (is_published, starts_at);

CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  guests INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed',
  paid INTEGER NOT NULL DEFAULT 0,
  stripe_checkout_session_id TEXT,
  /** Unix seconds — unpaid draft holds capacity until this time (10 min). */
  hold_expires_at INTEGER,
  team_name TEXT NOT NULL DEFAULT '',
  /** Short code for day-of QR / email (e.g. OV-A3K9Q2). Allocated on register. */
  check_in_code TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event
  ON registrations (event_id, status);

CREATE INDEX IF NOT EXISTS idx_registrations_stripe_session
  ON registrations (stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_registrations_hold_expires
  ON registrations (status, hold_expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_check_in_code
  ON registrations (check_in_code);

-- Soft capacity holds while the register form timer is running (before submit).
CREATE TABLE IF NOT EXISTS capacity_holds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  hold_expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_capacity_holds_event_expires
  ON capacity_holds (event_id, hold_expires_at);

-- Denormalized team name for check-in search (parsed from notes / set on register).
-- Applied via ALTER on existing DBs: ALTER TABLE registrations ADD COLUMN team_name TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS event_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  checked_in INTEGER NOT NULL DEFAULT 0,
  checked_in_at TEXT,
  skins INTEGER NOT NULL DEFAULT 0,
  golf_cannon INTEGER NOT NULL DEFAULT 0,
  golf_pro INTEGER NOT NULL DEFAULT 0,
  addon_total_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (registration_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_event_players_event
  ON event_players (event_id);

CREATE INDEX IF NOT EXISTS idx_event_players_registration
  ON event_players (registration_id);

CREATE TABLE IF NOT EXISTS addon_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  addon_key TEXT NOT NULL,
  label TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  UNIQUE (event_id, addon_key)
);

CREATE INDEX IF NOT EXISTS idx_addon_prices_event
  ON addon_prices (event_id);

CREATE TABLE IF NOT EXISTS check_in_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES event_players(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'staff',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_check_in_history_event
  ON check_in_history (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_check_in_history_registration
  ON check_in_history (registration_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs (created_at DESC);
