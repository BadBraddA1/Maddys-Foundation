import { sql } from "@/lib/db"
import { getStripe, stripeConfigured } from "@/lib/stripe"
import { audit } from "@/lib/events"
import { revalidatePublicEvents } from "@/lib/revalidate-public"

/** How long an unpaid checkout holds a capacity slot. */
export const CHECKOUT_HOLD_MINUTES = 10
export const CHECKOUT_HOLD_SECONDS = CHECKOUT_HOLD_MINUTES * 60

/**
 * Stripe Checkout requires expires_at ≥ 30 minutes from creation.
 * We expire the session ourselves when the 10-minute hold ends.
 */
export const STRIPE_SESSION_EXPIRE_SECONDS = 30 * 60

export function holdExpiresAtUnix(fromMs = Date.now()): number {
  return Math.floor(fromMs / 1000) + CHECKOUT_HOLD_SECONDS
}

export function formatHoldCountdown(remainingSec: number): string {
  const s = Math.max(0, Math.floor(remainingSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}

/**
 * Drop unpaid drafts past hold_expires_at and expire their Stripe sessions
 * so the slot returns to the pool (prevents overselling).
 */
export async function releaseExpiredHolds(eventId?: number): Promise<number> {
  const now = Math.floor(Date.now() / 1000)
  const rows = eventId
    ? await sql`
        SELECT id, stripe_checkout_session_id, event_id
        FROM registrations
        WHERE status = 'pending'
          AND paid = 0
          AND hold_expires_at IS NOT NULL
          AND hold_expires_at <= ${now}
          AND event_id = ${eventId}
      `
    : await sql`
        SELECT id, stripe_checkout_session_id, event_id
        FROM registrations
        WHERE status = 'pending'
          AND paid = 0
          AND hold_expires_at IS NOT NULL
          AND hold_expires_at <= ${now}
      `

  if (rows.length === 0) return 0

  const stripe = stripeConfigured() ? getStripe() : null
  const slugs = new Set<string>()

  for (const row of rows) {
    const id = Number(row.id)
    const sessionId =
      row.stripe_checkout_session_id == null
        ? null
        : String(row.stripe_checkout_session_id)

    if (stripe && sessionId) {
      try {
        await stripe.checkout.sessions.expire(sessionId)
      } catch {
        // Already expired/completed — fine
      }
    }

    await sql.execute(
      `DELETE FROM registrations WHERE id = ? AND status = 'pending' AND paid = 0`,
      [id],
    )
    await audit(
      "system",
      "release_expired_hold",
      "registration",
      String(id),
      sessionId ?? "",
    ).catch(() => undefined)
  }

  if (eventId) {
    const eventRows = await sql`
      SELECT slug FROM events WHERE id = ${eventId} LIMIT 1
    `
    const slug = eventRows[0]?.slug
    if (slug) revalidatePublicEvents(String(slug))
  } else {
    for (const row of rows) {
      const eid = Number(row.event_id)
      const eventRows = await sql`
        SELECT slug FROM events WHERE id = ${eid} LIMIT 1
      `
      const slug = eventRows[0]?.slug
      if (slug) slugs.add(String(slug))
    }
    for (const slug of slugs) revalidatePublicEvents(slug)
  }

  return rows.length
}
