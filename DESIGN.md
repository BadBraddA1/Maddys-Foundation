# Design — Madalyn Robinson Foundation

## Visual theme

Soft coastal fog and sunflower warmth: misty neutrals from Maddy’s photo, ink from the circular logo line-art, a single golden-sunflower accent. Light, airy, memorial without gloom. Committed accent on CTAs and key marks; body stays clear off-white tinted toward cool fog (not cream paper).

## Color (OKLCH)

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `oklch(0.97 0.008 240)` | Page background |
| `--surface` | `oklch(0.99 0.004 240)` | Elevated panels |
| `--ink` | `oklch(0.22 0.02 250)` | Primary text |
| `--muted` | `oklch(0.45 0.02 250)` | Secondary text |
| `--line` | `oklch(0.88 0.01 240)` | Hairlines |
| `--accent` | `oklch(0.68 0.10 85)` | Sunflower gold (restrained) |
| `--accent-ink` | `oklch(0.30 0.05 70)` | Text on accent |
| `--deep` | `oklch(0.28 0.04 250)` | Hero overlays / footer |

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
CTAs: squared, `font-medium` (not pill / semibold shout). Accent ≤10% of surface.

## Layout

- Full-bleed hero with Maddy photo as the dominant plane
- Phone-first chrome: short wordmark + disclosure nav under `md`; ≥44px targets; safe-area insets
- Hero header sits on a deep top scrim so nav contrast does not depend on the photo
- Content width ~68ch for story prose
- Events as quiet list rows, not card grids; primary CTAs full-width on small screens
- Admin: utilitarian tables, same tokens, denser spacing

## Resilience

- Public registration: client + server validation, timeouts, capacity re-check, 409 duplicate email
- Events list distinguishes empty vs load failure
- Long titles wrap (`break-words` / `overflow-wrap`); form fields have max lengths
- Errors use `--danger` token; live regions on success

## Motion

- Signature: soft photo settle + short rise (≤0.55s, light blur) — never opacity-0 gated
- Stagger capped (~120ms); feedback via `.motion-press` only
- No decorative glass, shadows, or scroll-section fades
- Ease-out-quart; `prefers-reduced-motion` clears animation
