import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { EventCapacityBanner } from "@/components/event-capacity-banner"
import { SiteHeaderSolid } from "@/components/site-header"
import {
  formatEventDate,
  formatEventFeeLabel,
  getEventBySlug,
  isRegistrationAvailable,
  listPublishedEvents,
} from "@/lib/events"
import { mapsLinks } from "@/lib/maps"
import { siteName, siteUrl } from "@/lib/site-metadata"

export const revalidate = 30

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  try {
    const events = await listPublishedEvents()
    return events.map((e) => ({ slug: e.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug).catch(() => null)
  if (!event || !event.is_published) {
    return { title: "Event" }
  }
  return {
    title: event.title,
    description: (
      event.summary || `Join us for ${event.title} — ${siteName}`
    ).slice(0, 125),
    openGraph: {
      title: `${event.title} | ${siteName}`,
      description: event.summary?.slice(0, 125) || undefined,
      url: `${siteUrl}/events/${event.slug}`,
      siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.title} | ${siteName}`,
      description: event.summary?.slice(0, 125) || undefined,
    },
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug).catch(() => null)
  if (!event || !event.is_published) notFound()

  const feeLabel = formatEventFeeLabel(event)
  const open = isRegistrationAvailable(event)
  const maps = event.location ? mapsLinks(event.location) : null
  const teamSize = event.team_size && event.team_size > 1 ? event.team_size : null

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSolid />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <Link
          href="/events"
          className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink"
        >
          ← All events
        </Link>
        <h1 className="mt-6 break-words font-display">{event.title}</h1>
        <p className="mt-4 text-lg font-medium text-muted">
          {formatEventDate(event.starts_at)}
          {event.ends_at ? ` – ${formatEventDate(event.ends_at)}` : ""}
        </p>

        {event.location ? (
          <div className="mt-4">
            <p className="text-muted">{event.location}</p>
            {maps ? (
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a
                  href={maps.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center font-medium text-accent-ink underline decoration-accent/70 underline-offset-4"
                >
                  Google Maps
                </a>
                <a
                  href={maps.apple}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center font-medium text-accent-ink underline decoration-accent/70 underline-offset-4"
                >
                  Apple Maps
                </a>
              </p>
            ) : null}
          </div>
        ) : null}

        {feeLabel ? (
          <p className="mt-3 text-sm text-muted">
            {teamSize ? (
              <>
                <strong className="text-ink">{feeLabel}</strong>
                {" · "}
                {teamSize}-person team · payment required to complete registration
              </>
            ) : (
              <>Contribution: {feeLabel}</>
            )}
          </p>
        ) : null}

        <EventCapacityBanner event={event} />

        {event.description ? (
          <div className="prose-measure mt-10 whitespace-pre-wrap text-lg leading-relaxed text-muted">
            {event.description}
          </div>
        ) : event.summary ? (
          <p className="mt-10 text-lg text-muted">{event.summary}</p>
        ) : null}

        <div className="mt-12">
          {open ? (
            <Link
              href={`/events/${event.slug}/register`}
              className="motion-press inline-flex min-h-11 w-full items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink sm:w-auto"
            >
              {teamSize ? "Register your team" : "Register for this event"}
            </Link>
          ) : (
            <p className="text-sm font-medium text-muted">
              Registration is closed for this event.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
