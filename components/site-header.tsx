import Image from "next/image"
import Link from "next/link"
import { NextEventCountdown } from "@/components/next-event-countdown"
import { SkipLink } from "@/components/skip-link"
import { getNextUpcomingEvent } from "@/lib/events"

/** Turso stores UTC-ish `YYYY-MM-DD HH:MM:SS` — normalize for Date parsing. */
function startsAtIso(startsAt: string): string {
  if (startsAt.includes("T")) return startsAt
  return `${startsAt.replace(" ", "T")}Z`
}

const links = [
  { href: "/story", label: "Her Story" },
  { href: "/events", label: "Events" },
  { href: "/donate", label: "Donate" },
]

function BrandMark({
  tone,
}: {
  tone: "light" | "dark"
}) {
  const text = tone === "light" ? "text-on-deep" : "text-ink"
  const sub = tone === "light" ? "text-on-deep-muted" : "text-muted"
  const ring = tone === "light" ? "ring-on-deep-border" : "ring-line"

  return (
    <Link
      href="/"
      className={`flex min-h-11 items-center gap-2.5 sm:gap-3 ${text}`}
    >
      <Image
        src="/brand/logo-96.webp"
        alt="Madalyn Robinson Foundation"
        width={44}
        height={44}
        className={`h-11 w-11 shrink-0 rounded-full bg-surface object-cover ring-1 ${ring}`}
        priority
      />
      <span className="min-w-0 font-display text-base leading-tight tracking-tight sm:text-lg md:text-xl">
        <span className="sm:hidden">Maddy&apos;s</span>
        <span className="hidden sm:inline">Madalyn Robinson</span>
        <span className={`mt-0.5 block font-sans text-sm font-normal leading-snug ${sub}`}>
          Foundation
        </span>
      </span>
    </Link>
  )
}

function PrimaryNav({
  tone,
}: {
  tone: "light" | "dark"
}) {
  const desktopLink =
    tone === "light"
      ? "text-on-deep hover:bg-on-deep-hover"
      : "text-ink hover:bg-bg"

  const panel =
    tone === "light"
      ? "border-on-deep-border bg-deep text-on-deep"
      : "border-line bg-surface text-ink"

  const mobileLink =
    tone === "light"
      ? "text-on-deep hover:bg-on-deep-hover"
      : "text-ink hover:bg-bg"

  return (
    <nav aria-label="Primary">
      <ul className="hidden items-center gap-1 md:flex">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`inline-flex min-h-11 items-center px-4 text-sm font-medium transition ${desktopLink}`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <details className="relative md:hidden">
        <summary
          className={`flex h-11 w-11 cursor-pointer list-none items-center justify-center border text-sm font-medium transition [&::-webkit-details-marker]:hidden ${
            tone === "light"
              ? "border-on-deep-border bg-deep/80 text-on-deep"
              : "border-line bg-surface text-ink"
          }`}
        >
          <span className="sr-only">Menu</span>
          <span aria-hidden="true" className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
          </span>
        </summary>
        <ul
          className={`nav-panel-enter absolute right-0 z-[var(--z-dropdown)] mt-2 min-w-[12.5rem] border py-1 ${panel}`}
        >
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex min-h-11 items-center px-4 text-base font-medium ${mobileLink}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  )
}

/** Overlay header for the photo hero — sits on a deep scrim so contrast holds. */
export function SiteHeader() {
  return (
    <>
      <SkipLink />
      <header className="absolute inset-x-0 top-0 z-[var(--z-sticky)] pt-[env(safe-area-inset-top)]">
      <div className="bg-gradient-to-b from-deep/75 from-30% via-deep/35 to-transparent pb-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 md:px-8 md:py-4">
          <BrandMark tone="light" />
          <PrimaryNav tone="light" />
        </div>
      </div>
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
