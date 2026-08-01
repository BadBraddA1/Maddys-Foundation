import { sql } from "@/lib/db"
import {
  capacityUnitLabel,
  formatEventDate,
  formatEventFeeLabel,
  formatFee,
  isRegistrationAvailable,
  isTeamEvent,
  slugify,
  toEventIso,
  type EventRow,
} from "@/lib/event-helpers"
import { releaseExpiredHolds } from "@/lib/registration-hold"
import type { SqlRow } from "@/lib/db"

export type { EventRow } from "@/lib/event-helpers"
export {
  capacityUnitLabel,
  formatEventDate,
  formatEventFeeLabel,
  formatFee,
  isRegistrationAvailable,
  isTeamEvent,
  slugify,
  toEventIso,
}

function mapEvent(row: SqlRow): EventRow {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: String(row.summary ?? ""),
    description: String(row.description ?? ""),
    location: String(row.location ?? ""),
    starts_at: String(row.starts_at),
    ends_at: row.ends_at == null ? null : String(row.ends_at),
    capacity: row.capacity == null ? null : Number(row.capacity),
    is_published: Number(row.is_published ?? 0),
    registration_open: Number(row.registration_open ?? 0),
    open_at: row.open_at == null ? null : String(row.open_at),
    close_at: row.close_at == null ? null : String(row.close_at),
    fee_cents: Number(row.fee_cents ?? 0),
    team_size: row.team_size == null ? null : Number(row.team_size),
    cover_image_url:
      row.cover_image_url == null ? null : String(row.cover_image_url),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    registration_count:
      row.registration_count == null
        ? undefined
        : Number(row.registration_count),
    confirmed_count:
      row.confirmed_count == null ? undefined : Number(row.confirmed_count),
  }
}

export async function listPublishedEvents(): Promise<EventRow[]> {
  await releaseExpiredHolds().catch(() => undefined)
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registration_count,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed' AND r.paid = 1) AS confirmed_count
    FROM events e
    WHERE e.is_published = 1
    ORDER BY e.starts_at ASC
  `
  return rows.map(mapEvent)
}

/** Soonest published event that hasn’t started yet (header countdown). */
export async function getNextUpcomingEvent(): Promise<EventRow | null> {
  await releaseExpiredHolds().catch(() => undefined)
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registration_count,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed' AND r.paid = 1) AS confirmed_count
    FROM events e
    WHERE e.is_published = 1 AND e.starts_at > datetime('now')
    ORDER BY e.starts_at ASC
    LIMIT 1
  `
  return rows[0] ? mapEvent(rows[0]) : null
}

export async function listAllEvents(): Promise<EventRow[]> {
  await releaseExpiredHolds().catch(() => undefined)
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registration_count,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed' AND r.paid = 1) AS confirmed_count
    FROM events e
    ORDER BY e.starts_at DESC
  `
  return rows.map(mapEvent)
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  await releaseExpiredHolds().catch(() => undefined)
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registration_count,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed' AND r.paid = 1) AS confirmed_count
    FROM events e
    WHERE e.slug = ${slug}
    LIMIT 1
  `
  return rows[0] ? mapEvent(rows[0]) : null
}

export async function getEventById(id: number): Promise<EventRow | null> {
  await releaseExpiredHolds(id).catch(() => undefined)
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registration_count,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed' AND r.paid = 1) AS confirmed_count
    FROM events e
    WHERE e.id = ${id}
    LIMIT 1
  `
  return rows[0] ? mapEvent(rows[0]) : null
}

export type RegistrationRow = {
  id: number
  event_id: number
  name: string
  email: string
  phone: string
  guests: number
  notes: string
  status: string
  paid: number
  created_at: string
}

export async function listRegistrations(eventId: number): Promise<RegistrationRow[]> {
  // Only paid / confirmed rows — abandoned checkouts are deleted, not listed.
  const rows = await sql`
    SELECT * FROM registrations
    WHERE event_id = ${eventId} AND status = 'confirmed' AND paid = 1
    ORDER BY created_at DESC
  `
  return rows.map((row) => ({
    id: Number(row.id),
    event_id: Number(row.event_id),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone ?? ""),
    guests: Number(row.guests ?? 1),
    notes: String(row.notes ?? ""),
    status: String(row.status ?? "confirmed"),
    paid: Number(row.paid ?? 0),
    created_at: String(row.created_at ?? ""),
  }))
}

export { audit } from "@/lib/audit"
