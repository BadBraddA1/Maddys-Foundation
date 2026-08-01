import type Stripe from "stripe"
import { sql } from "@/lib/db"
import { audit, getEventById } from "@/lib/events"
import { revalidatePublicEvents } from "@/lib/revalidate-public"
import { getStripe, publicSiteUrl, stripeConfigured } from "@/lib/stripe"
import {
  TEAM_ADDON_CENTS,
  registrationTotalCents,
} from "@/lib/team-addons"

export {
  TEAM_ADDON_CENTS,
  cardFeeCoverCents,
  registrationTotalCents,
  teamAddonTotalCents,
} from "@/lib/team-addons"

export async function createEventCheckoutSession(opts: {
  eventId: number
  eventSlug: string
  eventTitle: string
  feeCents: number
  registrationId: number
  customerEmail: string
  teamName?: string
  mulligans?: boolean
  skins?: boolean
  coverCardFees?: boolean
}): Promise<{ url: string; sessionId: string; totalCents: number } | null> {
  const totals = registrationTotalCents(opts)
  if (!stripeConfigured() || totals.totalCents <= 0) return null

  const stripe = getStripe()
  const base = publicSiteUrl()
  const productName = opts.teamName
    ? `${opts.eventTitle} — ${opts.teamName}`
    : `${opts.eventTitle} registration`

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = []

  if (totals.baseCents > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: totals.baseCents,
        product_data: {
          name: productName,
          description: "Tournament registration fee",
        },
      },
    })
  }

  if (opts.mulligans) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: TEAM_ADDON_CENTS,
        product_data: {
          name: "Mulligans (team)",
          description: "Team mulligans add-on",
        },
      },
    })
  }

  if (opts.skins) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: TEAM_ADDON_CENTS,
        product_data: {
          name: "Skins (team)",
          description: "Team skins add-on",
        },
      },
    })
  }

  if (totals.feeCoverCents > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: totals.feeCoverCents,
        product_data: {
          name: "Cover card processing fees",
          description: "So the foundation receives the full registration amount (est. 2.9% + $0.30)",
        },
      },
    })
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    client_reference_id: String(opts.registrationId),
    line_items,
    metadata: {
      registrationId: String(opts.registrationId),
      eventId: String(opts.eventId),
      eventSlug: opts.eventSlug,
      kind: "event_registration",
      mulligans: opts.mulligans ? "1" : "0",
      skins: opts.skins ? "1" : "0",
      coverCardFees: opts.coverCardFees ? "1" : "0",
      netCents: String(totals.netCents),
      feeCoverCents: String(totals.feeCoverCents),
      totalCents: String(totals.totalCents),
    },
    success_url: `${base}/events/${opts.eventSlug}/register?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/events/${opts.eventSlug}/register?canceled=1`,
  })

  if (!session.url) return null
  return {
    url: session.url,
    sessionId: session.id,
    totalCents: totals.totalCents,
  }
}

export async function confirmRegistrationFromCheckout(
  session: Stripe.Checkout.Session,
) {
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return
  }

  const registrationId = Number(
    session.metadata?.registrationId || session.client_reference_id || 0,
  )
  const eventId = Number(session.metadata?.eventId || 0)
  if (!Number.isFinite(registrationId) || registrationId <= 0) {
    console.error("[stripe] missing registrationId on session", session.id)
    return
  }

  await sql.execute(
    `UPDATE registrations
     SET paid = 1, status = 'confirmed'
     WHERE id = ? AND (status = 'pending' OR paid = 0)`,
    [registrationId],
  )

  await audit(
    "stripe",
    "confirm_registration",
    "registration",
    String(registrationId),
    session.id,
  )

  if (Number.isFinite(eventId) && eventId > 0) {
    const event = await getEventById(eventId).catch(() => null)
    if (event) revalidatePublicEvents(event.slug)
  } else if (session.metadata?.eventSlug) {
    revalidatePublicEvents(session.metadata.eventSlug)
  }
}
