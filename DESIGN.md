# Design — Madalyn Robinson Foundation

## Visual theme

Fairway green chrome with soft gold warmth: hero/footer in golf-course green, page neutrals as warm off-white, a single soft-gold accent. Light memorial voice without gloom. **Restrained** color strategy — neutrals do the work; accent ≤10%.

## Color strategy: Restrained

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Page | `--bg` | `oklch(0.975 0.01 95)` | Body — warm off-white |
| Surface | `--surface` | `oklch(0.99 0.006 95)` | Panels / solid header |
| Ink / muted / line | `--ink` `--muted` `--line` | hue ~85–100 | Text & rules |
| Accent | `--accent` | `oklch(0.72 0.12 80)` | Soft gold CTAs, focus, selection |
| Accent ink | `--accent-ink` | `oklch(0.28 0.05 70)` | Text on accent (≥4.5:1) |
| Accent soft | `--accent-soft` | `oklch(0.94 0.04 88)` | Quiet section wash |
| Deep (fairway) | `--deep` `--deep-mid` | hue ~148–150 | Footer + solid site header — golf green |
| Hero veil | `--hero-veil` | hue ~250 | Cool fog over the home photo (header scrim / bottom wash) while scrolling the hero |
| On-deep ramp | `--on-deep` … `--on-deep-faint` | warm off-white | Text/borders on deep & hero veil |
| Danger / success | `--danger` `--success` (+ soft) | semantic | Errors & registration success |

On soft-tinted panels (success/danger), secondary copy uses `text-ink/75` — not gray `muted` on a colored wash.

## Typography

Voice words: warm · hopeful · steadfast. Physical object: a lakeside memorial program — literary, clear, not magazine-editorial.

| Role | Family | Notes |
| --- | --- | --- |
| Display | **Literata** | Headlines, brand moments — literary warmth; not Fraunces |
| Body / UI | **Source Sans 3** | Nav, forms, prose — humanist clarity; not DM Sans |

Scale: major third (1.25) via `--text-xs` … `--text-display`.  
Display: `clamp` max ≤ 4.25rem; letter-spacing ≥ -0.025em on H1.  
Body measure: `--measure` 65ch (`.prose-measure`).  
On-dark: `.on-dark` bumps leading + tracking.  
Labels: `.label-caps` reserved for rare chrome only — **no section kickers**.  
UI chrome: ≥ `text-sm` (14px) on mobile; `font-medium` for CTAs/links (not semibold shout).  
CTAs & fields: squared (`.field-control`); no pills.

## Layout

- Full-bleed hero with Maddy photo as the dominant plane
- Phone-first chrome: short wordmark + disclosure nav under `md`; ≥44px targets; safe-area insets
- Hero header: one fixed bar (scrim on photo → solid `--surface` after scroll); no portal / duplicate nav
- Short landscape: `.hero-stage` drops full-svh so copy isn’t trapped
- Story: photo leads on small screens (`order-first`), copy first from `lg`
- Admin rosters: card list under `md`, table from `md` up
- Form fields: `1rem` text to avoid iOS input zoom
- Coarse pointers: slightly roomier `.motion-press` padding
- Skip link → `#main` on every shell; home skips to `#hero-copy` (H1 + CTAs) inside `<main>`
- Content width ~68ch for story prose
- Events as quiet list rows, not card grids; primary CTAs full-width on small screens
- Admin: utilitarian tables, same tokens, denser spacing; event form fields use `htmlFor` + hints (no low-contrast placeholders)
- Z-index: `--z-dropdown` / `--z-sticky` / `--z-skip`
- LCP: hero WebP via `<picture>` + `fetchPriority="high"`; logo `fetchPriority="low"` (no duplicate preload links); Source Sans 400/500; public ISR 60s / register 30s + `revalidatePublicEvents`; `/brand/*` immutable; favicon 48px

## Resilience

- Public registration: client + server validation, timeouts, capacity re-check, 409 duplicate email
- Events list distinguishes empty vs load failure
- Long titles wrap (`break-words` / `overflow-wrap`); form fields have max lengths
- Errors use `--danger` token; live regions on success
- Admin event create/edit mirrors public form labeling; mobile nav exposes `aria-expanded`
- Staff admin shell includes skip-to-content
- Distill: purpose section keeps one CTA (Give); countdown is a single link; hero chrome is one tree
- Polish: CSS brand mark (no logo image preload); stable header padding; event dates in America/Chicago

## Motion

- Signature: soft photo settle + short rise (≤0.45s) — transform only, no blur flourishes
- Stagger capped (~100ms); feedback via `.motion-press` on primary actions
- No decorative glass, shadows, or scroll-section fades
- Ease-out-quart; `prefers-reduced-motion` disables named motion classes (not a blanket `*` kill of all transitions)
- Mobile nav disclosure closes on route change / link click
- Primary CTA text (`--accent-ink` on `--accent`) meets WCAG AA ≥4.5:1
- Home countdown: featured days/hours/minutes only (no ticking seconds); one linked block
- Polish: “Her Story” naming aligned; closed-registration events use outline Details CTA (accent reserved for Register); deep-plane text selection uses accent
- Events list / story / donate empty paths share the same secondary-link cadence
