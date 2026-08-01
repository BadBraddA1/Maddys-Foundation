import type { Metadata } from "next"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"
import { donateUrl } from "@/lib/site-metadata"

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support the Madalyn Robinson Foundation — every gift helps spread joy and light.",
}

export default function DonatePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeaderSolid />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Give
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          Every gift matters
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          We are so grateful for generous hearts. Your support helps us host
          gatherings, walk with families, and keep Maddy&apos;s joy moving in the
          world. Tax-deductible details will be listed here once the foundation
          merchant account is connected.
        </p>

        {donateUrl ? (
          <a
            href={donateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex min-h-11 w-full items-center justify-center bg-accent px-8 text-sm font-semibold text-accent-ink transition hover:brightness-105 sm:w-auto"
          >
            Donate now
          </a>
        ) : (
          <div className="mt-10 rounded-sm border border-line bg-surface px-6 py-5">
            <p className="font-medium text-ink">Donation link coming soon</p>
            <p className="mt-2 text-sm text-muted">
              We&apos;re connecting the foundation&apos;s giving account. In the
              meantime, join an event or share Maddy&apos;s story.
            </p>
            <Link
              href="/events"
              className="mt-4 inline-block text-sm font-semibold text-accent-ink underline decoration-accent underline-offset-4"
            >
              See upcoming events →
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
