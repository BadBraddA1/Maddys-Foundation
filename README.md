# Madalyn Robinson Foundation

Public foundation site + custom event registration for **maddysfoundation.org** (domain pending). Built on the Braddcorp stack: Next.js (App Router), Turso, Clerk (staff), Vercel.

## What this is

- Marketing site (home, Maddy’s story, donate, privacy)
- Published events list + detail pages (Google / Apple Maps links from location)
- Public registration — individual RSVP or team events (e.g. 4-person scramble); **capacity is team-based** when team size is set; opening the register form **reserves a capacity slot** for **10 minutes** (assumes they’ll pay); unpaid / expired holds return to the pool; roster only shows paid teams
- Staff admin (`/admin`) to create/edit events, view rosters, confirm payment, **release unpaid holds**, and **day-of player check-in** (desk + dashboard)

Inspired in tone by Mighty Maddy — original brand, copy, and design.

## Stack

| Piece | Detail |
| --- | --- |
| App | Next.js 16 + Tailwind 4 |
| DB | Turso `maddys-foundation` (group `braddcorp`) |
| Auth | Clerk — staff only (`publicMetadata.role = "admin"`) |
| Host | Vercel project `maddys-foundation` → [maddys-foundation.vercel.app](https://maddys-foundation.vercel.app) |
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

Never commit `.env.local` or tokens.

**Stripe plan (keys + how to get them):** [`docs/STRIPE.md`](docs/STRIPE.md)

## Domain cutover (`maddysfoundation.org`)

When DNS is ready (Cloudflare preferred):

1. Point DNS to the Vercel project `maddys-foundation`.
2. Add `maddysfoundation.org` (+ `www`) in Vercel → Domains.
3. Set `NEXT_PUBLIC_SITE_URL=https://maddysfoundation.org` on Vercel (Production + Preview) — currently temporarily set to `https://maddys-foundation.vercel.app` so OG images work.
4. Redeploy production.
5. Confirm `https://maddysfoundation.org/opengraph-image.jpg` returns 200.

Cursor rule: `.cursor/rules/domain-cutover-cloudflare.mdc` (fires when you ask to set up Cloudflare/DNS).

## Brand assets

- Logo: `public/brand/logo-96.webp` (chrome) · `logo.jpg` / `logo.webp` source
- Maddy photo: responsive WebP (`maddy-640/960.webp` + `maddy.webp`) with JPEG fallback
- Favicon / apple-touch: `app/favicon.ico` (16/32/48 from brand logo), `app/icon.png` **192**, `app/apple-icon.png` **180**
- Open Graph: static `app/opengraph-image.jpg` + `twitter-image.jpg` (~70KB, 1200×630) + `opengraph-image.alt.txt`; per-event ImageResponse at `/events/[slug]/opengraph-image`
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
- Her Story: Maddy’s bio (Herculaneum High, sports, sister Lydia) + day-on-the-green invite; purpose = scholarships (Herculaneum & DeSoto)
- Main event: Oak Valley Golf Scramble 2026-09-25 (shotgun 8:00 AM, Pevely) — 4-person teams, **31 team capacity**, $500/team, pay-before-confirm, contests in description; Maps links on event page; admin “Mark paid / confirm”
- Stripe: Checkout on paid registration + webhook confirms roster; **10-minute hold** then unpaid drafts are released (Stripe session expired + row deleted) and never shown in admin
- Day-of check-in: `/admin/check-in` (search paid teams, per-player check-in/undo, desk add-ons, QR); `/admin/check-in/dashboard` totals + CSV; players synced from roster notes on paid confirm

## Day-of check-in (ops)

1. Staff sign in at `/admin` (password or Clerk).
2. Open **Check-in desk** (or Roster → Day-of check-in).
3. First time / after imports: on the event roster, **Sync players from roster notes**.
4. Search team → Load → check players in as they arrive; **Save add-ons** separately (Skins / Golf Cannon / Golf Pro per player).
5. Print/copy the team QR (`/admin/check-in?team={registrationId}`) — phone must already be staff-logged-in.
6. Dashboard for live totals and CSV export.

Paid registration Mulligans/Skins stay on the registration notes; desk add-ons are separate day-of sales.

## Site chrome checklist ([braddcorp-reg-kit playbook 05](https://github.com/BadBraddA1/braddcorp-reg-kit/blob/main/playbook/05-site-chrome.md))

- [x] `lib/site-metadata.ts` + `metadataBase`
- [x] Favicon + apple-icon (48 / 180)
- [x] Site `opengraph-image.jpg` + `twitter-image.jpg` + alt.txt (static JPEG like LECYC)
- [x] Per-event `opengraph-image` (ImageResponse)
- [x] Custom `not-found` (header/footer + Home/Events)
- [x] `@vercel/analytics`
- [x] `/privacy` + footer link
- [x] `robots.ts` + `sitemap.ts`
- Spot-check after deploy: `/opengraph-image` and a bogus URL for 404

Templates live in the kit: [`templates/site-chrome/`](https://github.com/BadBraddA1/braddcorp-reg-kit/tree/main/templates/site-chrome).

## Useful paths

- Public: `/` `/story` `/events` `/events/[slug]/register` `/donate` `/privacy`
- Staff: `/admin` `/admin/check-in` `/admin/check-in/dashboard` `/admin/events/new` `/admin/events/[id]/registrations`
- API: `POST /api/register` · `POST/PATCH /api/admin/events` · `/api/admin/check-in/*`
