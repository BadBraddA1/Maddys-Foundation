import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getCheckInTeam, listPlayersForRegistration } from "@/lib/check-in"
import {
  findPlayerIdByCheckInCode,
  findRegistrationIdByCheckInCode,
  isPlayerCheckInCode,
} from "@/lib/check-in-code"
import { sql } from "@/lib/db"

export const runtime = "nodejs"

async function registrationIdForPlayer(
  playerId: number,
): Promise<number | null> {
  const rows = await sql`
    SELECT registration_id FROM event_players WHERE id = ${playerId} LIMIT 1
  `
  return rows[0] ? Number(rows[0].registration_id) : null
}

/**
 * Resolve a scanned/typed code.
 * Player codes load the team and highlight that player (desk flashes Check In).
 * Team codes only load the team.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { code?: string; eventId?: number }
  try {
    body = (await req.json()) as { code?: string; eventId?: number }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const code = (body.code ?? "").trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 })
  }

  const eventId =
    typeof body.eventId === "number" && Number.isFinite(body.eventId)
      ? body.eventId
      : undefined

  if (isPlayerCheckInCode(code)) {
    const playerId = await findPlayerIdByCheckInCode(code, eventId)
    if (!playerId) {
      return NextResponse.json(
        { error: "Player code not found." },
        { status: 404 },
      )
    }

    const registrationId = await registrationIdForPlayer(playerId)
    if (!registrationId) {
      return NextResponse.json(
        { error: "Player registration not found." },
        { status: 404 },
      )
    }

    const team = await getCheckInTeam(registrationId)
    const players =
      team?.players ?? (await listPlayersForRegistration(registrationId))
    const player = players.find((p) => p.id === playerId) ?? null
    const alreadyCheckedIn = player ? player.checked_in === 1 : false

    return NextResponse.json({
      ok: true,
      kind: "player",
      autoCheckedIn: false,
      alreadyCheckedIn,
      highlightPlayer: true,
      player,
      registrationId,
      team,
      message: player
        ? alreadyCheckedIn
          ? `${player.display_name} is already checked in.`
          : `${player.display_name} — tap Check In.`
        : `Loaded player code ${code}.`,
    })
  }

  const registrationId = await findRegistrationIdByCheckInCode(code, eventId)
  if (!registrationId) {
    return NextResponse.json({ error: "Code not found." }, { status: 404 })
  }

  const team = await getCheckInTeam(registrationId)
  return NextResponse.json({
    ok: true,
    kind: "team",
    autoCheckedIn: false,
    alreadyCheckedIn: false,
    highlightPlayer: false,
    registrationId,
    team,
    message: `Loaded team for code ${code}.`,
  })
}
