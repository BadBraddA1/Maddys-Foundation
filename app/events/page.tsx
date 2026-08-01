import type { Metadata } from "next"
import Link from "next/link"
import { EmptyEvents, LoadError } from "@/components/load-state"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"
import {
  formatEventDate,
  formatFee,
  isRegistrationAvailable,
  listPublishedEvents,
} from "@/lib/events"

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming Madalyn Robinson Foundation gatherings and registration.",
}

export const dynamic = "force-dynamic"

export default async function EventsPage() {
  let events: Awaited<ReturnType<typeof listPublishedEvents>> = []
  let loadFailed = false
  try {
    events = await listPublishedEvents()
  } catch {
    loadFailed = true
  }

  const now = Date.now()
  const upcoming = events.filter(
    (e) => new Date(e.starts_at).getTime() >= now - 86_400_000,
  )
  const past = events.filter(
    (e) => new Date(e.starts_at).getTime() < now - 86_400_000,
  )

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeaderSolid />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <h1 className="font-display">Events</h1>
        <p className="prose-measure mt-4 text-lg text-muted">
          Custom foundation gatherings — register in a minute from your phone.
        </p>

        {loadFailed ? (
          <LoadError title="Events unavailable" />
        ) : upcoming.length === 0 ? (
          <EmptyEvents />
        ) : (
          <ul className="mt-12 divide-y divide-line border-t border-line">
            {upcoming.map((event) => {
              const fee = formatFee(event.fee_cents)
              const open = isRegistrationAvailable(event)
              return (
                <li key={event.id} className="py-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 max-w-2xl">
                      <Link
                        href={`/events/${event.slug}`}
                        className="break-words font-display text-2xl hover:text-accent-ink md:text-3xl"
                      >
                        {event.title}
                      </Link>
                      <p className="mt-2 text-sm font-medium text-muted">
                        {formatEventDate(event.starts_at)}
                        {event.location ? ` · ${event.location}` : ""}
                        {fee ? ` · ${fee}` : ""}
                      </p>
                      {event.summary ? (
                        <p className="mt-3 line-clamp-3 text-muted">
                          {event.summary}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={
                        open
                          ? `/events/${event.slug}/register`
                          : `/events/${event.slug}`
                      }
                      className="motion-press inline-flex min-h-11 w-full shrink-0 items-center justify-center bg-deep px-5 text-center text-sm font-medium text-white sm:w-auto"
                    >
                      {open ? "Register" : "Details"}
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!loadFailed && past.length > 0 ? (
          <section className="mt-20">
            <h2 className="font-display text-2xl text-muted">Past</h2>
            <ul className="mt-6 space-y-3 text-sm text-muted">
              {past.map((event) => (
                <li key={event.id} className="min-w-0">
                  <Link
                    href={`/events/${event.slug}`}
                    className="break-words hover:text-ink"
                  >
                    {event.title} — {formatEventDate(event.starts_at)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}
