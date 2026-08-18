/**
 * Export press-kit PNGs from public/brand/logo.jpg
 * (black-on-white, black-on-transparent, white-on-transparent).
 *
 * Usage: node scripts/export-logo-downloads.mjs
 */
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const brand = join(__dirname, "../public/brand")
const src = join(brand, "logo.jpg")

async function knockOutWhite(invert) {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
    const alpha = Math.max(0, Math.min(255, Math.round(255 - lum)))
    if (invert) {
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
    } else {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
    }
    data[i + 3] = alpha
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png({ compressionLevel: 9 })
}

async function main() {
  await sharp(src).png({ compressionLevel: 9 }).toFile(join(brand, "logo.png"))
  await (await knockOutWhite(false)).toFile(join(brand, "logo-transparent.png"))
  await (await knockOutWhite(true)).toFile(join(brand, "logo-white.png"))
  console.log("Wrote logo.png, logo-transparent.png, logo-white.png")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
