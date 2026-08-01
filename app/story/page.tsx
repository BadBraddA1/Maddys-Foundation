import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"

export const metadata: Metadata = {
  title: "Maddy's Story",
  description:
    "Madalyn Robinson was an incredible light — her story continues through this foundation.",
}

export default function StoryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeaderSolid />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Her story
            </p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl">
              Maddy&apos;s light
            </h1>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted">
              <p>
                Maddy was the most incredible light to this world and everyone
                she met. While the circumstances of her life were incredibly
                unfair, she moved mountains with her love, grace, and a spirit
                so bright and fierce that nothing felt impossible.
              </p>
              <p>
                Her purpose reached farther than we will ever fully know. She is
                still touching and changing lives every day — through laughter
                remembered, courage shared, and the people who gather in her
                name.
              </p>
              <p>
                This foundation exists to keep spreading that joy: to walk with
                families in hard seasons, to host moments of community, and to
                honor a heart that helped others even while she was fighting her
                own battles.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/events"
                className="rounded-full bg-deep px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Join an event
              </Link>
              <Link
                href="/donate"
                className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface"
              >
                Give
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-deep">
            <Image
              src="/brand/maddy.jpg"
              alt="Madalyn Robinson smiling outdoors"
              fill
              className="object-cover object-[center_15%]"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
            />
          </div>
        </div>

        <section className="mt-24 max-w-3xl border-t border-line pt-12">
          <h2 className="font-display text-3xl">Our vision</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Our single purpose is to continue spreading joy and light to others
            in their darkest moments. Maddy&apos;s heart was to help — and our
            mission is to keep carrying that help here on Earth: through events
            you can join, stories you can share, and generosity that reaches the
            next family who needs it.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
