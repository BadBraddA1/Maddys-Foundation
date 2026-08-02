import {
  ensureEventPlayerTicketColumns,
  syncPlayersForRegistration,
} from "@/lib/check-in"
import { checkInPrefixFromSlug, ensurePlayerCheckInCode } from "@/lib/check-in-code"
import { sql } from "@/lib/db"
import { formatEventDate } from "@/lib/events"
import { publicSiteUrl } from "@/lib/stripe"

export type PublicTicketPlayer = {
  id: number
  displayName: string
  email: string
  checkInCode: string | null
  ticketEmailSentAt: string | null
  sortOrder: number
}

export type PublicTicket = {
  code: string
  registrationId: number
  teamName: string
  captainName: string
  captainEmail: string
  eventTitle: string
  eventSlug: string
  eventLocation: string
  eventWhen: string
  eventStartsAt: string
  venueLatitude: number | null
  venueLongitude: number | null
  /** @deprecated use playerDetails — kept for simple lists */
  players: string[]
  playerDetails: PublicTicketPlayer[]
}

export type PublicPlayerTicket = {
  code: string
  playerId: number
  playerName: string
  teamName: string
  captainName: string
  teamCode: string
  eventTitle: string
  eventSlug: string
  eventLocation: string
  eventWhen: string
  eventStartsAt: string
  venueLatitude: number | null
  venueLongitude: number | null
  checkedIn: boolean
}

export async function getPublicTicketByCode(
  code: string,
): Promise<PublicTicket | null> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null

  const rows = await sql`
    SELECT r.id, r.name, r.email, r.team_name, r.check_in_code,
      e.title AS event_title, e.slug AS event_slug,
      e.location AS event_location, e.starts_at AS event_starts_at,
      e.venue_latitude, e.venue_longitude
    FROM registrations r
    INNER JOIN events e ON e.id = r.event_id
    WHERE upper(r.check_in_code) = ${normalized}
      AND r.status = 'confirmed' AND r.paid = 1
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null

  const registrationId = Number(row.id)
  await syncPlayersForRegistration(registrationId).catch(() => 0)

  const players = await sql`
    SELECT id, display_name, email, check_in_code, ticket_email_sent_at, sort_order
    FROM event_players
    WHERE registration_id = ${registrationId}
    ORDER BY sort_order ASC, id ASC
  `

  const prefix = checkInPrefixFromSlug(String(row.event_slug ?? "MF"))
  const playerDetails: PublicTicketPlayer[] = []
  for (const p of players) {
    let playerCode = p.check_in_code ? String(p.check_in_code) : null
    if (!playerCode) {
      playerCode = await ensurePlayerCheckInCode(Number(p.id), prefix)
    }
    playerDetails.push({
      id: Number(p.id),
      displayName: String(p.display_name),
      email: String(p.email ?? ""),
      checkInCode: playerCode,
      ticketEmailSentAt: p.ticket_email_sent_at
        ? String(p.ticket_email_sent_at)
        : null,
      sortOrder: Number(p.sort_order ?? 0),
    })
  }

  const codeOut = String(row.check_in_code ?? normalized)
  return {
    code: codeOut,
    registrationId,
    teamName: String(row.team_name ?? "").trim() || String(row.name),
    captainName: String(row.name),
    captainEmail: String(row.email ?? ""),
    eventTitle: String(row.event_title),
    eventSlug: String(row.event_slug),
    eventLocation: String(row.event_location ?? ""),
    eventWhen: formatEventDate(String(row.event_starts_at)),
    eventStartsAt: String(row.event_starts_at),
    venueLatitude:
      row.venue_latitude == null || row.venue_latitude === ""
        ? null
        : Number(row.venue_latitude),
    venueLongitude:
      row.venue_longitude == null || row.venue_longitude === ""
        ? null
        : Number(row.venue_longitude),
    players: playerDetails.map((p) => p.displayName),
    playerDetails,
  }
}

export async function getPublicPlayerTicketByCode(
  code: string,
): Promise<PublicPlayerTicket | null> {
  await ensureEventPlayerTicketColumns()
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null

  const rows = await sql`
    SELECT p.id, p.display_name, p.check_in_code, p.checked_in,
      r.name AS captain_name, r.team_name, r.check_in_code AS team_code,
      e.title AS event_title, e.slug AS event_slug,
      e.location AS event_location, e.starts_at AS event_starts_at,
      e.venue_latitude, e.venue_longitude
    FROM event_players p
    INNER JOIN registrations r ON r.id = p.registration_id
    INNER JOIN events e ON e.id = p.event_id
    WHERE upper(p.check_in_code) = ${normalized}
      AND r.status = 'confirmed' AND r.paid = 1
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null

  return {
    code: String(row.check_in_code ?? normalized),
    playerId: Number(row.id),
    playerName: String(row.display_name),
    teamName: String(row.team_name ?? "").trim() || String(row.captain_name),
    captainName: String(row.captain_name),
    teamCode: String(row.team_code ?? ""),
    eventTitle: String(row.event_title),
    eventSlug: String(row.event_slug),
    eventLocation: String(row.event_location ?? ""),
    eventWhen: formatEventDate(String(row.event_starts_at)),
    eventStartsAt: String(row.event_starts_at),
    venueLatitude:
      row.venue_latitude == null || row.venue_latitude === ""
        ? null
        : Number(row.venue_latitude),
    venueLongitude:
      row.venue_longitude == null || row.venue_longitude === ""
        ? null
        : Number(row.venue_longitude),
    checkedIn: Number(row.checked_in ?? 0) === 1,
  }
}

export function playerTicketUrlForCode(code: string): string {
  return `${publicSiteUrl()}/ticket/p/${encodeURIComponent(code)}`
}
