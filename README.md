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

## Environment

| Var | Required | Purpose |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | yes | libSQL URL |
| `TURSO_AUTH_TOKEN` | yes | Turso token |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Canonical URL / metadata |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | admin | Clerk |
| `CLERK_SECRET_KEY` | admin | Clerk |
| `NEXT_PUBLIC_DONATE_URL` | no | External donate link |

Never commit `.env.local` or tokens.

## Domain cutover (`maddysfoundation.org`)

When the domain is purchased:

1. Point DNS (Cloudflare preferred) to the Vercel project.
2. Add `maddysfoundation.org` (+ `www`) in Vercel → Domains.
3. Set `NEXT_PUBLIC_SITE_URL=https://maddysfoundation.org` and redeploy.

## Brand assets

- Logo: `public/brand/logo-96.webp` (chrome) · `logo.jpg` / `logo.webp` source
- Maddy photo: responsive WebP (`maddy-640/960.webp` + `maddy.webp`) with JPEG fallback
- Favicon / apple-touch: real PNG (`app/icon.png`, `app/apple-icon.png`)
- Type: Literata (display) + Source Sans 3 (body) — major-third scale; limited weights
- Color: restrained OKLCH system in `app/globals.css` / `DESIGN.md` — sunflower accent, cool fog deep, on-deep text ramp (no raw white alphas)
- Phone chrome: short “Maddy’s” wordmark + disclosure menu under `md`; hero nav sits on a deep top scrim for contrast

## Useful paths

- Public: `/` `/story` `/events` `/events/[slug]/register` `/donate` `/privacy`
- Staff: `/admin` `/admin/events/new` `/admin/events/[id]/registrations`
- API: `POST /api/register` · `POST/PATCH /api/admin/events`
