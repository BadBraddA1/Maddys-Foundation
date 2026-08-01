import Image from "next/image"
import Link from "next/link"

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
  const text = tone === "light" ? "text-white" : "text-ink"
  const sub = tone === "light" ? "text-white/75" : "text-muted"
  const ring = tone === "light" ? "ring-white/70" : "ring-line/80"

  return (
    <Link
      href="/"
      className={`flex min-h-11 items-center gap-2.5 sm:gap-3 ${text}`}
    >
      <Image
        src="/brand/logo.jpg"
        alt="Madalyn Robinson Foundation"
        width={44}
        height={44}
        className={`h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-1 ${ring}`}
        priority
      />
      <span className="min-w-0 font-display text-base leading-tight tracking-tight sm:text-lg md:text-xl">
        <span className="sm:hidden">Maddy&apos;s</span>
        <span className="hidden sm:inline">Madalyn Robinson</span>
        <span className={`mt-0.5 block font-sans text-xs font-normal ${sub}`}>
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
      ? "text-white hover:bg-white/15"
      : "text-ink hover:bg-bg"

  const panel =
    tone === "light"
      ? "border-white/15 bg-deep text-white"
      : "border-line bg-surface text-ink"

  const mobileLink =
    tone === "light"
      ? "text-white hover:bg-white/10"
      : "text-ink hover:bg-bg"

  return (
    <nav aria-label="Primary">
      {/* Desktop / tablet horizontal */}
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

      {/* Phone: disclosure menu — no hover dependency */}
      <details className="relative md:hidden">
        <summary
          className={`flex h-11 w-11 cursor-pointer list-none items-center justify-center border text-sm font-semibold transition [&::-webkit-details-marker]:hidden ${
            tone === "light"
              ? "border-white/40 bg-deep/80 text-white"
              : "border-line bg-surface text-ink"
          }`}
        >
          <span className="sr-only">Open menu</span>
          <span aria-hidden="true" className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
          </span>
        </summary>
        <ul
          className={`nav-panel-enter absolute right-0 z-50 mt-2 min-w-[12.5rem] border py-1 ${panel}`}
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
    <header className="absolute inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="bg-gradient-to-b from-deep from-40% via-deep/85 to-transparent pb-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 md:px-8 md:py-4">
          <BrandMark tone="light" />
          <PrimaryNav tone="light" />
        </div>
      </div>
    </header>
  )
}

/** Solid header for interior pages. */
export function SiteHeaderSolid() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 md:px-8">
        <BrandMark tone="dark" />
        <PrimaryNav tone="dark" />
      </div>
    </header>
  )
}
