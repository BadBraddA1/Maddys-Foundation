import {
  ogShareAlt,
  ogShareContentType,
  ogShareSize,
  renderOgShareImage,
} from "@/lib/og-share-image"

export const alt = ogShareAlt
export const size = ogShareSize
export const contentType = ogShareContentType
export const runtime = "nodejs"

export default async function Image() {
  return renderOgShareImage()
}
