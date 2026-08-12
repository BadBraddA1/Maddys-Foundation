import { NextResponse } from "next/server"
import { dropUnpaidPublicSponsor, ensureSponsorHoldSchema } from "@/lib/sponsor-hold"
import { getSponsorByPayToken, ensureSponsorPaymentColumns } from "@/lib/sponsors"
import { getStripe, stripeConfigured } from "@/lib/stripe"

export const runtime = "nodejs"

/** Cancel an unpaid public sponsorship before payment completes. */
export async function POST(req: Request) {
  await ensureSponsorPaymentColumns().catch(() => undefined)
  await ensureSponsorHoldSchema().catch(() => undefined)

  const body = (await req.json().catch(() => null)) as {
    payToken?: string
  } | null
  const payToken = String(body?.payToken ?? "").trim()
  if (!payToken) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 })
  }

  const sponsor = await getSponsorByPayToken(payToken)
  if (!sponsor) {
    return NextResponse.json({ ok: true, released: false })
  }
  if (sponsor.payment_status === "paid" || sponsor.source !== "public") {
    return NextResponse.json({ error: "Cannot cancel this sponsorship." }, { status: 400 })
  }

  if (stripeConfigured() && sponsor.stripe_checkout_session_id) {
    try {
      await getStripe().checkout.sessions.expire(
        sponsor.stripe_checkout_session_id,
      )
    } catch {
      // already expired/completed
    }
  }

  const released = await dropUnpaidPublicSponsor({
    sponsorId: sponsor.id,
    payToken,
  })
  return NextResponse.json({ ok: true, released })
}
