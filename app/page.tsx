import Link from "next/link"
import { HeroPhoto } from "@/components/hero-photo"
import { NextEventCountdown } from "@/components/next-event-countdown"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import {
  formatEventDate,
  getNextUpcomingEvent,
  listPublishedEvents,
} from "@/lib/events"

export const dynamic = "force-dynamic"

function startsAtIso(startsAt: string): string {
  if (startsAt.includes("T")) return startsAt
  return `${startsAt.replace(" ", "T")}Z`
}

export default async function HomePage() {
  let upcoming: Awaited<ReturnType<typeof listPublishedEvents>> = []
  let next: Awaited<ReturnType<typeof getNextUpcomingEvent>> = null
  let loadFailed = false
  try {
    const [listed, soonest] = await Promise.all([
      listPublishedEvents(),
      getNextUpcomingEvent(),
    ])
    upcoming = listed.slice(0, 3)
    next = soonest
  } catch {
    loadFailed = true
  }

  return (
    <div className="flex min-h-screen flex-col">
      <section
        data-home-hero
        className="relative min-h-[100svh] overflow-hidden bg-deep text-on-deep [contain:layout_paint]"
      >
        <HeroPhoto />
        {/* Bottom wash only — keep face (upper third) clear of the fog veil */}
        <div
          className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-deep from-25% via-deep/75 to-transparent"
          aria-hidden="true"
        />
        <SiteHeader />
        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-[max(4rem,env(safe-area-inset-bottom))] pt-36 sm:px-6 md:px-8 md:pb-24">
          <h1
            className="hero-enter max-w-3xl font-display text-on-deep"
            data-enter="0"
          >
            Joy that still moves mountains
          </h1>
          <p
            className="hero-enter on-dark mt-5 max-w-xl text-base text-on-deep-muted sm:text-lg"
            data-enter="1"
          >
            We gather people, host events, and keep spreading the light Maddy
            carried so fiercely.
          </p>
          <div
            className="hero-enter mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap"
            data-enter="2"
          >
            <Link
              href="/events"
              className="motion-press inline-flex min-h-11 items-center justify-center bg-accent px-6 py-3 text-center text-sm font-medium text-accent-ink"
            >
              Upcoming events
            </Link>
            <Link
              href="/story"
              className="motion-press inline-flex min-h-11 items-center justify-center border border-on-deep-border px-6 py-3 text-center text-sm font-medium text-on-deep hover:bg-on-deep-hover"
            >
              Her Story
            </Link>
          </div>
        </div>
      </section>

      <main id="main">
      <section className="mx-auto w-full max-w-6xl px-5 py-[3.7rem] sm:px-6 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display">Our purpose</h2>
          <p className="mx-auto mt-4 max-w-[40rem] text-lg text-muted text-pretty">
            Continue to spread joy and light to others in their darkest moments —
            the same heart Maddy showed while fighting her own battles.
          </p>
          <div className="mt-[1.65rem] flex flex-wrap justify-center gap-x-6 gap-y-1">
            <Link
              href="/donate"
              className="inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline decoration-accent/70 underline-offset-4"
            >
              Give in her honor →
            </Link>
            <Link
              href="/story"
              className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline decoration-line underline-offset-4 hover:text-ink"
            >
              Read Maddy&apos;s story →
            </Link>
          </div>
        </div>
        <div className="mt-12 -mx-5 bg-accent-soft/40 px-5 py-10 sm:-mx-6 sm:px-6 md:mx-0 md:px-8">
          <blockquote className="prose-measure mx-auto max-w-3xl text-center font-display text-2xl leading-snug text-ink">
            And we know that in all things God works for the good of those who
            love Him…
            <cite className="mt-4 block font-sans text-sm font-medium not-italic text-muted">
              Romans 8:28
            </cite>
          </blockquote>
        </div>
      </section>

      {next ? (
        <section
          className="border-b border-line bg-surface"
          aria-label="Countdown to the next event"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 md:px-8 md:py-20">
            <NextEventCountdown
              targetIso={startsAtIso(next.starts_at)}
              title={next.title}
              href={`/events/${next.slug}`}
              layout="featured"
            />
          </div>
        </section>
      ) : null}

      <section className="border-y border-line bg-accent-soft/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 md:px-8 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display">Events</h2>
            <Link
              href="/events"
              className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-muted hover:text-ink"
            >
              View all
            </Link>
          </div>
          {loadFailed ? (
            <p className="mt-8 max-w-lg text-sm text-muted" role="status">
              Event listings are temporarily unavailable.{" "}
              <Link href="/events" className="font-medium text-accent-ink underline underline-offset-4">
                Try the events page
              </Link>
              .
            </p>
          ) : upcoming.length === 0 ? (
            <p className="mt-8 max-w-lg text-muted">
              New gatherings are on the way. Check back soon — or follow along as
              we open registration for the next event.
            </p>
          ) : (
            <ul className="mt-10 divide-y divide-line">
              {upcoming.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.slug}`}
                    className="group flex flex-col gap-2 py-6 transition md:flex-row md:items-baseline md:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="break-words font-display text-2xl group-hover:text-accent-ink">
                        {event.title}
                      </h3>
                      {event.summary ? (
                        <p className="mt-1 line-clamp-2 text-muted">{event.summary}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-medium text-muted">
                      {formatEventDate(event.starts_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </main>

      <SiteFooter />
    </div>
  )
}
