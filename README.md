# Madalyn Robinson Foundation

Public foundation site + custom event registration for **maddysfoundation.org** (domain pending). Built on the Braddcorp stack: Next.js (App Router), Turso, Clerk (staff), Vercel.

## What this is

- Marketing site (home, Maddy’s story, donate, privacy)
- Published events list + detail pages
- Public RSVP registration (adults, no parent accounts)
- Staff admin (`/admin`) to create/edit events and view rosters

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

Without Clerk keys the public site still runs; `/admin` shows setup instructions.

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
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Canonical URL / metadata |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | admin | Clerk |
| `CLERK_SECRET_KEY` | admin | Clerk |
| `ADMIN_DEV_BYPASS` | no | `1` = local/preview staff access without Clerk |
| `NEXT_PUBLIC_DONATE_URL` | no | External donate link (until Stripe Checkout ships) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | no | Shown in footer when set |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Publishable key (`pk_test_` / `pk_live_`) |
| `STRIPE_SECRET_KEY` | Stripe | Secret key — server only |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signing secret (`whsec_`) |

Never commit `.env.local` or tokens.

**Stripe plan (keys + how to get them):** [`docs/STRIPE.md`](docs/STRIPE.md)

## Domain cutover (`maddysfoundation.org`)

When the domain is purchased:

1. Point DNS (Cloudflare preferred) to the Vercel project.
2. Add `maddysfoundation.org` (+ `www`) in Vercel → Domains.
3. Set `NEXT_PUBLIC_SITE_URL=https://maddysfoundation.org` and redeploy.

## Brand assets

- Logo: `public/brand/logo-96.webp` (chrome) · `logo.jpg` / `logo.webp` source
- Maddy photo: responsive WebP (`maddy-640/960.webp` + `maddy.webp`) with JPEG fallback
- Favicon / apple-touch: logo PNGs (`app/icon.png` **512**, `app/apple-icon.png` **180**) — Camp Ruby / playbook 05
- Open Graph: static `app/opengraph-image.jpg` + `twitter-image.jpg` (~70KB, 1200×630) + `opengraph-image.alt.txt`; per-event ImageResponse at `/events/[slug]/opengraph-image`
- Footer: Explore + Site columns, Privacy, optional contact, BraddCorp credit (LECYC pattern)
- Type: Literata (display) + Source Sans 3 (body) — major-third scale; limited weights
- Color: restrained OKLCH system in `app/globals.css` / `DESIGN.md` — sunflower accent, cool fog deep, on-deep text ramp (no raw white alphas)
- A11y polish: skip-to-content on every shell, `#main` landmarks, ≥14px chrome, squared `.field-control` inputs
- Phone chrome: short “Maddy’s” wordmark + disclosure menu under `md`; hero nav sits on a deep top scrim for contrast
- Home hero header: clip-path animates in over the photo; after scrolling past `[data-home-hero]`, a solid sticky bar portals to `document.body` (so hero `contain` can’t trap `fixed` over the image) and slides down
- A11y harden: darker `--accent-ink` on CTAs (≥4.5:1), mobile menu closes on navigate, register Dismiss is ≥44px tall
- Home page: quieter centered countdown (days/hours/minutes, no second tick; ink numerals) between purpose and events — not in site header chrome
- Home sections: verse and events sit on page bg with hairline borders (no accent-soft bands)
- Interior header (`SiteHeaderSolid`): brand + nav only (no countdown widget crowding the bar)

## Site chrome checklist ([braddcorp-reg-kit playbook 05](https://github.com/BadBraddA1/braddcorp-reg-kit/blob/main/playbook/05-site-chrome.md))

- [x] `lib/site-metadata.ts` + `metadataBase`
- [x] Favicon + apple-icon (512 / 180, matching Camp Ruby)
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
- Staff: `/admin` `/admin/events/new` `/admin/events/[id]/registrations`
- API: `POST /api/register` · `POST/PATCH /api/admin/events`
