import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { syncPlayersForEvent } from "@/lib/check-in"
import { getEventById } from "@/lib/events"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

/** Backfill team_name + event_players from paid registration notes. */
export async function POST(_req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const eventId = Number(id)
  if (!Number.isFinite(eventId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const event = await getEventById(eventId)
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  const result = await syncPlayersForEvent(eventId, admin.email)
  return NextResponse.json({ ok: true, ...result })
}
