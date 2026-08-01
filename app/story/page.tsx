import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"
import { getNextUpcomingEvent } from "@/lib/events"

export const metadata: Metadata = {
  title: "Her Story",
  description:
    "Maddy was a spirited junior at Herculaneum High — her competitive spirit, love of sports, and creativity still gather people in her name.",
}

export const revalidate = 60

export default async function StoryPage() {
  const nextEvent = await getNextUpcomingEvent().catch(() => null)
  const eventHref = nextEvent ? `/events/${nextEvent.slug}` : "/events"
  const eventCta = nextEvent ? "Join the scramble" : "See events"

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeaderSolid />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative z-10 min-w-0">
            <h1 className="font-display">Maddy&apos;s light</h1>
            <div className="prose-measure mt-8 space-y-5 text-lg leading-relaxed text-muted">
              <p>
                Maddy was a spirited junior at Herculaneum High, known for her
                competitive nature, love of sports, and vibrant creativity.
                Whether running track, playing basketball, or dancing with her
                sister Lydia, she brought joy and energy to everything she did.
                Her fun-loving personality and zest for life left a lasting
                impression on everyone who knew her.
              </p>
              <p>
                Join us for a fun day on the green to support a meaningful
                cause! All proceeds go to support the Madalyn Robinson
                Foundation.
              </p>
            </div>
            <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row">
              <Link
                href={eventHref}
                className="motion-press relative z-10 inline-flex min-h-11 items-center justify-center bg-accent px-6 text-sm font-medium text-accent-ink"
              >
                {eventCta}
              </Link>
              <Link
                href="/donate"
                className="motion-press relative z-10 inline-flex min-h-11 items-center justify-center border border-line px-6 text-sm font-medium text-ink hover:bg-surface"
              >
                Donate
              </Link>
            </div>
          </div>
          <div className="relative order-first aspect-[4/5] overflow-hidden bg-deep lg:order-none">
            <Image
              src="/brand/maddy-960.webp"
              alt="Madalyn Robinson smiling outdoors"
              fill
              className="object-cover object-[center_top]"
              sizes="(max-width: 1024px) 100vw, 40vw"
              // Leads the viewport on phones (`order-first`); don't lazy LCP.
              priority
            />
          </div>
        </div>

        <section className="mt-24 max-w-3xl border-t border-line pt-12">
          <h2 className="font-display">Our purpose</h2>
          <p className="prose-measure mt-4 text-lg leading-relaxed text-muted">
            Dedicated to presenting scholarships to one (1) graduating senior
            from Herculaneum and DeSoto High Schools, as well as other community
            service opportunities the Board of Directors deem appropriate.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
