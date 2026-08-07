-- Sponsor payments (Stripe pay links + levels). Safe to re-run.
-- Existing published sponsors stay published with payment_status = waived.

ALTER TABLE sponsors ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sponsors ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'waived';
ALTER TABLE sponsors ADD COLUMN level_key TEXT NOT NULL DEFAULT '';
ALTER TABLE sponsors ADD COLUMN level_label TEXT NOT NULL DEFAULT '';
ALTER TABLE sponsors ADD COLUMN pay_token TEXT;
ALTER TABLE sponsors ADD COLUMN stripe_checkout_session_id TEXT;
ALTER TABLE sponsors ADD COLUMN paid_at TEXT;
ALTER TABLE sponsors ADD COLUMN source TEXT NOT NULL DEFAULT 'admin';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsors_pay_token
  ON sponsors (pay_token)
  WHERE pay_token IS NOT NULL AND pay_token != '';

CREATE INDEX IF NOT EXISTS idx_sponsors_payment_status
  ON sponsors (payment_status, is_published);
