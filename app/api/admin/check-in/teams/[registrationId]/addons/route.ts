import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { saveTeamAddOns } from "@/lib/check-in"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ registrationId: string }> }

type Body = {
  players?: Array<{
    id: number
    skins?: boolean
    golf_cannon?: boolean
    golf_pro?: boolean
  }>
}

export async function POST(req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { registrationId: idParam } = await ctx.params
  const registrationId = Number(idParam)
  if (!Number.isFinite(registrationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const players = Array.isArray(body.players) ? body.players : []
  if (players.length === 0) {
    return NextResponse.json({ error: "No players to update." }, { status: 400 })
  }

  const team = await saveTeamAddOns(
    registrationId,
    players.map((p) => ({
      id: Number(p.id),
      skins: Boolean(p.skins),
      golf_cannon: Boolean(p.golf_cannon),
      golf_pro: Boolean(p.golf_pro),
    })),
    admin.email,
  )
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 })
  }
  return NextResponse.json({ ok: true, team })
}
