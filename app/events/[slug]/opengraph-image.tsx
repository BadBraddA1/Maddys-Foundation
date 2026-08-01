import { getEventBySlug } from "@/lib/events"
import { ogContentType, ogSize, renderEventOgImage } from "@/lib/og-card"

export const size = ogSize
export const contentType = ogContentType
export const alt = "Foundation event"
export const runtime = "nodejs"

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const event = await getEventBySlug(slug).catch(() => null)
  return renderEventOgImage(event)
}
