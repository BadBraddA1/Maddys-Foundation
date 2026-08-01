import { sql, type SqlRow } from "@/lib/db"

export type EventRow = {
  id: number
  slug: string
  title: string
  summary: string
  description: string
  location: string
  starts_at: string
  ends_at: string | null
  capacity: number | null
  is_published: number
  registration_open: number
  open_at: string | null
  close_at: string | null
  fee_cents: number
  paypal_link: string | null
  /** When set (e.g. 4), registration is for a full team of that size. */
  team_size: number | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
  registration_count?: number
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
    paypal_link: row.paypal_link == null ? null : String(row.paypal_link),
    team_size: row.team_size == null ? null : Number(row.team_size),
    cover_image_url:
      row.cover_image_url == null ? null : String(row.cover_image_url),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    registration_count:
      row.registration_count == null
        ? undefined
        : Number(row.registration_count),
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

/** Normalize Turso `YYYY-MM-DD HH:MM:SS` for reliable Date parsing (incl. Safari). */
export function toEventIso(startsAt: string): string {
  const trimmed = startsAt.trim()
  if (trimmed.includes("T")) {
    return /Z$|[+-]\d{2}:?\d{2}$/.test(trimmed) ? trimmed : `${trimmed}Z`
  }
  return `${trimmed.replace(" ", "T")}Z`
}

export function formatEventDate(iso: string): string {
  const d = new Date(toEventIso(iso))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatFee(cents: number): string | null {
  if (!cents || cents <= 0) return null
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function formatEventFeeLabel(event: EventRow): string | null {
  const fee = formatFee(event.fee_cents)
  if (!fee) return null
  if (event.team_size && event.team_size > 1) {
    return `${fee} per team`
  }
  return fee
}

export function isRegistrationAvailable(event: EventRow): boolean {
  if (!event.registration_open) return false
  const now = Date.now()
  if (event.open_at) {
    const open = new Date(event.open_at).getTime()
    if (!Number.isNaN(open) && now < open) return false
  }
  if (event.close_at) {
    const close = new Date(event.close_at).getTime()
    if (!Number.isNaN(close) && now > close) return false
  }
  if (event.capacity != null && event.registration_count != null) {
    if (event.registration_count >= event.capacity) return false
  }
  return true
}

export async function listPublishedEvents(): Promise<EventRow[]> {
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed') AS registration_count
    FROM events e
    WHERE e.is_published = 1
    ORDER BY e.starts_at ASC
  `
  return rows.map(mapEvent)
}

/** Soonest published event that hasn’t started yet (header countdown). */
export async function getNextUpcomingEvent(): Promise<EventRow | null> {
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed') AS registration_count
    FROM events e
    WHERE e.is_published = 1 AND e.starts_at > datetime('now')
    ORDER BY e.starts_at ASC
    LIMIT 1
  `
  return rows[0] ? mapEvent(rows[0]) : null
}

export async function listAllEvents(): Promise<EventRow[]> {
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed') AS registration_count
    FROM events e
    ORDER BY e.starts_at DESC
  `
  return rows.map(mapEvent)
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed') AS registration_count
    FROM events e
    WHERE e.slug = ${slug}
    LIMIT 1
  `
  return rows[0] ? mapEvent(rows[0]) : null
}

export async function getEventById(id: number): Promise<EventRow | null> {
  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed') AS registration_count
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

export async function audit(
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  detail = "",
) {
  await sql`
    INSERT INTO audit_logs (actor, action, entity_type, entity_id, detail)
    VALUES (${actor}, ${action}, ${entityType}, ${entityId}, ${detail})
  `
}
