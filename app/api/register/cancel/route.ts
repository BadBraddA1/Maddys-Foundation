import { NextResponse } from "next/server"
import { getStripe, stripeConfigured } from "@/lib/stripe"
import { dropPendingRegistration } from "@/lib/stripe-checkout"
import { revalidatePublicEvents } from "@/lib/revalidate-public"
import { sql } from "@/lib/db"

export const runtime = "nodejs"

/** Cancel an unpaid registration before payment completes. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    checkoutSessionId?: string
  } | null
  const checkoutSessionId = String(body?.checkoutSessionId ?? "").trim()
  if (!checkoutSessionId) {
    return NextResponse.json({ error: "Missing checkout session." }, { status: 400 })
  }

  let eventSlug: string | null = null
  try {
    const rows = await sql`
      SELECT e.slug AS slug
      FROM registrations r
      JOIN events e ON e.id = r.event_id
      WHERE r.stripe_checkout_session_id = ${checkoutSessionId}
        AND r.status = 'pending'
        AND r.paid = 0
      LIMIT 1
    `
    eventSlug = rows[0]?.slug ? String(rows[0].slug) : null
  } catch {
    // continue — still try to drop by session id
  }

  if (stripeConfigured()) {
    try {
      await getStripe().checkout.sessions.expire(checkoutSessionId)
    } catch {
      // already expired/completed
    }
  }

  const released = await dropPendingRegistration({ checkoutSessionId })
  if (released && eventSlug) {
    revalidatePublicEvents(eventSlug)
  }
  return NextResponse.json({ ok: true, released })
}
