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
  searchParams: Promise<{
    canceled?: string
    paid?: string
    session_id?: string
  }>
}

export default async function SponsorPage({ searchParams }: Props) {
  await ensureSponsorPaymentColumns().catch(() => undefined)
  const query = await searchParams
  const canceled = query.canceled === "1"
  const paid = query.paid === "1"
  const sessionId = query.session_id?.trim()

  if (canceled && sessionId) {
    await dropUnpaidPublicSponsor({ checkoutSessionId: sessionId }).catch(
      () => undefined,
    )
  }

  const packages = await listPackageAvailability().catch(() => [])
  const stripeReady =
    stripeConfigured() &&
    Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim())

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

        {paid ? (
          <div
            className="mt-6 border border-success/30 bg-success/5 px-6 py-8"
            role="status"
          >
            <h1 className="font-display text-3xl text-ink">Thank you</h1>
            <p className="mt-3 text-sm text-ink/75">
              Your sponsorship payment is confirmed
              {sessionId ? " (finalizing now)" : ""}. Your logo publishes on the
              foundation site automatically.
            </p>
            <Link
              href="/"
              className="motion-press mt-6 inline-flex min-h-11 items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-6 font-display text-4xl tracking-tight text-ink md:text-5xl">
              Become a sponsor
            </h1>
            <p className="mt-4 max-w-prose text-ink/75">
              Support the Oak Valley Golf Scramble and Madalyn’s Foundation.
              Choose a package — we’ll hold it for {CHECKOUT_HOLD_MINUTES}{" "}
              minutes while you enter your details and pay on this page. Your
              logo goes live after checkout.
            </p>

            <div className="mt-12">
              {packages.length === 0 ? (
                <p className="text-sm text-muted">
                  Sponsorship packages are unavailable right now. Please try
                  again later.
                </p>
              ) : (
                <SponsorOnboardForm
                  packages={packages}
                  stripeReady={stripeReady}
                  canceled={canceled}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
