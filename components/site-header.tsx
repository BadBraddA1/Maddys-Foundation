import { HeroHeaderChrome } from "@/components/hero-header-chrome"
import { NextEventCountdown } from "@/components/next-event-countdown"
import { BrandMark, PrimaryNav } from "@/components/site-nav"
import { SkipLink } from "@/components/skip-link"
import { getNextUpcomingEvent } from "@/lib/events"

/** Turso stores UTC-ish `YYYY-MM-DD HH:MM:SS` — normalize for Date parsing. */
function startsAtIso(startsAt: string): string {
  if (startsAt.includes("T")) return startsAt
  return `${startsAt.replace(" ", "T")}Z`
}

/** Overlay header for the photo hero — animates in, then sticky glass after scroll. */
export function SiteHeader() {
  return (
    <>
      <SkipLink />
      <header className="absolute inset-x-0 top-0 z-[var(--z-sticky)] pt-[env(safe-area-inset-top)]">
        <HeroHeaderChrome motion="glass" />
      </header>
    </>
  )
}

/** Solid header for interior pages — brand | next-event countdown | nav. */
export async function SiteHeaderSolid() {
  const next = await getNextUpcomingEvent()

  return (
    <>
      <SkipLink />
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="site-header-solid mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-3 sm:px-6 md:px-8">
          <div className="justify-self-start">
            <BrandMark tone="dark" />
          </div>
          {next ? (
            <NextEventCountdown
              targetIso={startsAtIso(next.starts_at)}
              title={next.title}
              href={`/events/${next.slug}`}
              layout="days"
            />
          ) : (
            <span className="min-h-11" aria-hidden="true" />
          )}
          <div className="justify-self-end">
            <PrimaryNav tone="dark" />
          </div>
        </div>
      </header>
    </>
  )
}
