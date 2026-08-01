import Image from "next/image"
import Link from "next/link"
import { siteName, siteUrl } from "@/lib/site-metadata"

const footerLinks = [
  { href: "/story", label: "Her Story" },
  { href: "/events", label: "Events" },
  { href: "/donate", label: "Donate" },
  { href: "/privacy", label: "Privacy" },
  { href: "/admin", label: "Staff" },
]

export function SiteFooter() {
  const host = new URL(siteUrl).host

  return (
    <footer className="mt-auto border-t border-line bg-deep text-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-6 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="flex items-start gap-4">
          <Image
            src="/brand/logo-96.webp"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full bg-white object-cover"
          />
          <div>
            <p className="font-display text-xl">{siteName}</p>
            <p className="mt-2 max-w-sm text-sm text-white/80">
              Continuing to spread joy and light — in Maddy&apos;s spirit.
            </p>
          </div>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-2">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-sm text-white/85 hover:text-white sm:px-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15 px-5 py-4 text-center text-xs text-white/70 sm:px-6 md:px-8">
        © {new Date().getFullYear()} {siteName} · {host}
      </div>
    </footer>
  )
}
