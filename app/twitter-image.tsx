import {
  ogContentType,
  ogSize,
  renderSiteOgImage,
  siteOgAlt,
} from "@/lib/og-card"

export const alt = siteOgAlt
export const size = ogSize
export const contentType = ogContentType
export const runtime = "nodejs"

export default async function Image() {
  return renderSiteOgImage()
}
