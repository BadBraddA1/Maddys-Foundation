import type { Metadata } from "next"
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
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <h1 className="font-display">
          Every gift matters
        </h1>
        <p className="prose-measure mt-6 text-lg leading-relaxed text-muted">
          We are so grateful for generous hearts. Your support helps us host
          gatherings, walk with families, and keep Maddy&apos;s joy moving in the
          world. You can give through Venmo — every gift matters.
        </p>

        <a
          href={donateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 motion-press inline-flex min-h-11 w-full items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink sm:w-auto"
        >
          Donate with Venmo
        </a>
      </main>
      <SiteFooter />
    </div>
  )
}
