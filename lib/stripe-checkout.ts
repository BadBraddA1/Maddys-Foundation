import type Stripe from "stripe"
import { sql } from "@/lib/db"
import { audit, getEventById } from "@/lib/events"
import { revalidatePublicEvents } from "@/lib/revalidate-public"
import { getStripe, publicSiteUrl, stripeConfigured } from "@/lib/stripe"

export async function createEventCheckoutSession(opts: {
  eventId: number
  eventSlug: string
  eventTitle: string
  feeCents: number
  registrationId: number
  customerEmail: string
  teamName?: string
}): Promise<{ url: string; sessionId: string } | null> {
  if (!stripeConfigured() || opts.feeCents <= 0) return null

  const stripe = getStripe()
  const base = publicSiteUrl()
  const productName = opts.teamName
    ? `${opts.eventTitle} — ${opts.teamName}`
    : `${opts.eventTitle} registration`

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    client_reference_id: String(opts.registrationId),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: opts.feeCents,
          product_data: {
            name: productName,
            description: "Tournament registration fee",
          },
        },
      },
    ],
    metadata: {
      registrationId: String(opts.registrationId),
      eventId: String(opts.eventId),
      eventSlug: opts.eventSlug,
      kind: "event_registration",
    },
    success_url: `${base}/events/${opts.eventSlug}/register?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/events/${opts.eventSlug}/register?canceled=1`,
  })

  if (!session.url) return null
  return { url: session.url, sessionId: session.id }
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
