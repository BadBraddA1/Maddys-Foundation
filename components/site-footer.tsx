import Image from "next/image"
import Link from "next/link"
import { siteName, siteUrl } from "@/lib/site-metadata"

export function SiteFooter() {
  const host = new URL(siteUrl).host

  return (
    <footer className="mt-auto border-t border-line bg-deep text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="flex items-start gap-4">
          <Image
            src="/brand/logo.jpg"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-full bg-white object-cover"
          />
          <div>
            <p className="font-display text-xl">{siteName}</p>
            <p className="mt-2 max-w-sm text-sm text-white/70">
              Continuing to spread joy and light — in Maddy&apos;s spirit.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
          <Link href="/story" className="hover:text-white">
            Her Story
          </Link>
          <Link href="/events" className="hover:text-white">
            Events
          </Link>
          <Link href="/donate" className="hover:text-white">
            Donate
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/admin" className="hover:text-white">
            Staff
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-center text-xs text-white/50 md:px-8">
        © {new Date().getFullYear()} {siteName} · {host}
      </div>
    </footer>
  )
}
