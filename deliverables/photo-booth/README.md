# Madalyn Robinson Foundation — photo booth files

Ready for the booth operator. Brand matches [maddysfoundation.org](https://maddysfoundation.org): fairway green, soft gold, circular logo.

**Event:** 2nd Annual Golf Scramble  
**When:** September 25, 2026 · 8:00 AM shotgun  
**Where:** Oak Valley Golf Course, Pevely, Missouri

Hand the operator the zip, or this folder. They only need `overlays/` and `screens/`. `previews/` is so you can see the frames on a sample photo of Maddy before print day.

## What’s in the box

| File | Size | Use |
| --- | --- | --- |
| `overlays/4x6-landscape-1up.png` | 1800×1200 @ 300 dpi | Standard landscape postcard |
| `overlays/4x6-portrait-1up.png` | 1200×1800 @ 300 dpi | Standard portrait postcard |
| `overlays/4x6-landscape-2up.png` | 1800×1200 @ 300 dpi | Two photos on one 4×6 |
| `overlays/4x6-portrait-3up.png` | 1200×1800 @ 300 dpi | Three photos on one 4×6 |
| `overlays/2x6-strip-3up.png` | 600×1800 @ 300 dpi | Classic 2×6 strip (3 poses) |
| `overlays/2x6-strip-4up.png` | 600×1800 @ 300 dpi | Classic 2×6 strip (4 poses) |
| `overlays/4x6-double-strip-3up.png` | 1200×1800 @ 300 dpi | Two strips on one 4×6 (most printers) |
| `overlays/social-square-1up.png` | 1080×1080 | GIF / 360 / email / SMS share |
| `overlays/story-portrait-1up.png` | 1080×1920 | iPad / story / mirror booth |
| `screens/welcome-1920x1080.jpg` | 1920×1080 | Attract / start screen (TV) |
| `screens/welcome-1080x1920.jpg` | 1080×1920 | Attract / start screen (iPad) |
| `screens/thanks-1920x1080.jpg` | 1920×1080 | “Your photo is printing” |
| `screens/thanks-1080x1920.jpg` | 1080×1920 | “Your photo is printing” (iPad) |
| `coordinates.json` | — | Pixel-accurate photo windows |

Photo windows are **fully transparent**. Do not flatten the PNGs. Gold hairline is the crop-safe edge of each window.

4×6 landscape/portrait files include a QR to https://maddysfoundation.org on the print.

## Load in booth software

**dslrBooth / Sparkbooth / Darkroom / LumaBooth / Breeze**

1. New event → print size 4×6 (or 2×6 for strips).
2. Set overlay / foreground to the matching PNG.
3. Set each camera box to the `x, y, width, height` in `coordinates.json` (top-left origin, pixels).
4. Assign welcome + thanks screens to Attract and Printing states.
5. Test-print one landscape, one strip, and one square share before guests arrive.

If the software asks for a background, use a solid `#1c3d32` plate or leave it empty — the live camera fills the transparent windows.

## Copy on the frames

- Madalyn Robinson Foundation
- 2nd Annual Golf Scramble
- September 25, 2026 · Oak Valley Golf Course
- maddysfoundation.org

To change names or the date, edit `COPY` in `scripts/build-photo-booth-overlays.mjs` and run:

```bash
pnpm photo-booth
```

That regenerates this folder and `Madalyn-Robinson-Foundation-Photo-Booth.zip`.
