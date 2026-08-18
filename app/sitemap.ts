import type { MetadataRoute } from "next"
import { listPublishedEvents } from "@/lib/events"
import { siteUrl } from "@/lib/site-metadata"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/story",
    "/events",
    "/gallery",
    "/donate",
    "/brand",
    "/privacy",
  ].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
    }),
  )

  let eventRoutes: MetadataRoute.Sitemap = []
  try {
    const events = await listPublishedEvents()
    eventRoutes = events.map((event) => ({
      url: `${siteUrl}/events/${event.slug}`,
      lastModified: new Date(event.updated_at || event.created_at || Date.now()),
    }))
  } catch {
    eventRoutes = []
  }

  return [...staticRoutes, ...eventRoutes]
}
