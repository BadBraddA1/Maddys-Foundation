/**
 * Build print-ready photo booth overlays + start screens for the
 * Oak Valley Golf Scramble, branded to Madalyn Robinson Foundation.
 *
 * Output: deliverables/photo-booth/
 *
 * Usage: node scripts/build-photo-booth-overlays.mjs
 */
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"
import sharp from "sharp"
import QRCode from "qrcode"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const brandDir = join(root, "public/brand")
const outDir = join(root, "deliverables/photo-booth")

const DEEP = "#1c3d32"
const DEEP_MID = "#2a4f42"
const ON_DEEP = "#f4f1e8"
const ON_DEEP_MUTED = "#d8e4dc"
const ACCENT = "#c9a24b"
const ACCENT_LIGHT = "#e0c078"

const COPY = {
  org: "Madalyn Robinson Foundation",
  short: "Maddy’s Foundation",
  event: "2nd Annual Golf Scramble",
  date: "September 25, 2026",
  venue: "Oak Valley Golf Course",
  city: "Pevely, Missouri",
  url: "maddysfoundation.org",
  urlAbs: "https://maddysfoundation.org",
  tagline: "Gather in her light",
  welcome: "Strike a pose",
  thanks: "Thank you",
  thanksSub: "Your photo is printing",
}

const FONT_DISPLAY = "Noto Serif"
const FONT_SANS = "Inter"

/** @typedef {{ x: number, y: number, w: number, h: number }} PhotoWin */

/** @type {Array<{
 *   id: string
 *   kind: "overlay"
 *   w: number
 *   h: number
 *   dpi: number
 *   print: string
 *   headerH: number
 *   footerH: number
 *   logo: number
 *   windows: PhotoWin[]
 *   qr?: boolean
 * }>} */
const OVERLAYS = [
  {
    id: "4x6-landscape-1up",
    kind: "overlay",
    w: 1800,
    h: 1200,
    dpi: 300,
    print: "4×6 in landscape (1 photo)",
    headerH: 156,
    footerH: 176,
    logo: 92,
    qr: true,
    windows: [{ x: 52, y: 156, w: 1696, h: 868 }],
  },
  {
    id: "4x6-portrait-1up",
    kind: "overlay",
    w: 1200,
    h: 1800,
    dpi: 300,
    print: "4×6 in portrait (1 photo)",
    headerH: 210,
    footerH: 230,
    logo: 108,
    qr: true,
    windows: [{ x: 56, y: 210, w: 1088, h: 1360 }],
  },
  {
    id: "4x6-landscape-2up",
    kind: "overlay",
    w: 1800,
    h: 1200,
    dpi: 300,
    print: "4×6 in landscape (2 photos)",
    headerH: 140,
    footerH: 148,
    logo: 80,
    windows: [
      { x: 40, y: 140, w: 842, h: 912 },
      { x: 918, y: 140, w: 842, h: 912 },
    ],
  },
  {
    id: "4x6-portrait-3up",
    kind: "overlay",
    w: 1200,
    h: 1800,
    dpi: 300,
    print: "4×6 in portrait (3 photos)",
    headerH: 188,
    footerH: 168,
    logo: 88,
    windows: [
      { x: 48, y: 188, w: 1104, h: 458 },
      { x: 48, y: 662, w: 1104, h: 458 },
      { x: 48, y: 1136, w: 1104, h: 458 },
    ],
  },
  {
    id: "2x6-strip-3up",
    kind: "overlay",
    w: 600,
    h: 1800,
    dpi: 300,
    print: "2×6 in strip (3 photos)",
    headerH: 168,
    footerH: 148,
    logo: 72,
    windows: [
      { x: 18, y: 168, w: 564, h: 480 },
      { x: 18, y: 662, w: 564, h: 480 },
      { x: 18, y: 1156, w: 564, h: 480 },
    ],
  },
  {
    id: "2x6-strip-4up",
    kind: "overlay",
    w: 600,
    h: 1800,
    dpi: 300,
    print: "2×6 in strip (4 photos)",
    headerH: 128,
    footerH: 112,
    logo: 56,
    windows: [
      { x: 16, y: 128, w: 568, h: 380 },
      { x: 16, y: 520, w: 568, h: 380 },
      { x: 16, y: 912, w: 568, h: 380 },
      { x: 16, y: 1304, w: 568, h: 380 },
    ],
  },
  {
    id: "social-square-1up",
    kind: "overlay",
    w: 1080,
    h: 1080,
    dpi: 72,
    print: "1080×1080 square (GIFs / 360 / sharing)",
    headerH: 148,
    footerH: 156,
    logo: 84,
    windows: [{ x: 48, y: 148, w: 984, h: 776 }],
  },
  {
    id: "story-portrait-1up",
    kind: "overlay",
    w: 1080,
    h: 1920,
    dpi: 72,
    print: "1080×1920 story / iPad (1 photo)",
    headerH: 220,
    footerH: 240,
    logo: 112,
    windows: [{ x: 48, y: 220, w: 984, h: 1460 }],
  },
]

function xmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function maskHoles(windows) {
  return windows
    .map(
      (p) =>
        `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="black"/>`,
    )
    .join("")
}

function goldWindowStrokes(windows) {
  return windows
    .map(
      (p) =>
        `<rect x="${p.x + 1.5}" y="${p.y + 1.5}" width="${p.w - 3}" height="${p.h - 3}" fill="none" stroke="${ACCENT}" stroke-width="3"/>`,
    )
    .join("")
}

function overlaySvg(layout, logoHref, qrHref) {
  const { w, h, headerH, footerH, logo, windows } = layout
  const strip = layout.w <= 600
  const portrait = h > w
  const centeredHeader = strip || w === h
  const centerFooter = strip || w === h
  const nameSize = strip ? 22 : portrait ? 34 : 36
  const eventSize = strip ? 22 : portrait ? 34 : 36
  const metaSize = strip ? 16 : 22
  const urlSize = strip ? 14 : 18
  const logoY = centeredHeader ? 18 : Math.round((headerH - logo) / 2)
  const cx = w / 2
  const pad = 40

  const headerText = centeredHeader
    ? `
      <text x="${cx}" y="${logoY + logo + (strip ? 22 : 28)}" text-anchor="middle"
        font-family="${FONT_SANS}" font-weight="600" font-size="${strip ? 15 : 20}"
        fill="${ON_DEEP}">${xmlEscape(strip ? COPY.short : COPY.org)}</text>`
    : `
      <text x="${pad + logo + 20}" y="${headerH / 2 + nameSize * 0.35}" text-anchor="start"
        font-family="${FONT_DISPLAY}" font-weight="700" font-size="${nameSize}"
        fill="${ON_DEEP}">${xmlEscape(COPY.org)}</text>`

  const headerLogoX = centeredHeader ? cx - logo / 2 : pad

  const qrSize = layout.qr ? (portrait ? 96 : 88) : 0

  const eventY = h - footerH + (strip ? 36 : portrait ? 58 : 54)
  const dateY = eventY + (strip ? 26 : 36)
  const urlY = dateY + (strip ? 22 : 30)

  const qrX = w - 24 - qrSize
  const qrY = h - footerH + Math.round((footerH - qrSize) / 2)

  const qrBlock =
    layout.qr && qrHref
      ? `
      <rect x="${qrX - 6}" y="${qrY - 6}" width="${qrSize + 12}" height="${qrSize + 12}" fill="${ON_DEEP}"/>
      <image href="${qrHref}" xlink:href="${qrHref}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>`
      : ""

  const headerLogo = `
    <circle cx="${headerLogoX + logo / 2}" cy="${logoY + logo / 2}" r="${logo / 2 + 3}" fill="${ON_DEEP}"/>
    <image href="${logoHref}" xlink:href="${logoHref}" x="${headerLogoX}" y="${logoY}" width="${logo}" height="${logo}"
      clip-path="url(#logoClip)"/>`

  // Reposition clip origin via a nested group
  const clipX = headerLogoX
  const clipY = logoY

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <clipPath id="logoClip">
      <circle cx="${clipX + logo / 2}" cy="${clipY + logo / 2}" r="${logo / 2}"/>
    </clipPath>
    <mask id="frame">
      <rect width="${w}" height="${h}" fill="white"/>
      ${maskHoles(windows)}
    </mask>
    <linearGradient id="goldBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${ACCENT}"/>
      <stop offset="0.5" stop-color="${ACCENT_LIGHT}"/>
      <stop offset="1" stop-color="${ACCENT}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${DEEP}" mask="url(#frame)"/>
  <rect x="0" y="${headerH - 7}" width="${w}" height="7" fill="url(#goldBar)"/>
  <rect x="0" y="${h - footerH}" width="${w}" height="7" fill="url(#goldBar)"/>
  ${goldWindowStrokes(windows)}
  ${headerLogo}
  ${headerText}
  <text x="${centerFooter ? cx : 40}" y="${eventY}" text-anchor="${centerFooter ? "middle" : "start"}"
    font-family="${FONT_DISPLAY}" font-weight="700" font-size="${eventSize}"
    fill="${ON_DEEP}">${xmlEscape(COPY.event)}</text>
  <text x="${centerFooter ? cx : 40}" y="${dateY}" text-anchor="${centerFooter ? "middle" : "start"}"
    font-family="${FONT_SANS}" font-weight="500" font-size="${metaSize}"
    fill="${ON_DEEP_MUTED}">${xmlEscape(strip ? `${COPY.date}  ·  Oak Valley` : `${COPY.date}  ·  ${COPY.venue}`)}</text>
  <text x="${centerFooter ? cx : 40}" y="${urlY}" text-anchor="${centerFooter ? "middle" : "start"}"
    font-family="${FONT_SANS}" font-weight="500" font-size="${urlSize}"
    fill="${ACCENT_LIGHT}">${xmlEscape(COPY.url)}</text>
  ${qrBlock}
</svg>`
}

function screenChromeSvg(w, h, opts) {
  const { title, subtitle, kicker, footer, logoHref, logo, portrait } = opts
  const logoX = portrait ? w / 2 - logo / 2 : 80
  const logoY = portrait ? 120 : 120
  const textX = portrait ? w / 2 : 80
  const anchor = portrait ? "middle" : "start"
  const titleSize = portrait ? 64 : 56
  const subSize = portrait ? 32 : 28
  const titleY = portrait ? logoY + logo + 90 : 360
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <clipPath id="logoClip">
      <circle cx="${logoX + logo / 2}" cy="${logoY + logo / 2}" r="${logo / 2}"/>
    </clipPath>
    <linearGradient id="goldBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${ACCENT}"/>
      <stop offset="0.5" stop-color="${ACCENT_LIGHT}"/>
      <stop offset="1" stop-color="${ACCENT}"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${DEEP}" stop-opacity="1"/>
      <stop offset="0.35" stop-color="${DEEP}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${DEEP}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="10" fill="url(#goldBar)"/>
  <rect y="${h - 10}" width="${w}" height="10" fill="url(#goldBar)"/>
  <circle cx="${logoX + logo / 2}" cy="${logoY + logo / 2}" r="${logo / 2 + 6}" fill="${ON_DEEP}"/>
  <image href="${logoHref}" xlink:href="${logoHref}" x="${logoX}" y="${logoY}" width="${logo}" height="${logo}" clip-path="url(#logoClip)"/>
  <text x="${textX}" y="${titleY - 48}" text-anchor="${anchor}"
    font-family="${FONT_SANS}" font-weight="600" font-size="${portrait ? 22 : 18}"
    letter-spacing="4" fill="${ACCENT_LIGHT}">${xmlEscape(kicker.toUpperCase())}</text>
  <text x="${textX}" y="${titleY + 16}" text-anchor="${anchor}"
    font-family="${FONT_DISPLAY}" font-weight="700" font-size="${titleSize}"
    fill="${ON_DEEP}">${xmlEscape(title)}</text>
  <text x="${textX}" y="${titleY + 16 + subSize + 28}" text-anchor="${anchor}"
    font-family="${FONT_SANS}" font-weight="500" font-size="${subSize}"
    fill="${ON_DEEP_MUTED}">${xmlEscape(subtitle)}</text>
  <text x="${textX}" y="${h - 72}" text-anchor="${anchor}"
    font-family="${FONT_SANS}" font-weight="500" font-size="22"
    fill="${ACCENT_LIGHT}">${xmlEscape(footer)}</text>
</svg>`
}

