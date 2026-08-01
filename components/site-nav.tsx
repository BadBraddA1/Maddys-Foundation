import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"

const links = [
  { href: "/story", label: "Her Story" },
  { href: "/events", label: "Events" },
  { href: "/donate", label: "Donate" },
]

export function BrandMark({
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
      {/* Plain img: already tiny WebP — skip /_next/image and never priority (LCP is the hero). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-96.webp"
        alt="Madalyn Robinson Foundation"
        width={44}
        height={44}
        decoding="async"
        className={`h-11 w-11 shrink-0 rounded-full bg-surface object-cover ring-1 ${ring}`}
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

export function PrimaryNav({
  tone,
}: {
  tone: "light" | "dark"
}) {
  const desktopLink =
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

      <MobileNav tone={tone} />
    </nav>
  )
}
