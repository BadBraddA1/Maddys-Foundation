import type Stripe from "stripe"
import { audit } from "@/lib/events"
import {
  formatUsdFromCents,
  getSponsorLevel,
} from "@/lib/sponsor-levels"
import {
  getSponsor,
  getSponsorByPayToken,
  markSponsorPaid,
  setSponsorStripeSession,
  type Sponsor,
} from "@/lib/sponsors"
import { getStripe, publicSiteUrl, stripeConfigured } from "@/lib/stripe"

export async function createSponsorCheckoutSession(opts: {
  sponsor: Sponsor
}): Promise<{ url: string; sessionId: string } | null> {
  const { sponsor } = opts
  if (!stripeConfigured()) return null
  if (sponsor.payment_status === "paid") return null
  if (sponsor.amount_cents <= 0) return null

  const stripe = getStripe()
  const base = publicSiteUrl()
  const level =
    sponsor.level_label ||
    getSponsorLevel(sponsor.level_key)?.label ||
    "Sponsorship"

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: sponsor.contact_email || undefined,
    client_reference_id: String(sponsor.id),
    // Card always; Venmo appears when enabled on the Stripe account (US).
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: sponsor.amount_cents,
          product_data: {
            name: `${level} — ${sponsor.name}`,
            description: `Sponsorship for Madalyn Robinson Foundation (${formatUsdFromCents(sponsor.amount_cents)})`,
          },
        },
      },
    ],
    metadata: {
      kind: "sponsor_payment",
      sponsorId: String(sponsor.id),
      payToken: sponsor.pay_token || "",
      amountCents: String(sponsor.amount_cents),
      levelKey: sponsor.level_key || "",
    },
    success_url: `${base}/sponsor/pay/${sponsor.pay_token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/sponsor/pay/${sponsor.pay_token}?canceled=1`,
  })

  if (!session.url) return null
  await setSponsorStripeSession(sponsor.id, session.id)
  await audit(
    "stripe",
    "stripe_checkout",
    "sponsor",
    String(sponsor.id),
    `${formatUsdFromCents(sponsor.amount_cents)} · ${session.id}`,
  ).catch(() => undefined)

  return { url: session.url, sessionId: session.id }
}

export async function confirmSponsorFromCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return
  }
  if (session.metadata?.kind !== "sponsor_payment") {
    return
  }

  const sponsorId = Number(
    session.metadata?.sponsorId || session.client_reference_id || 0,
  )
  if (!Number.isFinite(sponsorId) || sponsorId <= 0) {
    console.error("[stripe] sponsor missing id", session.id)
    return
  }

  const updated = await markSponsorPaid(sponsorId, {
    stripeSessionId: session.id,
    via: "stripe",
  })
  if (!updated) return

  await audit(
    "stripe",
    "stripe_paid",
    "sponsor",
    String(sponsorId),
    session.id,
  ).catch(() => undefined)

  try {
    const { sendSponsorPaidThanks } = await import("@/lib/sponsor-emails")
    await sendSponsorPaidThanks(updated)
  } catch (err) {
    console.error("[stripe] sponsor thanks email", err)
  }
}

export async function startCheckoutForPayToken(token: string) {
  const sponsor = await getSponsorByPayToken(token)
  if (!sponsor) return { error: "Pay link not found.", status: 404 as const }
  if (sponsor.payment_status === "paid") {
    return { error: "This sponsorship is already paid.", status: 400 as const }
  }
  if (sponsor.amount_cents <= 0) {
    return { error: "No amount due on this link.", status: 400 as const }
  }
  const session = await createSponsorCheckoutSession({ sponsor })
  if (!session) {
    return {
      error: "Card checkout is not available right now.",
      status: 503 as const,
    }
  }
  return { url: session.url }
}

export async function getSponsorForAdminCheckout(id: number) {
  return getSponsor(id)
}
