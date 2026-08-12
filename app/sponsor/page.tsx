import type { Metadata } from "next"
import Link from "next/link"
import { SiteHeaderSolid } from "@/components/site-header"
import { SponsorOnboardForm } from "@/components/sponsor-onboard-form"
import { dropUnpaidPublicSponsor, listPackageAvailability } from "@/lib/sponsor-hold"
import { siteName } from "@/lib/site-metadata"
import { stripeConfigured } from "@/lib/stripe"
import { ensureSponsorPaymentColumns } from "@/lib/sponsors"
import { CHECKOUT_HOLD_MINUTES } from "@/lib/sponsor-hold-shared"

export const revalidate = 30

export const metadata: Metadata = {
  title: "Become a sponsor",
  description: `Sponsor the Oak Valley Golf Scramble and support ${siteName}.`,
}

type Props = {
  searchParams: Promise<{ canceled?: string; session_id?: string }>
}

export default async function SponsorPage({ searchParams }: Props) {
  await ensureSponsorPaymentColumns().catch(() => undefined)
  const query = await searchParams
  const canceled = query.canceled === "1"
  const sessionId = query.session_id?.trim()

  if (canceled && sessionId) {
    await dropUnpaidPublicSponsor({ checkoutSessionId: sessionId }).catch(
      () => undefined,
    )
  }

  const packages = await listPackageAvailability().catch(() => [])
  const stripeReady = stripeConfigured()

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSolid />
      <main
        id="main"
        className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 md:px-8 md:py-24"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink"
        >
          ← Home
        </Link>
        <h1 className="mt-6 font-display text-4xl tracking-tight text-ink md:text-5xl">
          Become a sponsor
        </h1>
        <p className="mt-4 max-w-prose text-ink/75">
          Support the Oak Valley Golf Scramble and Madalyn’s Foundation. Choose a
          package below — we’ll hold it for {CHECKOUT_HOLD_MINUTES} minutes while
          you pay. After checkout, you’ll add your logo, website, and point of
          contact for the site.
        </p>

        <div className="mt-12">
          {packages.length === 0 ? (
            <p className="text-sm text-muted">
              Sponsorship packages are unavailable right now. Please try again
              later.
            </p>
          ) : (
            <SponsorOnboardForm
              packages={packages}
              stripeReady={stripeReady}
              canceled={canceled}
            />
          )}
        </div>
      </main>
    </div>
  )
}
