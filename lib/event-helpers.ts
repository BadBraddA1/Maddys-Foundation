/** Pure event helpers — safe for client components (no DB / cache). */

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
  /** When set (e.g. 4), registration is for a full team of that size. */
  team_size: number | null
  cover_image_url: string | null
  /** GPS for Apple Wallet relevance (lock screen near the course). */
  venue_latitude: number | null
  venue_longitude: number | null
  created_at: string
  updated_at: string
  /** Slots held toward capacity (paid + in-checkout). One row = one team when team_size > 1. */
  registration_count?: number
  /** Paid / confirmed only (admin roster). */
  confirmed_count?: number
}

/** Capacity counts registration rows as team slots when team_size > 1. */
export function isTeamEvent(event: Pick<EventRow, "team_size">): boolean {
  return Boolean(event.team_size && event.team_size > 1)
}

export function capacityUnitLabel(
  event: Pick<EventRow, "team_size">,
  count = 2,
): string {
  if (isTeamEvent(event)) return count === 1 ? "team" : "teams"
  return count === 1 ? "spot" : "spots"
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

export function formatEventFeeLabel(event: Pick<EventRow, "fee_cents" | "team_size">): string | null {
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
