import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { checkInPlayer } from "@/lib/check-in"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const playerId = Number(id)
  if (!Number.isFinite(playerId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const result = await checkInPlayer(playerId, admin.email)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, player: result.player },
      { status: result.status },
    )
  }
  return NextResponse.json({ ok: true, player: result.player })
}
