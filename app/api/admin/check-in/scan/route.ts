import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { checkInPlayer, getCheckInTeam } from "@/lib/check-in"
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
 * Player codes auto check-in; team codes only load the team.
 */
export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
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
    const result = await checkInPlayer(playerId, admin.email)
    const team = registrationId ? await getCheckInTeam(registrationId) : null

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        kind: "player",
        autoCheckedIn: true,
        alreadyCheckedIn: false,
        player: result.player,
        registrationId,
        team,
        message: `${result.player.display_name} checked in.`,
      })
    }

    if (result.status === 409) {
      return NextResponse.json({
        ok: true,
        kind: "player",
        autoCheckedIn: false,
        alreadyCheckedIn: true,
        player: result.player,
        registrationId,
        team,
        message: result.error,
      })
    }

    return NextResponse.json(
      { error: result.error, player: result.player },
      { status: result.status },
    )
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
    registrationId,
    team,
    message: `Loaded team for code ${code}.`,
  })
}
