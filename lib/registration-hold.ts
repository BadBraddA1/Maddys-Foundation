import { randomUUID } from "crypto"
import { sql } from "@/lib/db"
import { getStripe, stripeConfigured } from "@/lib/stripe"
import { audit } from "@/lib/audit"
import { revalidatePublicEvents } from "@/lib/revalidate-public"
import { holdExpiresAtUnix } from "@/lib/registration-hold-shared"

export {
  CHECKOUT_HOLD_MINUTES,
  CHECKOUT_HOLD_SECONDS,
  STRIPE_SESSION_EXPIRE_SECONDS,
  holdExpiresAtUnix,
  formatHoldCountdown,
  resolveHoldExpiresAt,
} from "@/lib/registration-hold-shared"

export type CapacityHoldRow = {
  id: number
  event_id: number
  token: string
  hold_expires_at: number
}

/** Registrations + open form holds that currently occupy capacity. */
export async function capacitySlotsUsed(eventId: number): Promise<number> {
  const now = Math.floor(Date.now() / 1000)
  const rows = await sql`
    SELECT
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = ${eventId})
      + (SELECT COUNT(*) FROM capacity_holds h
          WHERE h.event_id = ${eventId}
            AND h.hold_expires_at > ${now}) AS c
  `
  return Number(rows[0]?.c ?? 0)
}

export async function getActiveCapacityHold(
  token: string,
  eventId?: number,
): Promise<CapacityHoldRow | null> {
  const now = Math.floor(Date.now() / 1000)
  const rows = eventId
    ? await sql`
        SELECT id, event_id, token, hold_expires_at FROM capacity_holds
        WHERE token = ${token}
          AND event_id = ${eventId}
          AND hold_expires_at > ${now}
        LIMIT 1
      `
    : await sql`
        SELECT id, event_id, token, hold_expires_at FROM capacity_holds
        WHERE token = ${token} AND hold_expires_at > ${now}
        LIMIT 1
      `
  const row = rows[0]
  if (!row) return null
  return {
    id: Number(row.id),
    event_id: Number(row.event_id),
    token: String(row.token),
    hold_expires_at: Number(row.hold_expires_at),
  }
}

export async function createCapacityHold(opts: {
  eventId: number
  eventSlug: string
  capacity: number | null
  existingToken?: string | null
}): Promise<
  | { ok: true; token: string; holdExpiresAt: number; slotsUsed: number }
  | { ok: false; error: string; status: number }
> {
  await releaseExpiredHolds(opts.eventId).catch(() => undefined)

  if (opts.existingToken) {
    const existing = await getActiveCapacityHold(
      opts.existingToken,
      opts.eventId,
    )
    if (existing) {
      return {
        ok: true,
        token: existing.token,
        holdExpiresAt: existing.hold_expires_at,
        slotsUsed: await capacitySlotsUsed(opts.eventId),
      }
    }
  }

  const used = await capacitySlotsUsed(opts.eventId)
  if (opts.capacity != null && used >= opts.capacity) {
    return {
      ok: false,
      error: "This event is full — no team spots left.",
      status: 409,
    }
  }

  const token = randomUUID()
  const holdExpiresAt = holdExpiresAtUnix()
  await sql.execute(
    `INSERT INTO capacity_holds (event_id, token, hold_expires_at)
     VALUES (?, ?, ?)`,
    [opts.eventId, token, holdExpiresAt],
  )
  await audit(
    "public",
    "capacity_hold_start",
    "event",
    String(opts.eventId),
    token,
  ).catch(() => undefined)
  revalidatePublicEvents(opts.eventSlug)

  return {
    ok: true,
    token,
    holdExpiresAt,
    slotsUsed: used + 1,
  }
}

export async function releaseCapacityHold(
  token: string,
  eventSlug?: string | null,
): Promise<boolean> {
  const rows = await sql`
    SELECT event_id FROM capacity_holds WHERE token = ${token} LIMIT 1
  `
  if (!rows[0]) return false
  const eventId = Number(rows[0].event_id)
  const result = await sql.execute(`DELETE FROM capacity_holds WHERE token = ?`, [
    token,
  ])
  if (result.rowsAffected > 0) {
    await audit(
      "public",
      "capacity_hold_release",
      "event",
      String(eventId),
      token,
    ).catch(() => undefined)
    if (eventSlug) revalidatePublicEvents(eventSlug)
    else {
      const eventRows = await sql`
        SELECT slug FROM events WHERE id = ${eventId} LIMIT 1
      `
      if (eventRows[0]?.slug) revalidatePublicEvents(String(eventRows[0].slug))
    }
    return true
  }
  return false
}

/** After a real registration row is created, drop the form hold (slot stays via registration). */
export async function consumeCapacityHold(token: string): Promise<void> {
  await sql.execute(`DELETE FROM capacity_holds WHERE token = ?`, [token])
}

/**
 * Drop unpaid drafts + form holds past hold_expires_at so slots return to the pool.
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

  const stripe = stripeConfigured() ? getStripe() : null
  const slugs = new Set<string>()
  let released = 0

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
    released += 1
    const eid = Number(row.event_id)
    const eventRows = await sql`
      SELECT slug FROM events WHERE id = ${eid} LIMIT 1
    `
    if (eventRows[0]?.slug) slugs.add(String(eventRows[0].slug))
  }

  const holdResult = eventId
    ? await sql.execute(
        `DELETE FROM capacity_holds
         WHERE hold_expires_at <= ? AND event_id = ?`,
        [now, eventId],
      )
    : await sql.execute(`DELETE FROM capacity_holds WHERE hold_expires_at <= ?`, [
        now,
      ])
  released += holdResult.rowsAffected

  if (eventId) {
    const eventRows = await sql`
      SELECT slug FROM events WHERE id = ${eventId} LIMIT 1
    `
    const slug = eventRows[0]?.slug
    if (slug) revalidatePublicEvents(String(slug))
  } else {
    for (const slug of slugs) revalidatePublicEvents(slug)
  }

  return released
}
