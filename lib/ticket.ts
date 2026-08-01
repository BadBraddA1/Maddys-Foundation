import { sql } from "@/lib/db"
import { formatEventDate } from "@/lib/events"

export type PublicTicket = {
  code: string
  teamName: string
  captainName: string
  eventTitle: string
  eventSlug: string
  eventLocation: string
  eventWhen: string
  players: string[]
}

export async function getPublicTicketByCode(
  code: string,
): Promise<PublicTicket | null> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null

  const rows = await sql`
    SELECT r.id, r.name, r.team_name, r.check_in_code,
      e.title AS event_title, e.slug AS event_slug,
      e.location AS event_location, e.starts_at AS event_starts_at
    FROM registrations r
    INNER JOIN events e ON e.id = r.event_id
    WHERE upper(r.check_in_code) = ${normalized}
      AND r.status = 'confirmed' AND r.paid = 1
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null

  const registrationId = Number(row.id)
  const players = await sql`
    SELECT display_name FROM event_players
    WHERE registration_id = ${registrationId}
    ORDER BY sort_order ASC, id ASC
  `

  const codeOut = String(row.check_in_code ?? normalized)
  return {
    code: codeOut,
    teamName: String(row.team_name ?? "").trim() || String(row.name),
    captainName: String(row.name),
    eventTitle: String(row.event_title),
    eventSlug: String(row.event_slug),
    eventLocation: String(row.event_location ?? ""),
    eventWhen: formatEventDate(String(row.event_starts_at)),
    players: players.map((p) => String(p.display_name)),
  }
}
