import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SiteHeaderSolid } from "@/components/site-header"
import { SponsorCompleteForm } from "@/components/sponsor-complete-form"
import { r2Configured } from "@/lib/r2"
import {
  ensureSponsorPaymentColumns,
  getSponsorByPayToken,
} from "@/lib/sponsors"

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string; session_id?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  await ensureSponsorPaymentColumns().catch(() => undefined)
  const sponsor = await getSponsorByPayToken(token).catch(() => null)
  return {
    title: sponsor ? `Finish profile — ${sponsor.name}` : "Finish sponsorship",
    robots: { index: false, follow: false },
  }
}

export default async function SponsorCompletePage({
  params,
  searchParams,
}: Props) {
  const { token } = await params
  const query = await searchParams
  await ensureSponsorPaymentColumns().catch(() => undefined)
  const sponsor = await getSponsorByPayToken(token).catch(() => null)
  if (!sponsor) notFound()

  if (sponsor.payment_status !== "paid") {
    return (
      <div className="flex flex-1 flex-col">
        <SiteHeaderSolid />
        <main
          id="main"
          className="mx-auto w-full max-w-lg flex-1 px-5 py-16 md:px-8 md:py-24"
        >
          <h1 className="font-display text-3xl text-ink">Payment required</h1>
          <p className="mt-3 text-sm text-muted">
            Finish paying for your sponsorship before adding your logo.
          </p>
          <Link
            href="/sponsor"
            className="motion-press mt-6 inline-flex min-h-11 items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink"
          >
            Back to sponsorships
          </Link>
        </main>
      </div>
    )
  }

  const alreadyComplete =
    sponsor.is_published === 1 && Boolean(sponsor.logo_url.trim())

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSolid />
      <main
        id="main"
        className="mx-auto w-full max-w-lg flex-1 px-5 py-16 md:px-8 md:py-24"
      >
        <SponsorCompleteForm
          token={sponsor.pay_token}
          name={sponsor.name}
          levelLabel={sponsor.level_label}
          amountCents={sponsor.amount_cents}
          contactEmail={sponsor.contact_email}
          alreadyComplete={alreadyComplete}
          paidFlag={query.paid === "1"}
          uploadReady={r2Configured()}
        />
      </main>
    </div>
  )
}
