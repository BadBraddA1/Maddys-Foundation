import Image from "next/image"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { formatEventDate, listPublishedEvents } from "@/lib/events"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  let upcoming: Awaited<ReturnType<typeof listPublishedEvents>> = []
  try {
    upcoming = (await listPublishedEvents()).slice(0, 3)
  } catch {
    upcoming = []
  }

  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative min-h-[100svh] overflow-hidden bg-deep text-white">
        <Image
          src="/brand/maddy.jpg"
          alt="Madalyn Robinson"
          fill
          priority
          className="animate-hero-drift object-cover object-[center_20%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/55 to-deep/25" />
        <SiteHeader />
        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-32 md:px-8 md:pb-24">
          <p className="animate-fade-up text-xs font-medium uppercase tracking-[0.22em] text-accent">
            Madalyn Robinson Foundation
          </p>
          <h1 className="animate-fade-up mt-4 max-w-3xl font-display text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.05] text-white [animation-delay:80ms]">
            Joy that still moves mountains
          </h1>
          <p className="animate-fade-up mt-5 max-w-xl text-lg text-white/85 [animation-delay:140ms]">
            We gather people, host events, and keep spreading the light Maddy
            carried so fiercely.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3 [animation-delay:200ms]">
            <Link
              href="/events"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink transition hover:brightness-105"
            >
              Upcoming events
            </Link>
            <Link
              href="/story"
              className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Her story
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl">Our purpose</h2>
          <p className="mt-4 text-lg text-muted">
            Continue to spread joy and light to others in their darkest moments —
            the same heart Maddy showed while fighting her own battles.
          </p>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <blockquote className="border-t border-line pt-6 font-display text-2xl leading-snug text-ink md:text-3xl">
            And we know that in all things God works for the good of those who
            love Him…
            <cite className="mt-4 block font-sans text-sm font-medium not-italic tracking-wide text-muted">
              Romans 8:28
            </cite>
          </blockquote>
          <div className="flex flex-col justify-end gap-4">
            <Link
              href="/donate"
              className="text-sm font-semibold text-accent-ink underline decoration-accent underline-offset-4"
            >
              Give in her honor →
            </Link>
            <Link
              href="/story"
              className="text-sm font-semibold text-muted underline decoration-line underline-offset-4 hover:text-ink"
            >
              Read Maddy&apos;s story →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl md:text-4xl">Events</h2>
            <Link
              href="/events"
              className="text-sm font-semibold text-muted hover:text-ink"
            >
              View all
            </Link>
          </div>
          {upcoming.length === 0 ? (
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
                    <div>
                      <h3 className="font-display text-2xl group-hover:text-accent-ink">
                        {event.title}
                      </h3>
                      {event.summary ? (
                        <p className="mt-1 text-muted">{event.summary}</p>
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

      <SiteFooter />
    </div>
  )
}
