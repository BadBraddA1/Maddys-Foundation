import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"
import {
  formatEventDate,
  formatFee,
  getEventBySlug,
  isRegistrationAvailable,
} from "@/lib/events"
import { siteName } from "@/lib/site-metadata"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug).catch(() => null)
  if (!event || !event.is_published) {
    return { title: "Event" }
  }
  return {
    title: event.title,
    description: event.summary || `Join us for ${event.title} — ${siteName}`,
    openGraph: {
      title: `${event.title} | ${siteName}`,
      description: event.summary || undefined,
    },
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug).catch(() => null)
  if (!event || !event.is_published) notFound()

  const fee = formatFee(event.fee_cents)
  const open = isRegistrationAvailable(event)
  const spotsLeft =
    event.capacity != null && event.registration_count != null
      ? Math.max(0, event.capacity - event.registration_count)
      : null

  return (
    <div className="flex min-h-screen flex-col">
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
          <p className="mt-2 text-muted">{event.location}</p>
        ) : null}
        {fee ? (
          <p className="mt-2 text-sm text-muted">Suggested contribution: {fee}</p>
        ) : null}
        {spotsLeft != null ? (
          <p className="mt-2 text-sm text-muted">
            {spotsLeft === 0 ? "Event is full" : `${spotsLeft} spots left`}
          </p>
        ) : null}

        {event.description ? (
          <div className="mt-10 whitespace-pre-wrap text-lg leading-relaxed text-muted">
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
              Register for this event
            </Link>
          ) : (
            <p className="text-sm font-medium text-muted">
              Registration is closed for this event.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
