import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeaderSolid />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-24 md:px-8">
        <h1 className="font-display">Page not found</h1>
        <p className="mt-4 text-lg text-muted">
          That link doesn&apos;t lead anywhere — let&apos;s get you back to the
          light.
        </p>
        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="motion-press btn-deep inline-flex min-h-11 flex-1 items-center justify-center px-6 text-sm font-medium"
          >
            Home
          </Link>
          <Link
            href="/events"
            className="motion-press inline-flex min-h-11 flex-1 items-center justify-center border border-line px-6 text-sm font-medium text-ink hover:bg-surface"
          >
            Events
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
