import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SponsorPayClient } from "@/components/sponsor-pay-client"
import {
  SAMPLE_SPONSOR_PAY_TOKEN,
  sampleSponsorForEmail,
} from "@/lib/sponsor-emails"
import {
  ensureSponsorPaymentColumns,
  getSponsorByPayToken,
} from "@/lib/sponsors"
import { stripeConfigured } from "@/lib/stripe"

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string; canceled?: string }>
}

async function resolveSponsor(token: string) {
  if (token === SAMPLE_SPONSOR_PAY_TOKEN) {
    return { sponsor: sampleSponsorForEmail(), preview: true as const }
  }
  await ensureSponsorPaymentColumns().catch(() => undefined)
  const sponsor = await getSponsorByPayToken(token)
  return sponsor
    ? { sponsor, preview: false as const }
    : { sponsor: null, preview: false as const }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const { sponsor, preview } = await resolveSponsor(token)
  return {
    title: sponsor
      ? preview
        ? `Pay preview — ${sponsor.name}`
        : `Pay — ${sponsor.name}`
      : "Sponsorship payment",
    robots: { index: false, follow: false },
  }
}

export default async function SponsorPayPage({ params, searchParams }: Props) {
  const { token } = await params
  const q = await searchParams
  const { sponsor, preview } = await resolveSponsor(token)
  if (!sponsor) notFound()

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      {preview ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
          Preview only — sample sponsor from email tests. Checkout is disabled.
          {" "}
          <a
            href={`/sponsor/pay/${SAMPLE_SPONSOR_PAY_TOKEN}?paid=1`}
            className="font-semibold underline underline-offset-2"
          >
            See thank-you state
          </a>
        </p>
      ) : null}
      <SponsorPayClient
        token={sponsor.pay_token}
        name={sponsor.name}
        amountCents={sponsor.amount_cents}
        alreadyPaid={sponsor.payment_status === "paid"}
        paidFlag={q.paid === "1"}
        canceledFlag={q.canceled === "1"}
        stripeReady={stripeConfigured()}
        preview={preview}
      />
    </div>
  )
}
