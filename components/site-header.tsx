import Image from "next/image"
import Link from "next/link"

const links = [
  { href: "/story", label: "Her Story" },
  { href: "/events", label: "Events" },
  { href: "/donate", label: "Donate" },
]

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image
            src="/brand/logo.jpg"
            alt="Madalyn Robinson Foundation"
            width={48}
            height={48}
            className="h-12 w-12 rounded-full bg-white object-cover ring-2 ring-white/80"
            priority
          />
          <span className="font-display text-lg tracking-tight md:text-xl">
            Madalyn Robinson
            <span className="block text-xs font-sans font-medium uppercase tracking-[0.18em] text-white/80">
              Foundation
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-white/90 md:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 transition hover:bg-white/15 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

export function SiteHeaderSolid() {
  return (
    <header className="border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3 text-ink">
          <Image
            src="/brand/logo.jpg"
            alt="Madalyn Robinson Foundation"
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover"
          />
          <span className="font-display text-lg tracking-tight">
            Madalyn Robinson Foundation
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-muted md:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 transition hover:bg-bg hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
