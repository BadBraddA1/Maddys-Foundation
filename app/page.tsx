import Link from "next/link"
import { HeroPhoto } from "@/components/hero-photo"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { formatEventDate, listPublishedEvents } from "@/lib/events"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  let upcoming: Awaited<ReturnType<typeof listPublishedEvents>> = []
  let loadFailed = false
  try {
    upcoming = (await listPublishedEvents()).slice(0, 3)
  } catch {
    loadFailed = true
  }

  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative min-h-[100svh] overflow-hidden bg-deep text-on-deep [contain:layout_paint]">
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
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 md:px-8 md:py-20">
        <div className="prose-measure max-w-2xl">
          <h2 className="font-display">Our purpose</h2>
          <p className="mt-4 text-muted text-lg">
            Continue to spread joy and light to others in their darkest moments —
            the same heart Maddy showed while fighting her own battles.
          </p>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <blockquote className="border-t border-line pt-6 font-display text-2xl leading-snug text-ink md:text-3xl">
            And we know that in all things God works for the good of those who
            love Him…
            <cite className="mt-4 block font-sans text-sm font-medium not-italic text-muted">
              Romans 8:28
            </cite>
          </blockquote>
          <div className="flex flex-col justify-end gap-1">
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
      </section>

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
