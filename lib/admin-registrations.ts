import { audit } from "@/lib/audit"
import {
  ensureCheckInRosterForRegistration,
  ensureEventPlayerTicketColumns,
  listPlayersForRegistration,
  syncPlayersForRegistration,
} from "@/lib/check-in"
import {
  checkInPrefixFromSlug,
  ensurePlayerCheckInCode,
  ensureRegistrationCheckInCode,
} from "@/lib/check-in-code"
import { sql } from "@/lib/db"
import type { EventRow } from "@/lib/event-helpers"
import { isTeamEvent } from "@/lib/event-helpers"
import { getEventById } from "@/lib/events"
import { revalidatePublicEvents } from "@/lib/revalidate-public"

export type AdminPlayerInput = {
  id?: number
  display_name: string
  email?: string
}

export type AdminRegistrationInput = {
  name: string
  email: string
  phone?: string
  team_name?: string
  guests?: number
  notes?: string
  /** Player roster (team events). Captain is usually players[0] or name. */
  players?: AdminPlayerInput[]
  /** When true (default for admin create), mark paid + confirmed. */
  paid?: boolean
  send_confirmation?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function buildNotes(opts: {
  teamName: string
  captainName: string
  players: string[]
  extraNotes: string
}): string {
  const lines: string[] = []
  if (opts.teamName) lines.push(`Team: ${opts.teamName}`)
  if (opts.captainName) lines.push(`Captain: ${opts.captainName}`)
  opts.players.forEach((name, i) => {
    if (i === 0) return
    lines.push(`Player ${i + 1}: ${name}`)
  })
  if (opts.extraNotes.trim()) {
    if (lines.length) lines.push("")
    lines.push(opts.extraNotes.trim())
  }
  return lines.join("\n")
}

async function replacePlayers(
  registrationId: number,
  eventId: number,
  prefix: string,
  players: AdminPlayerInput[],
) {
  await ensureEventPlayerTicketColumns()
  const existing = await listPlayersForRegistration(registrationId)
  const keepIds = new Set(
    players.map((p) => p.id).filter((id): id is number => Number.isFinite(id)),
  )

  for (const old of existing) {
    if (!keepIds.has(old.id)) {
      await sql.execute(`DELETE FROM event_players WHERE id = ?`, [old.id])
    }
  }

  for (let i = 0; i < players.length; i++) {
    const p = players[i]!
    const name = p.display_name.trim()
    if (!name) continue
    const email = (p.email ?? "").trim().toLowerCase()
    if (p.id && keepIds.has(p.id)) {
      await sql.execute(
        `UPDATE event_players
         SET display_name = ?, email = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND registration_id = ?`,
        [name, email, i, p.id, registrationId],
      )
      await ensurePlayerCheckInCode(p.id, prefix)
    } else {
      const result = await sql.execute(
        `INSERT INTO event_players
          (event_id, registration_id, display_name, sort_order, email)
         VALUES (?, ?, ?, ?, ?)`,
        [eventId, registrationId, name, i, email],
      )
      const newId = Number(result.lastInsertRowid ?? 0)
      if (newId) await ensurePlayerCheckInCode(newId, prefix)
    }
  }
}

export async function createAdminRegistration(
  eventId: number,
  input: AdminRegistrationInput,
  actor: string,
): Promise<{ ok: true; id: number } | { ok: false; status: number; error: string }> {
  const event = await getEventById(eventId)
  if (!event) return { ok: false, status: 404, error: "Event not found" }

  const name = input.name.trim()
  const email = normalizeEmail(input.email)
  if (!name || !email || !EMAIL_RE.test(email)) {
    return { ok: false, status: 400, error: "Name and valid email are required." }
  }

  const teamName = (input.team_name ?? "").trim() || name
  const phone = (input.phone ?? "").trim()
  const playerNames = (input.players ?? [])
    .map((p) => p.display_name.trim())
    .filter(Boolean)
  const rosterNames =
    playerNames.length > 0 ? playerNames : isTeamEvent(event) ? [name] : [name]

  const notes = buildNotes({
    teamName,
    captainName: name,
    players: rosterNames,
    extraNotes: input.notes ?? "",
  })

  const paid = input.paid !== false ? 1 : 0
  const status = paid ? "confirmed" : "pending"
  const guests = Math.max(
    1,
    Math.min(
      20,
      Number.isFinite(input.guests) ? Number(input.guests) : rosterNames.length || 1,
    ),
  )

  const prefix = checkInPrefixFromSlug(event.slug)

  try {
    const result = await sql.execute(
      `INSERT INTO registrations (
        event_id, name, email, phone, guests, notes, status, paid,
        team_name, check_in_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [eventId, name, email, phone, guests, notes, status, paid, teamName],
    )
    const id = Number(result.lastInsertRowid ?? 0)
    if (!id) return { ok: false, status: 500, error: "Could not create registration." }

    await ensureRegistrationCheckInCode(id, prefix)

    if (paid) {
      const playerInputs: AdminPlayerInput[] =
        (input.players?.length ?? 0) > 0
          ? input.players!.map((p, i) => ({
              display_name: p.display_name.trim() || (i === 0 ? name : ""),
              email: i === 0 ? email : (p.email ?? "").trim().toLowerCase(),
            })).filter((p) => p.display_name)
          : [{ display_name: name, email }]

      if (playerInputs[0] && !playerInputs[0].email) {
        playerInputs[0].email = email
      }

      await replacePlayers(id, eventId, prefix, playerInputs)
      await ensureCheckInRosterForRegistration(id, {
        teamName,
        playerNames: playerInputs.map((p) => p.display_name),
      }).catch(() => undefined)

      if (input.send_confirmation !== false) {
        const { sendRegistrationConfirmation } = await import(
          "@/lib/registration-emails"
        )
        await sendRegistrationConfirmation(id).catch((err) => {
          console.error("[admin] confirmation email", err)
        })
      }
    }

    await audit(actor, "create_registration", "registration", String(id), name)
    revalidatePublicEvents(event.slug)
    return { ok: true, id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return {
        ok: false,
        status: 409,
        error: "That email is already registered for this event.",
      }
    }
    console.error("[admin create registration]", err)
    return { ok: false, status: 500, error: "Could not create registration." }
  }
}

export async function updateAdminRegistration(
  eventId: number,
  registrationId: number,
  input: AdminRegistrationInput,
  actor: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const event = await getEventById(eventId)
  if (!event) return { ok: false, status: 404, error: "Event not found" }

  const rows = await sql`
    SELECT * FROM registrations
    WHERE id = ${registrationId} AND event_id = ${eventId}
    LIMIT 1
  `
  const existing = rows[0]
  if (!existing) return { ok: false, status: 404, error: "Registration not found" }

  const name = input.name.trim() || String(existing.name)
  const email = normalizeEmail(input.email || String(existing.email))
  if (!name || !EMAIL_RE.test(email)) {
    return { ok: false, status: 400, error: "Name and valid email are required." }
  }

  const teamName =
    (input.team_name ?? String(existing.team_name ?? "")).trim() || name
  const phone =
    input.phone !== undefined
      ? input.phone.trim()
      : String(existing.phone ?? "")
  const guests =
    input.guests !== undefined
      ? Math.max(1, Math.min(20, Number(input.guests) || 1))
      : Number(existing.guests ?? 1)

  let notes = input.notes !== undefined ? input.notes : String(existing.notes ?? "")
  const prefix = checkInPrefixFromSlug(event.slug)

  try {
    if (input.players) {
      const playerInputs = input.players
        .map((p) => ({
          id: p.id,
          display_name: p.display_name.trim(),
          email: (p.email ?? "").trim().toLowerCase(),
        }))
        .filter((p) => p.display_name)
      if (playerInputs.length === 0) {
        return { ok: false, status: 400, error: "Add at least one player." }
      }
      if (playerInputs[0] && !playerInputs[0].email) {
        playerInputs[0].email = email
      }
      const extra =
        input.notes !== undefined
          ? extractExtraNotes(input.notes)
          : extractExtraNotes(String(existing.notes ?? ""))
      notes = buildNotes({
        teamName,
        captainName: name,
        players: playerInputs.map((p) => p.display_name),
        extraNotes: extra,
      })
      await replacePlayers(registrationId, eventId, prefix, playerInputs)
    } else if (input.notes !== undefined) {
      notes = buildNotes({
        teamName,
        captainName: name,
        players: [name],
        extraNotes: extractExtraNotes(input.notes),
      })
    }

    await sql.execute(
      `UPDATE registrations SET
        name = ?, email = ?, phone = ?, guests = ?, notes = ?, team_name = ?
       WHERE id = ? AND event_id = ?`,
      [name, email, phone, guests, notes, teamName, registrationId, eventId],
    )

    await ensureRegistrationCheckInCode(registrationId, prefix)
    if (Number(existing.paid) === 1) {
      await syncPlayersForRegistration(registrationId, actor).catch(() => 0)
    }

    await audit(
      actor,
      "update_registration",
      "registration",
      String(registrationId),
      name,
    )
    revalidatePublicEvents(event.slug)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return {
        ok: false,
        status: 409,
        error: "That email is already registered for this event.",
      }
    }
    console.error("[admin update registration]", err)
    return { ok: false, status: 500, error: "Could not update registration." }
  }
}

export function extractExtraNotes(notes: string): string {
  return notes
    .split("\n")
    .filter((line) => !/^\s*(Team|Captain|Player\s+\d+)\s*:/i.test(line))
    .join("\n")
    .replace(/^\n+/, "")
    .trim()
}

export async function deleteAdminRegistration(
  eventId: number,
  registrationId: number,
  actor: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const event = await getEventById(eventId)
  if (!event) return { ok: false, status: 404, error: "Event not found" }

  const rows = await sql`
    SELECT id, name FROM registrations
    WHERE id = ${registrationId} AND event_id = ${eventId}
    LIMIT 1
  `
  if (!rows[0]) return { ok: false, status: 404, error: "Registration not found" }

  await sql.execute(`DELETE FROM check_in_history WHERE registration_id = ?`, [
    registrationId,
  ])
  await sql.execute(`DELETE FROM event_players WHERE registration_id = ?`, [
    registrationId,
  ])
  await sql.execute(`DELETE FROM registrations WHERE id = ? AND event_id = ?`, [
    registrationId,
    eventId,
  ])

  await audit(
    actor,
    "delete_registration",
    "registration",
    String(registrationId),
    String(rows[0].name ?? ""),
  )
  revalidatePublicEvents(event.slug)
  return { ok: true }
}

export async function getAdminRegistrationDetail(
  eventId: number,
  registrationId: number,
): Promise<{
  event: EventRow
  registration: {
    id: number
    name: string
    email: string
    phone: string
    guests: number
    notes: string
    team_name: string
    status: string
    paid: number
    check_in_code: string | null
  }
  players: Array<{
    id: number
    display_name: string
    email: string
    sort_order: number
    checked_in: number
    check_in_code: string | null
  }>
} | null> {
  const event = await getEventById(eventId)
  if (!event) return null
  const rows = await sql`
    SELECT * FROM registrations
    WHERE id = ${registrationId} AND event_id = ${eventId}
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null

  if (Number(row.paid) === 1) {
    await syncPlayersForRegistration(registrationId).catch(() => 0)
  }
  const players = await listPlayersForRegistration(registrationId)

  return {
    event,
    registration: {
      id: Number(row.id),
      name: String(row.name),
      email: String(row.email),
      phone: String(row.phone ?? ""),
      guests: Number(row.guests ?? 1),
      notes: String(row.notes ?? ""),
      team_name: String(row.team_name ?? ""),
      status: String(row.status ?? ""),
      paid: Number(row.paid ?? 0),
      check_in_code: row.check_in_code ? String(row.check_in_code) : null,
    },
    players: players.map((p) => ({
      id: p.id,
      display_name: p.display_name,
      email: p.email,
      sort_order: p.sort_order,
      checked_in: p.checked_in,
      check_in_code: p.check_in_code,
    })),
  }
}
