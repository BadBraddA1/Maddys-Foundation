/**
 * Rebuild public/brand/maddy-og-cutout.png from maddy-og-fullhead.png.
 *
 * The hero JPEG clips Maddy’s crown, so OG uses an AI-completed full-head
 * plate on solid fairway green (#1c3d32). We flood-fill border-connected
 * greens to that exact hex (no rectangular “photo box”), then place her on
 * the right with ~64px headroom.
 *
 * Usage: node scripts/rebuild-og-cutout.mjs
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const brand = join(root, "public/brand")

const DEEP = { r: 0x1c, g: 0x3d, b: 0x32 }
const W = 1200
const H = 630
const HEADROOM = 64

function isFairwayGreen(r, g, b) {
  if (g < r + 6 || g < b + 3) return false
  if (g < 34 || g > 135) return false
  if (r > 95 || b > 95) return false
  const dr = r - DEEP.r
  const dg = g - DEEP.g
  const db = b - DEEP.b
  return dr * dr + dg * dg + db * db < 90 * 90
}

function floodToDeep(rgba, w, h) {
  const seen = Buffer.alloc(w * h)
  const qx = new Int32Array(w * h)
  const qy = new Int32Array(w * h)
  let qs = 0
  let qe = 0
  const enqueue = (x, y) => {
    const i = y * w + x
    if (seen[i]) return
    const p = i * 4
    if (!isFairwayGreen(rgba[p], rgba[p + 1], rgba[p + 2])) return
    seen[i] = 1
    qx[qe] = x
    qy[qe] = y
    qe++
  }
  for (let x = 0; x < w; x++) {
    enqueue(x, 0)
    enqueue(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y)
    enqueue(w - 1, y)
  }
  while (qs < qe) {
    const x = qx[qs]
    const y = qy[qs]
    qs++
    const p = (y * w + x) * 4
    rgba[p] = DEEP.r
    rgba[p + 1] = DEEP.g
    rgba[p + 2] = DEEP.b
    rgba[p + 3] = 255
    if (x > 0) enqueue(x - 1, y)
    if (x + 1 < w) enqueue(x + 1, y)
    if (y > 0) enqueue(x, y - 1)
    if (y + 1 < h) enqueue(x, y + 1)
  }
}

async function main() {
  const srcPath = join(brand, "maddy-og-fullhead.png")
  if (!existsSync(srcPath)) {
    throw new Error(`Missing ${srcPath}`)
  }

  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const sw = info.width
  const sh = info.height
  const rgba = Buffer.from(data)
  floodToDeep(rgba, sw, sh)

  let minX = sw
  let maxX = 0
  let minY = sh
  let maxY = 0
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const p = (y * sw + x) * 4
      const dr = rgba[p] - DEEP.r
      const dg = rgba[p + 1] - DEEP.g
      const db = rgba[p + 2] - DEEP.b
      if (dr * dr + dg * dg + db * db > 250) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  const headPad = 90
  const sidePad = 40
  const cropTop = Math.max(0, minY - headPad)
  const cropLeft = Math.max(0, minX - sidePad)
  const cropW = Math.min(sw, maxX + sidePad) - cropLeft
  const cropH = Math.min(sh, maxY + 10) - cropTop

  const cleaned = await sharp(rgba, {
    raw: { width: sw, height: sh, channels: 4 },
  })
    .png()
    .toBuffer()

  const targetH = H
  const targetW = Math.round(cropW * (targetH / cropH))
  const plate = await sharp(cleaned)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .resize(targetW, targetH, { fit: "fill" })
    .png()
    .toBuffer()

  let out = await sharp({
    create: { width: W, height: H, channels: 3, background: DEEP },
  })
    .composite([{ input: plate, left: Math.max(0, W - 16 - targetW), top: 0 }])
    .flatten({ background: DEEP })
    .png({ compressionLevel: 9 })
    .toBuffer()

  // Pale sky bits trapped in hair (only high-luminance, low-chroma, next to DEEP)
  {
    const { data: od, info: oi } = await sharp(out)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const pix = Buffer.from(od)
    const ww = oi.width
    const hh = oi.height
    for (let y = 1; y < hh - 1; y++) {
      for (let x = 1; x < ww - 1; x++) {
        const p = (y * ww + x) * 4
        const r = pix[p]
        const g = pix[p + 1]
        const b = pix[p + 2]
        const maxc = Math.max(r, g, b)
        const minc = Math.min(r, g, b)
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        if (!(lum > 110 && maxc - minc < 35)) continue
        let nearDeep = false
        for (let dy = -1; dy <= 1 && !nearDeep; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const pp = ((y + dy) * ww + (x + dx)) * 4
            if (
              pix[pp] === DEEP.r &&
              pix[pp + 1] === DEEP.g &&
              pix[pp + 2] === DEEP.b
            ) {
              nearDeep = true
            }
          }
        }
        if (nearDeep) {
          pix[p] = DEEP.r
          pix[p + 1] = DEEP.g
          pix[p + 2] = DEEP.b
        }
      }
    }
    out = await sharp(pix, { raw: { width: ww, height: hh, channels: 4 } })
      .flatten({ background: DEEP })
      .png({ compressionLevel: 9 })
      .toBuffer()
  }

  // Enforce headroom by shifting subject down if needed
  {
    const { data: fd, info: fi } = await sharp(out)
      .raw()
      .toBuffer({ resolveWithObject: true })
    let sMinX = W
    let sMaxX = 0
    let sMinY = H
    for (let y = 0; y < fi.height; y++) {
      for (let x = 0; x < fi.width; x++) {
        const i = (y * fi.width + x) * fi.channels
        const dr = fd[i] - DEEP.r
        const dg = fd[i + 1] - DEEP.g
        const db = fd[i + 2] - DEEP.b
        if (dr * dr + dg * dg + db * db > 250) {
          if (x < sMinX) sMinX = x
          if (x > sMaxX) sMaxX = x
          if (y < sMinY) sMinY = y
        }
      }
    }
    if (sMinY < HEADROOM) {
      const subj = await sharp(out)
        .extract({
          left: sMinX,
          top: sMinY,
          width: sMaxX - sMinX + 1,
          height: H - sMinY,
        })
        .png()
        .toBuffer()
      out = await sharp({
        create: { width: W, height: H, channels: 3, background: DEEP },
      })
        .composite([{ input: subj, left: sMinX, top: HEADROOM }])
        .flatten({ background: DEEP })
        .png({ compressionLevel: 9 })
        .toBuffer()
    }
  }

  writeFileSync(join(brand, "maddy-og-cutout.png"), out)
  await sharp(out)
    .jpeg({ quality: 90, progressive: true })
    .toFile(join(brand, "maddy-og-cutout.jpg"))
  console.log("Wrote maddy-og-cutout.png/.jpg")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
