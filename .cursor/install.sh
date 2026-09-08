#!/usr/bin/env bash
# Cloud Agent install: prepare a self-contained local dev environment.
# No external services required — runs keyless (no Clerk) against a local
# libSQL/SQLite file DB, with the admin dev bypass enabled. Idempotent.
set -euo pipefail

corepack enable >/dev/null 2>&1 || true

# 1. Install dependencies exactly as pinned by pnpm-lock.yaml.
pnpm install --frozen-lockfile

# 2. Local dev env file. Only created when missing so real secrets (e.g. Turso
#    or Clerk keys added later) are never overwritten.
if [ ! -f .env.local ]; then
  cat > .env.local <<'EOF'
# Local Cloud Agent dev environment (no external services required).
# Uses a local libSQL/SQLite file DB and the keyless admin dev bypass.
TURSO_DATABASE_URL=file:./data/local.db
TURSO_AUTH_TOKEN=

NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DONATE_URL=https://venmo.com/u/MadalynRobinsonFoundation
NEXT_PUBLIC_CONTACT_EMAIL=

# Clerk is intentionally left blank so the app runs keyless.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in

# Local/preview staff access without Clerk (ignored on Vercel Production).
ADMIN_DEV_BYPASS=1
ADMIN_STAFF_PASSWORD=Braddcorp
ADMIN_STAFF_SECRET=

# Stripe / R2 / email / wallet keys are optional and left blank for local dev.
EOF
  echo "Created .env.local for local dev"
fi

# 3. Apply the libSQL schema and seed one published event (idempotent).
node scripts/dev-setup.mjs

# 4. Seed day-of check-in test teams so the admin desk has data (idempotent).
node scripts/seed-check-in.mjs
