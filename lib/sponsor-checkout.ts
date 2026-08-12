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

export type SponsorCheckoutResult = {
  sessionId: string
  holdExpiresAt: number
  /** Hosted Checkout URL (uiMode hosted only). */
  url: string | null
  /** Embedded Checkout client secret (uiMode embedded only). */
  clientSecret: string | null
}

export async function createSponsorCheckoutSession(opts: {
  sponsor: Sponsor
  holdExpiresAt?: number
  /** embedded = stay on /sponsor; hosted = Stripe-hosted page (admin pay links). */
  uiMode?: "embedded" | "hosted"
}): Promise<SponsorCheckoutResult | null> {
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

  const uiMode = opts.uiMode ?? "hosted"
  const isPublic = sponsor.source === "public"
  const packageLabel = sponsor.level_label || "Sponsorship"

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
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
  ]

  const metadata = {
    kind: "sponsor_payment",
    sponsorId: String(sponsor.id),
    payToken: sponsor.pay_token || "",
    amountCents: String(sponsor.amount_cents),
    packageKey: sponsor.level_key || "",
    source: sponsor.source || "admin",
  }

  const common = {
    mode: "payment" as const,
    customer_email: sponsor.contact_email || undefined,
    client_reference_id: String(sponsor.id),
    payment_method_types: ["card" as const],
    line_items: lineItems,
    metadata,
    // Stripe minimum is 30m; we expire the session ourselves at the 10m hold.
    expires_at: Math.floor(Date.now() / 1000) + STRIPE_SESSION_EXPIRE_SECONDS,
  }

  // Stripe API 2026-07-29.dahlia renamed ui_mode values:
  // embedded → embedded_page, hosted → hosted_page.
  let session: Stripe.Checkout.Session
  try {
    session =
      uiMode === "embedded"
        ? await stripe.checkout.sessions.create({
            ...common,
            ui_mode: "embedded_page",
            return_url: isPublic
              ? `${base}/sponsor?paid=1&session_id={CHECKOUT_SESSION_ID}`
              : `${base}/sponsor/pay/${sponsor.pay_token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
          })
        : await stripe.checkout.sessions.create({
            ...common,
            ui_mode: "hosted_page",
            success_url: isPublic
              ? `${base}/sponsor?paid=1&session_id={CHECKOUT_SESSION_ID}`
              : `${base}/sponsor/pay/${sponsor.pay_token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: isPublic
              ? `${base}/sponsor?canceled=1&session_id={CHECKOUT_SESSION_ID}`
              : `${base}/sponsor/pay/${sponsor.pay_token}?canceled=1`,
          })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe checkout failed"
    console.error("createSponsorCheckoutSession", message)
    throw new Error(
      message.startsWith("Could not")
        ? message
        : `Could not open checkout: ${message}`,
    )
  }

  const clientSecret =
    uiMode === "embedded" ? session.client_secret ?? null : null
  const url = uiMode === "hosted" ? session.url ?? null : null

  if (uiMode === "embedded" && !clientSecret) return null
  if (uiMode === "hosted" && !url) return null

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
    `${formatUsdFromCents(sponsor.amount_cents)} · ${session.id}${uiMode === "embedded" ? " · embedded" : ""}`,
  ).catch(() => undefined)

  return {
    url,
    clientSecret,
    sessionId: session.id,
    holdExpiresAt: holdUntil,
  }
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
  const session = await createSponsorCheckoutSession({
    sponsor,
    uiMode: "hosted",
  }).catch((err: unknown) => {
    console.error(
      "startCheckoutForPayToken",
      err instanceof Error ? err.message : err,
    )
    return null
  })
  if (!session?.url) {
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
