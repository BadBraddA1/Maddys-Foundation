import type Stripe from "stripe"
import { audit } from "@/lib/events"
import { formatUsdFromCents } from "@/lib/sponsor-levels"
import { SAMPLE_SPONSOR_PAY_TOKEN } from "@/lib/sponsor-emails"
import {
  STRIPE_SESSION_EXPIRE_SECONDS,
  holdExpiresAtUnix,
} from "@/lib/sponsor-hold-shared"
import { dropUnpaidPublicSponsor } from "@/lib/sponsor-hold"
import {
  getSponsor,
  getSponsorByPayToken,
  markSponsorPaid,
  setSponsorStripeSession,
  sponsorNeedsProfile,
  type Sponsor,
} from "@/lib/sponsors"
import { getStripe, publicSiteUrl, stripeConfigured } from "@/lib/stripe"
import { sql } from "@/lib/db"

export async function createSponsorCheckoutSession(opts: {
  sponsor: Sponsor
  holdExpiresAt?: number
}): Promise<{ url: string; sessionId: string; holdExpiresAt: number } | null> {
  const { sponsor } = opts
  if (!stripeConfigured()) return null
  if (sponsor.payment_status === "paid") return null
  if (sponsor.amount_cents <= 0) return null

  const stripe = getStripe()
  const base = publicSiteUrl()
  const holdUntil =
    opts.holdExpiresAt && opts.holdExpiresAt > Math.floor(Date.now() / 1000)
      ? opts.holdExpiresAt
      : holdExpiresAtUnix()

  const isPublic = sponsor.source === "public"
  // Profile is collected before pay — thank-you on /sponsor. Complete page remains a fallback.
  const successPath = isPublic
    ? `/sponsor?paid=1&session_id={CHECKOUT_SESSION_ID}`
    : `/sponsor/pay/${sponsor.pay_token}?paid=1&session_id={CHECKOUT_SESSION_ID}`
  const cancelPath = isPublic
    ? `/sponsor?canceled=1&session_id={CHECKOUT_SESSION_ID}`
    : `/sponsor/pay/${sponsor.pay_token}?canceled=1`

  const packageLabel = sponsor.level_label || "Sponsorship"
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: sponsor.contact_email || undefined,
    client_reference_id: String(sponsor.id),
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: sponsor.amount_cents,
          product_data: {
            name: `${packageLabel} — ${sponsor.name}`,
            description: `Sponsor gift for Madalyn Robinson Foundation (${formatUsdFromCents(sponsor.amount_cents)})`,
          },
        },
      },
    ],
    metadata: {
      kind: "sponsor_payment",
      sponsorId: String(sponsor.id),
      payToken: sponsor.pay_token || "",
      amountCents: String(sponsor.amount_cents),
      packageKey: sponsor.level_key || "",
      source: sponsor.source || "admin",
    },
    success_url: `${base}${successPath}`,
    cancel_url: `${base}${cancelPath}`,
    // Stripe minimum is 30m; we expire the session ourselves at the 10m hold.
    expires_at: Math.floor(Date.now() / 1000) + STRIPE_SESSION_EXPIRE_SECONDS,
  })

  if (!session.url) return null
  await setSponsorStripeSession(sponsor.id, session.id)
  await sql.execute(
    `UPDATE sponsors
     SET hold_expires_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [holdUntil, sponsor.id],
  )
  await audit(
    "stripe",
    "stripe_checkout",
    "sponsor",
    String(sponsor.id),
    `${formatUsdFromCents(sponsor.amount_cents)} · ${session.id}`,
  ).catch(() => undefined)

  return { url: session.url, sessionId: session.id, holdExpiresAt: holdUntil }
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

export async function dropPendingSponsorFromSession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.metadata?.kind !== "sponsor_payment") return
  if (session.metadata?.source !== "public") return
  const sponsorId = Number(
    session.metadata?.sponsorId || session.client_reference_id || 0,
  )
  await dropUnpaidPublicSponsor({
    sponsorId: Number.isFinite(sponsorId) ? sponsorId : undefined,
    checkoutSessionId: session.id,
  })
}

export async function startCheckoutForPayToken(token: string) {
  if (token === SAMPLE_SPONSOR_PAY_TOKEN) {
    return {
      error: "This is a preview pay page — checkout is disabled.",
      status: 400 as const,
    }
  }
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
  return { url: session.url, holdExpiresAt: session.holdExpiresAt }
}

export async function getSponsorForAdminCheckout(id: number) {
  return getSponsor(id)
}

export { sponsorNeedsProfile }
