# Madalyn Robinson Foundation

Public foundation site + custom event registration for **maddysfoundation.org** (domain pending). Built on the Braddcorp stack: Next.js (App Router), Turso, Clerk (staff), Vercel.

## What this is

- Marketing site (home, Maddy’s story, donate, privacy, **gallery**)
- Published events list + detail pages (Google / Apple Maps links from location)
- Public registration — individual RSVP or team events (e.g. 4-person scramble); **capacity is team-based** when team size is set; opening the register form **reserves a capacity slot** for **10 minutes** (assumes they’ll pay); unpaid / expired holds return to the pool; roster only shows paid teams
- Staff admin (`/admin`) to create/edit/delete events, **add/edit/delete roster registrations** (and team player lists), confirm payment, **release unpaid holds**, **day-of player check-in**, **sponsors** (footer marquee), and **gallery** photos
- Footer sponsor logo strip (scrolling) fed from Turso + R2; lives in the root layout (won’t remount on nav); rAF wall-clock position; duplicates logos until the track fills the viewport

Inspired in tone by Mighty Maddy — original brand, copy, and design.

## Stack

| Piece | Detail |
| --- | --- |
| App | Next.js 16 + Tailwind 4 |
| DB | Turso `maddys-foundation` (group `braddcorp`) |
| Auth | Clerk — staff only (`publicMetadata.role = "admin"`) |
| Host | Vercel project `maddys-foundation` → [maddys-foundation.vercel.app](https://maddys-foundation.vercel.app) |
| Media | Cloudflare R2 bucket `maddys-foundation-media` + Worker `maddys-foundation-media` |
| Repo | [`BadBraddA1/Maddys-Foundation`](https://github.com/BadBraddA1/Maddys-Foundation) |
| Turso | `maddys-foundation` in group `braddcorp` |

## Local setup

```bash
cd ~/maddys-foundation
pnpm install
cp .env.example .env.local
# fill TURSO_* from: turso db show maddys-foundation --url
#                  turso db tokens create maddys-foundation
# add Clerk keys when ready
pnpm dev
```

Apply / re-apply schema:

```bash
turso db shell maddys-foundation < scripts/schema-turso.sql
```

## Clerk (staff admin)

1. Create a Clerk application for this site.
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local` and Vercel.
3. In Clerk Dashboard → Users → your user → Metadata → Public: `{ "role": "admin" }`.
4. Sign in at `/sign-in`, then open `/admin`.

Without Clerk keys the public site still runs; use the staff password on `/admin`.

### Staff password (temporary)

Until Clerk is live on the real domain, `/admin` accepts a shared password:

1. Set `ADMIN_STAFF_PASSWORD` (default in code is `Braddcorp` if unset — set it explicitly on Vercel).
2. Open `/admin`, enter the password.
3. Optional: `ADMIN_STAFF_SECRET` for cookie signing (otherwise uses the password / Stripe secret).

Remove or rotate the password once Clerk admins are wired.

### Local admin without Clerk

For testing events/rosters before Clerk is wired:

1. In `.env.local` set `ADMIN_DEV_BYPASS=1`
2. Restart `pnpm dev`
3. Open [http://localhost:3000/admin](http://localhost:3000/admin)

A yellow banner shows when bypass is active. It only works in **development** or **Vercel Preview** — never on Vercel Production, even if the env var is set.

## Environment

| Var | Required | Purpose |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | yes | libSQL URL |
| `TURSO_AUTH_TOKEN` | yes | Turso token |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Canonical URL / metadata (use Vercel URL until `maddysfoundation.org` DNS is live — OG images 404 on the parked domain) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | admin | Clerk |
| `CLERK_SECRET_KEY` | admin | Clerk |
| `ADMIN_DEV_BYPASS` | no | `1` = local/preview staff access without Clerk |
| `ADMIN_STAFF_PASSWORD` | no | Shared `/admin` password (temp; default `Braddcorp` if unset) |
| `ADMIN_STAFF_SECRET` | no | Cookie signing secret for staff password sessions |
| `NEXT_PUBLIC_DONATE_URL` | no | External donate link (default: Venmo `@MadalynRobinsonFoundation`) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | no | Shown in footer when set |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Publishable key (`pk_test_` / `pk_live_`) |
| `STRIPE_SECRET_KEY` | Stripe | Secret key — server only |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signing secret (`whsec_`) |
| `R2_PUBLIC_URL` | media | Public r2.dev base for logos/photos |
| `R2_UPLOAD_WORKER_URL` | media | Worker that accepts staff uploads |
| `R2_UPLOAD_SECRET` | media | Shared secret header for the upload Worker |
| `R2_ACCOUNT_ID` / `R2_BUCKET_NAME` | media | Account + bucket name (docs / optional S3) |
| `RESEND_API_KEY` | email | Resend API key for registration mail |
| `EMAIL_FROM` | email | From header (Resend test domain or verified domain) |
| `CRON_SECRET` | cron | Bearer secret for `/api/cron/*` (reminders + optional holds) |

Never commit `.env.local` or tokens.

### Sponsors + gallery (R2)

1. Bucket: `maddys-foundation-media` (public r2.dev URL in `R2_PUBLIC_URL`).
2. Worker: `npx wrangler deploy` from repo root (uses `wrangler.toml` + `worker/media-upload.ts`); set secret with `npx wrangler secret put UPLOAD_SECRET`.
3. Staff: `/admin/sponsors` (name + logo → footer marquee) and `/admin/gallery` (photos → `/gallery`).
4. Tables: `sponsors`, `gallery_images` in Turso (see `scripts/schema-turso.sql`).

**Stripe plan (keys + how to get them):** [`docs/STRIPE.md`](docs/STRIPE.md)

## Domain cutover (`maddysfoundation.org`)

When DNS is ready (Cloudflare preferred):

1. Point DNS to the Vercel project `maddys-foundation`.
2. Add `maddysfoundation.org` (+ `www`) in Vercel → Domains.
3. Set `NEXT_PUBLIC_SITE_URL=https://maddysfoundation.org` on Vercel (Production + Preview) — currently temporarily set to `https://maddys-foundation.vercel.app` so OG images work.
4. Redeploy production.
5. Confirm `https://maddysfoundation.org/opengraph-image` returns 200.

Cursor rule: `.cursor/rules/domain-cutover-cloudflare.mdc` (fires when you ask to set up Cloudflare/DNS).

## Brand assets

- Logo: `public/brand/logo-96.webp` (chrome) · `logo.jpg` / `logo.webp` source
- Maddy photo: responsive WebP (`maddy-640/960.webp` + `maddy.webp`) with JPEG fallback
- Favicon / apple-touch: `app/favicon.ico` (16/32/48 from brand logo), `app/icon.png` **192**, `app/apple-icon.png` **180**
- Open Graph: fairway-green plate (`#1c3d32`) with a full-head Maddy cutout on the right (source JPEG clips her crown, so `maddy-og-fullhead.png` restores it); no rectangular “photo box” / double green — rebuild with `node scripts/rebuild-og-cutout.mjs`; logo/name on the left; event covers use photo + tent
- Footer: Explore + Site columns, Privacy, optional contact, BraddCorp credit (LECYC pattern)
- Type: Literata (display 400/600) + Source Sans 3 (body 400/500) — major-third scale
- Performance: public home/events ISR (60s; register 30s); admin/register writes call `revalidatePublicEvents`; hero WebP preloaded; logo not priority; `/brand/*` long-cache
- Color: restrained OKLCH system in `app/globals.css` / `DESIGN.md` — sunflower accent, cool fog deep, on-deep text ramp (no raw white alphas)
- A11y polish: skip-to-content on every shell, `#main` landmarks, ≥14px chrome, squared `.field-control` inputs
- Phone chrome: short “Maddy’s” wordmark + disclosure menu under `md`; hero nav sits on a deep top scrim for contrast
- Home hero header: one fixed bar (scrim → solid after scroll); no portal / duplicate nav
- A11y harden: darker `--accent-ink` on CTAs (≥4.5:1), mobile menu closes on navigate, register Dismiss is ≥44px tall
- Adapt: story photo first on phones; admin roster cards on small screens; 16px form fields; past-event links ≥44px; landscape hero breathing room
- Home page: quieter centered countdown (one link; days/hours/minutes) between purpose and events
- Polish: nav noun “Her Story” everywhere; Register vs Details CTA hierarchy; dead countdown layouts removed; spacing on purpose scale; selection on deep uses accent
- Harden: home `<main>` wraps hero; skip lands on `#hero-copy`; admin form labels + hints; mobile `aria-expanded`; admin skip link
- Distill: purpose keeps Give only; dropped duplicate hero preload tags; logo via CSS (no LCP competition)
- Interior header (`SiteHeaderSolid`): brand + nav only (no countdown widget crowding the bar)
- Event dates format in `America/Chicago`
- Her Story: Maddy’s bio (Herculaneum High, sports, sister Lydia) + day-on-the-green invite; purpose = scholarships for graduating seniors (Herculaneum & DeSoto) + Board-approved community service
- Main event: Oak Valley Golf Scramble 2026-09-25 (shotgun 8:00 AM, Pevely) — 4-person teams, **31 team capacity**, $500/team, pay-before-confirm, contests in description; Maps links on event page; admin “Mark paid / confirm”
- Stripe: Checkout on paid registration + webhook confirms roster; **10-minute hold** then unpaid drafts are released (Stripe session expired + row deleted) and never shown in admin
- Day-of check-in: `/admin/check-in` (search paid teams, per-player check-in/undo, desk add-ons, QR); **player QR auto check-in**; `/admin/check-in/dashboard` totals + CSV; players synced from roster notes on paid confirm
- Registration email: confirmation on paid confirm (Stripe webhook + admin Mark paid) via Resend; team ticket `/ticket/[code]` (captain enters teammate emails → personal `/ticket/p/[code]` QRs); daily cron (`vercel.json` 14:00 UTC) sends a 7-day teammate reminder; roster/check-in can **Resend confirmation**
- Admin events: create / edit / **delete** + optional cover image URL for event OG cards
- Admin roster: **Add registration**, **Edit roster** (captain + player names/emails), **Delete registration** on `/admin/events/[id]/registrations`
- Sponsors: `/admin/sponsors` uploads logos to R2 + staff-only contact (name/email/phone/notes) for later outreach; published logos scroll in the footer (contacts never public)
- Gallery: `/admin/gallery` uploads photos to R2 (optional **event tag**); public `/gallery` filters by event (`?event=slug`)
- Site palette: fairway green hero/footer + soft gold accent (warm off-white page)

## Day-of check-in (ops)

1. Staff sign in at `/admin` (password or Clerk).
2. Open **Check-in desk** (or Roster → Day-of check-in).
3. First time / after imports: on the event roster, **Sync players from roster notes** (also allocates per-player codes `OV-P-……`).
4. **Scan QR** on iPhone (Safari, staff already logged in):
   - **Player QR** (`/ticket/p/OV-P-……`) → checks that person in automatically, then opens the team for add-ons / undo.
   - **Team QR** (`/ticket/OV-……`) → loads the roster only (no bulk auto check-in).
   - Or type a code / search by team name → Load → tap check-in; **Save add-ons** separately (Skins / Golf Cannon / Golf Pro per player).
5. Each registration gets a team `check_in_code`; each `event_players` row gets its own `check_in_code`. Captains use `/ticket/CODE` to email personal tickets.
6. Dashboard for live totals and CSV export.
7. Local test data: `pnpm db:seed-checkin` seeds 5 paid Oak Valley teams (`*@checkin-seed.test`) with codes, players, mixed desk add-ons, and a few already checked in. Mailer skips `*.test` addresses.
8. Schema note: existing Turso DBs need `event_players.email`, `check_in_code`, `ticket_email_sent_at` (applied automatically on sync, or via comments in `scripts/schema-turso.sql`).

Paid registration Mulligans/Skins stay on the registration notes; desk add-ons are separate day-of sales.

## Apple Wallet (ops)

Lets captains/players tap **Add to Apple Wallet** on `/ticket/…` and `/ticket/p/…`. On event day, iPhone can surface the pass on the lock screen near the golf course (GPS + event time).

### One-time Apple Developer setup

1. In [Apple Developer](https://developer.apple.com/account) → **Identifiers** → **+** → **Pass Type IDs** → e.g. `pass.org.maddysfoundation.ticket`.
2. **Certificates** → **+** → **Pass Type ID Certificate** → select that ID → create CSR on a Mac (Keychain Access → Certificate Assistant → Request from CA) → download the `.cer`.
3. In Keychain, export the Pass certificate + private key as a `.p12` (set a password).
4. Convert to PEM (on a Mac with the `.p12`):

```bash
# Signer cert + key from the p12
openssl pkcs12 -in Certificates.p12 -clcerts -nokeys -out signerCert.pem -passin pass:YOUR_P12_PASSWORD
openssl pkcs12 -in Certificates.p12 -nocerts -nodes -out signerKey.pem -passin pass:YOUR_P12_PASSWORD
# Apple WWDR (G4) — download from Apple PKI if needed
curl -L -o AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem
```

5. Put on Vercel / `.env.local` (PEM can be pasted with `\n`, or base64 of the whole PEM file):

| Var | Value |
| --- | --- |
| `APPLE_WALLET_PASS_TYPE_ID` | e.g. `pass.org.maddysfoundation.ticket` |
| `APPLE_WALLET_TEAM_ID` | 10-character Team ID from Apple Developer membership |
| `APPLE_WALLET_WWDR` | contents of `wwdr.pem` |
| `APPLE_WALLET_SIGNER_CERT` | contents of `signerCert.pem` |
| `APPLE_WALLET_SIGNER_KEY` | contents of `signerKey.pem` |
| `APPLE_WALLET_SIGNER_KEY_PASSPHRASE` | only if the key is encrypted |

6. Redeploy. Open a ticket page on iPhone → **Add to Apple Wallet**.
7. Optional: set **Venue latitude / longitude** on the event (admin) for the course pin. Blank → Oak Valley Pevely `38.292404, -90.391714`.

Without these env vars the button shows a “not configured yet” note and `/ticket/…/wallet` returns 503.

## Registration email (ops)

1. Create a Resend API key; set `RESEND_API_KEY` + `EMAIL_FROM` on Vercel (Production). Until the custom domain is verified, use Resend’s onboarding from-address.
2. Set `CRON_SECRET` and ensure Vercel Cron can hit `/api/cron/registration-reminders` (Authorization: Bearer).
3. After a paid registration, captains get a confirmation with the **team ticket** link. On `/ticket/CODE` they enter each teammate’s email → **Save & send tickets** → each player gets `/ticket/p/CODE` with a personal QR.
4. ~7 days before the event (America/Chicago), captains get a “share with teammates” reminder.
5. Staff can resend the captain confirmation from the event roster or check-in team page. Captains can resend player tickets with the “Resend even if already sent” checkbox.

## Site chrome checklist ([braddcorp-reg-kit playbook 05](https://github.com/BadBraddA1/braddcorp-reg-kit/blob/main/playbook/05-site-chrome.md))

- [x] `lib/site-metadata.ts` + `metadataBase`
- [x] Favicon + apple-icon (48 / 180)
- [x] Site `opengraph-image` + `twitter-image` (name-forward ImageResponse) + alt.txt
- [x] Per-event `opengraph-image` (ImageResponse)
- [x] Custom `not-found` (header/footer + Home/Events)
- [x] `@vercel/analytics`
- [x] `/privacy` + footer link
- [x] `robots.ts` + `sitemap.ts`
- Spot-check after deploy: `/opengraph-image` and a bogus URL for 404

Templates live in the kit: [`templates/site-chrome/`](https://github.com/BadBraddA1/braddcorp-reg-kit/tree/main/templates/site-chrome).

## Useful paths

- Apple Wallet: team/player tickets offer **Add to Apple Wallet** (`.pkpass`) when Pass Type ID certs are configured; QR on the pass matches desk scan URLs; location relevance defaults to Oak Valley Pevely (override per event with venue lat/lng)
- Public: `/` `/story` `/events` `/events/[slug]/register` `/ticket/[code]` `/ticket/[code]/wallet` `/ticket/p/[code]` `/ticket/p/[code]/wallet` `/gallery` `/donate` `/privacy`
- Staff: `/admin` `/admin/sponsors` `/admin/gallery` `/admin/check-in` `/admin/check-in/dashboard` `/admin/events/new` `/admin/events/[id]` `/admin/events/[id]/registrations` `/admin/events/[id]/registrations/new` `/admin/events/[id]/registrations/[registrationId]`
- API: `POST /api/register` · `POST/PATCH/DELETE /api/admin/events` · `POST /api/admin/check-in/scan` · `POST /api/ticket/[code]/players` · `/api/admin/check-in/*` · `/api/admin/sponsors` · `/api/admin/gallery` · `/api/cron/registration-reminders`
