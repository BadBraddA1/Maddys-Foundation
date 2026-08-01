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

- **Display:** Fraunces (soft serif) — headlines, brand moments
- **Body:** DM Sans — UI, forms, nav
- Display clamp max ≤ 4.5rem; letter-spacing ≥ -0.03em
- `text-wrap: balance` on headings

## Layout

- Full-bleed hero with Maddy photo as the dominant plane
- Content width ~68ch for story prose
- Events as quiet list rows, not card grids
- Admin: utilitarian tables, same tokens, denser spacing

## Motion

- Hero image slow ken-burns-soft scale (subtle)
- Section fades with ease-out-quart
- Respect `prefers-reduced-motion`
