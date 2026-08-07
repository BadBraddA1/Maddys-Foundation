import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SponsorPayClient } from "@/components/sponsor-pay-client"
import {
  ensureSponsorPaymentColumns,
  getSponsorByPayToken,
} from "@/lib/sponsors"
import { stripeConfigured } from "@/lib/stripe"

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string; canceled?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  await ensureSponsorPaymentColumns().catch(() => undefined)
  const sponsor = await getSponsorByPayToken(token)
  return {
    title: sponsor ? `Pay — ${sponsor.name}` : "Sponsorship payment",
    robots: { index: false, follow: false },
  }
}

export default async function SponsorPayPage({ params, searchParams }: Props) {
  const { token } = await params
  const q = await searchParams
  await ensureSponsorPaymentColumns().catch(() => undefined)
  const sponsor = await getSponsorByPayToken(token)
  if (!sponsor) notFound()

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <SponsorPayClient
        token={sponsor.pay_token}
        name={sponsor.name}
        amountCents={sponsor.amount_cents}
        alreadyPaid={sponsor.payment_status === "paid"}
        paidFlag={q.paid === "1"}
        canceledFlag={q.canceled === "1"}
        stripeReady={stripeConfigured()}
      />
    </div>
  )
}