async function toPng(svg, w, h) {
  return sharp(Buffer.from(svg))
    .resize(w, h, { fit: "fill" })
    .png({ compressionLevel: 9, force: true })
    .toBuffer()
}

async function circularLogoPng(size) {
  const src = join(brandDir, "logo.webp")
  const circle = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
    </svg>`,
  )
  return sharp(src)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toBuffer()
}

async function dataUriPng(buf) {
  return `data:image/png;base64,${buf.toString("base64")}`
}

async function buildDoubleStrip(stripBuf) {
  const meta = await sharp(stripBuf).metadata()
  const w = meta.width
  const h = meta.height
  return sharp({
    create: {
      width: w * 2,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: stripBuf, left: 0, top: 0 },
      { input: stripBuf, left: w, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function samplePhoto(w, h) {
  return sharp(join(brandDir, "maddy.jpg"))
    .resize(w, h, { fit: "cover", position: "top" })
    .jpeg({ quality: 88 })
    .toBuffer()
}

async function previewFor(layout, overlayBuf) {
  const photos = await Promise.all(
    layout.windows.map(async (win) => ({
      input: await samplePhoto(win.w, win.h),
      left: win.x,
      top: win.y,
    })),
  )
  return sharp({
    create: {
      width: layout.w,
      height: layout.h,
      channels: 3,
      background: DEEP_MID,
    },
  })
    .composite([...photos, { input: overlayBuf, left: 0, top: 0 }])
    .jpeg({ quality: 86, progressive: true })
    .toBuffer()
}

async function buildScreen(opts) {
  const { w, h, id, portrait, title, subtitle, kicker, footer, logoHref } = opts
  const logo = portrait ? 160 : 140
  const chrome = screenChromeSvg(w, h, {
    title,
    subtitle,
    kicker,
    footer,
    logoHref,
    logo,
    portrait,
  })
  const chromeBuf = await toPng(chrome, w, h)

  const photo = await sharp(join(brandDir, "maddy-960.webp"))
    .resize(portrait ? w : Math.round(w * 0.46), h, {
      fit: "cover",
      position: "top",
    })
    .toBuffer()

  const photoW = portrait ? w : Math.round(w * 0.46)
  const layers = [
    {
      input: await sharp({
        create: {
          width: w,
          height: h,
          channels: 3,
          background: DEEP,
        },
      })
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    },
    { input: photo, left: portrait ? 0 : w - photoW, top: 0 },
  ]

  if (!portrait) {
    const fadeW = Math.round(photoW * 0.45)
    const fade = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${fadeW}" height="${h}">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="${DEEP}" stop-opacity="1"/>
            <stop offset="1" stop-color="${DEEP}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="${fadeW}" height="${h}" fill="url(#g)"/>
      </svg>`,
    )
    layers.push({ input: fade, left: w - photoW, top: 0 })
  } else {
    const veil = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <rect width="${w}" height="${h}" fill="${DEEP}" fill-opacity="0.42"/>
      </svg>`,
    )
    layers.push({ input: veil, left: 0, top: 0 })
  }

  layers.push({ input: chromeBuf, left: 0, top: 0 })

  const base = await sharp({
    create: { width: w, height: h, channels: 3, background: DEEP },
  })
    .composite(layers)
    .jpeg({ quality: 90, progressive: true })
    .toBuffer()

  return { id, buf: base, ext: "jpg" }
}

function clientReadme() {
  return `# Madalyn Robinson Foundation — photo booth files

Ready for the booth operator. Brand matches [maddysfoundation.org](https://maddysfoundation.org): fairway green, soft gold, circular logo.

**Event:** ${COPY.event}  
**When:** ${COPY.date} · 8:00 AM shotgun  
**Where:** ${COPY.venue}, ${COPY.city}

Hand the operator the zip, or this folder. They only need \`overlays/\` and \`screens/\`. \`previews/\` is so you can see the frames on a sample photo of Maddy before print day.

## What’s in the box

| File | Size | Use |
| --- | --- | --- |
| \`overlays/4x6-landscape-1up.png\` | 1800×1200 @ 300 dpi | Standard landscape postcard |
| \`overlays/4x6-portrait-1up.png\` | 1200×1800 @ 300 dpi | Standard portrait postcard |
| \`overlays/4x6-landscape-2up.png\` | 1800×1200 @ 300 dpi | Two photos on one 4×6 |
| \`overlays/4x6-portrait-3up.png\` | 1200×1800 @ 300 dpi | Three photos on one 4×6 |
| \`overlays/2x6-strip-3up.png\` | 600×1800 @ 300 dpi | Classic 2×6 strip (3 poses) |
| \`overlays/2x6-strip-4up.png\` | 600×1800 @ 300 dpi | Classic 2×6 strip (4 poses) |
| \`overlays/4x6-double-strip-3up.png\` | 1200×1800 @ 300 dpi | Two strips on one 4×6 (most printers) |
| \`overlays/social-square-1up.png\` | 1080×1080 | GIF / 360 / email / SMS share |
| \`overlays/story-portrait-1up.png\` | 1080×1920 | iPad / story / mirror booth |
| \`screens/welcome-1920x1080.jpg\` | 1920×1080 | Attract / start screen (TV) |
| \`screens/welcome-1080x1920.jpg\` | 1080×1920 | Attract / start screen (iPad) |
| \`screens/thanks-1920x1080.jpg\` | 1920×1080 | “Your photo is printing” |
| \`screens/thanks-1080x1920.jpg\` | 1080×1920 | “Your photo is printing” (iPad) |
| \`coordinates.json\` | — | Pixel-accurate photo windows |

Photo windows are **fully transparent**. Do not flatten the PNGs. Gold hairline is the crop-safe edge of each window.

4×6 landscape/portrait files include a QR to ${COPY.urlAbs} on the print.

## Load in booth software

**dslrBooth / Sparkbooth / Darkroom / LumaBooth / Breeze**

1. New event → print size 4×6 (or 2×6 for strips).
2. Set overlay / foreground to the matching PNG.
3. Set each camera box to the \`x, y, width, height\` in \`coordinates.json\` (top-left origin, pixels).
4. Assign welcome + thanks screens to Attract and Printing states.
5. Test-print one landscape, one strip, and one square share before guests arrive.

If the software asks for a background, use a solid \`#1c3d32\` plate or leave it empty — the live camera fills the transparent windows.

## Copy on the frames

- ${COPY.org}
- ${COPY.event}
- ${COPY.date} · ${COPY.venue}
- ${COPY.url}

To change names or the date, edit \`COPY\` in \`scripts/build-photo-booth-overlays.mjs\` and run:

\`\`\`bash
pnpm photo-booth
\`\`\`

That regenerates this folder and \`Madalyn-Robinson-Foundation-Photo-Booth.zip\`.
`
}

async function main() {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true })
  const overlaysDir = join(outDir, "overlays")
  const screensDir = join(outDir, "screens")
  const previewsDir = join(outDir, "previews")
  mkdirSync(overlaysDir, { recursive: true })
  mkdirSync(screensDir, { recursive: true })
  mkdirSync(previewsDir, { recursive: true })

  const logoMaster = await circularLogoPng(256)
  const logoHref = await dataUriPng(logoMaster)
  const qrPng = await QRCode.toBuffer(COPY.urlAbs, {
    margin: 1,
    width: 256,
    errorCorrectionLevel: "M",
    color: { dark: DEEP, light: ON_DEEP },
  })
  const qrHref = await dataUriPng(qrPng)

  const manifest = {
    event: COPY.event,
    organization: COPY.org,
    date: COPY.date,
    venue: `${COPY.venue}, ${COPY.city}`,
    site: COPY.urlAbs,
    generatedAt: new Date().toISOString(),
    notes:
      "PNG overlays are transparent in the photo windows. Import the matching overlay, then set capture boxes to the coordinates below (pixels from the top-left of the overlay).",
    files: [],
  }

  for (const layout of OVERLAYS) {
    const svg = overlaySvg(layout, logoHref, qrHref)
    const buf = await toPng(svg, layout.w, layout.h)
    const name = `${layout.id}.png`
    writeFileSync(join(overlaysDir, name), buf)
    const preview = await previewFor(layout, buf)
    writeFileSync(join(previewsDir, `${layout.id}.jpg`), preview)
    manifest.files.push({
      file: `overlays/${name}`,
      preview: `previews/${layout.id}.jpg`,
      print: layout.print,
      pixels: [layout.w, layout.h],
      dpi: layout.dpi,
      photos: layout.windows.map((p, i) => ({
        index: i + 1,
        x: p.x,
        y: p.y,
        width: p.w,
        height: p.h,
      })),
    })
    console.log("overlay", name)
  }

  const strip3 = OVERLAYS.find((l) => l.id === "2x6-strip-3up")
  const strip3Buf = await sharp(join(overlaysDir, "2x6-strip-3up.png")).toBuffer()
  const doubleBuf = await buildDoubleStrip(strip3Buf)
  writeFileSync(join(overlaysDir, "4x6-double-strip-3up.png"), doubleBuf)
  const doublePreview = await previewFor(
    {
      ...strip3,
      id: "4x6-double-strip-3up",
      w: 1200,
      h: 1800,
      print: "4×6 in (two 2×6 strips)",
      windows: [
        ...strip3.windows,
        ...strip3.windows.map((p) => ({ ...p, x: p.x + 600 })),
      ],
    },
    doubleBuf,
  )
  writeFileSync(join(previewsDir, "4x6-double-strip-3up.jpg"), doublePreview)
  manifest.files.push({
    file: "overlays/4x6-double-strip-3up.png",
    preview: "previews/4x6-double-strip-3up.jpg",
    print: "4×6 in (two identical 2×6 strips side by side)",
    pixels: [1200, 1800],
    dpi: 300,
    photos: [
      ...strip3.windows.map((p, i) => ({
        index: i + 1,
        x: p.x,
        y: p.y,
        width: p.w,
        height: p.h,
      })),
      ...strip3.windows.map((p, i) => ({
        index: i + 4,
        x: p.x + 600,
        y: p.y,
        width: p.w,
        height: p.h,
      })),
    ],
  })
  console.log("overlay 4x6-double-strip-3up.png")

  const screens = [
    await buildScreen({
      id: "welcome-1920x1080",
      w: 1920,
      h: 1080,
      portrait: false,
      title: COPY.welcome,
      subtitle: `${COPY.event}  ·  ${COPY.date}`,
      kicker: COPY.org,
      footer: COPY.url,
      logoHref,
    }),
    await buildScreen({
      id: "welcome-1080x1920",
      w: 1080,
      h: 1920,
      portrait: true,
      title: COPY.welcome,
      subtitle: `${COPY.event}  ·  ${COPY.date}`,
      kicker: COPY.org,
      footer: COPY.url,
      logoHref,
    }),
    await buildScreen({
      id: "thanks-1920x1080",
      w: 1920,
      h: 1080,
      portrait: false,
      title: COPY.thanks,
      subtitle: COPY.thanksSub,
      kicker: COPY.tagline,
      footer: COPY.url,
      logoHref,
    }),
    await buildScreen({
      id: "thanks-1080x1920",
      w: 1080,
      h: 1920,
      portrait: true,
      title: COPY.thanks,
      subtitle: COPY.thanksSub,
      kicker: COPY.tagline,
      footer: COPY.url,
      logoHref,
    }),
  ]

  for (const screen of screens) {
    const name = `${screen.id}.${screen.ext}`
    writeFileSync(join(screensDir, name), screen.buf)
    manifest.files.push({
      file: `screens/${name}`,
      print: "Booth start / thanks screen (not an overlay)",
      pixels: screen.id.includes("1920x1080") ? [1920, 1080] : [1080, 1920],
    })
    console.log("screen", name)
  }

  writeFileSync(join(outDir, "coordinates.json"), JSON.stringify(manifest, null, 2))
  writeFileSync(join(outDir, "README.md"), clientReadme())

  const zipPath = join(outDir, "Madalyn-Robinson-Foundation-Photo-Booth.zip")
  execFileSync(
    "zip",
    [
      "-r",
      "-q",
      zipPath,
      "overlays",
      "screens",
      "previews",
      "coordinates.json",
      "README.md",
    ],
    { cwd: outDir },
  )
  console.log("wrote", zipPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
