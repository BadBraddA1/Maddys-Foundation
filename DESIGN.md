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
| `--accent` | `oklch(0.72 0.14 85)` | Sunflower gold |
| `--accent-ink` | `oklch(0.28 0.06 70)` | Text on accent |
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
Labels: `.label-caps` at 0.08em tracking (not 0.2em+ shout).  
`text-wrap: balance` on headings; `pretty` on paragraphs; `font-optical-sizing: auto`.

## Layout

- Full-bleed hero with Maddy photo as the dominant plane
- Phone-first chrome: short wordmark + disclosure nav under `md`; ≥44px targets; safe-area insets
- Hero header sits on a deep top scrim so nav contrast does not depend on the photo
- Content width ~68ch for story prose
- Events as quiet list rows, not card grids; primary CTAs full-width on small screens
- Admin: utilitarian tables, same tokens, denser spacing

## Motion

- Signature: hero photo soft settle (`hero-drift`) + copy rise with blur clear (`hero-rise`) — never opacity-0 gated
- Stagger capped (~210ms) via `data-enter`; content readable during delay (transform/blur only)
- Feedback: `.motion-press` on primary CTAs; mobile menu `.nav-panel-enter`; registration success settle
- Ease-out-quart throughout; respect `prefers-reduced-motion` (animations off, transforms cleared)
