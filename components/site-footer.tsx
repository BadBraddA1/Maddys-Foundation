import Image from "next/image"
import Link from "next/link"
import { contactEmail, siteName, siteUrl } from "@/lib/site-metadata"

const exploreLinks = [
  { href: "/story", label: "Her Story" },
  { href: "/events", label: "Events" },
  { href: "/donate", label: "Donate" },
]

const utilityLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/admin", label: "Staff" },
]

export function SiteFooter() {
  const host = new URL(siteUrl).host

  return (
    <footer className="mt-auto border-t border-line bg-deep text-on-deep pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8 md:px-8">
        <div className="flex items-start gap-4">
          <Image
            src="/brand/logo-96.webp"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full bg-surface object-cover"
          />
          <div>
            <p className="font-display text-xl">{siteName}</p>
            <p className="mt-2 max-w-sm text-sm text-on-deep-muted">
              Continuing to spread joy and light — in Maddy&apos;s spirit.
            </p>
            {contactEmail ? (
              <a
                href={`mailto:${contactEmail}`}
                className="mt-4 inline-flex min-h-11 items-center text-sm text-on-deep-muted underline underline-offset-4 hover:text-on-deep"
              >
                {contactEmail}
              </a>
            ) : null}
          </div>
        </div>

        <nav aria-label="Explore">
          <p className="text-sm font-medium text-on-deep">Explore</p>
          <ul className="mt-3 flex flex-col gap-1">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-sm text-on-deep-muted hover:text-on-deep"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Site">
          <p className="text-sm font-medium text-on-deep">Site</p>
          <ul className="mt-3 flex flex-col gap-1">
            {utilityLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-sm text-on-deep-muted hover:text-on-deep"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-on-deep-border px-5 py-4 text-center text-sm text-on-deep-faint sm:px-6 md:px-8">
        © {new Date().getFullYear()} {siteName} · {host}
      </div>
    </footer>
  )
}
