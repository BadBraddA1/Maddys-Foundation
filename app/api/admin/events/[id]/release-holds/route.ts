import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getEventById } from "@/lib/events"
import { releaseAllUnpaidHolds } from "@/lib/registration-hold"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

/**
 * Release all unpaid capacity holds for an event:
 * open form timers + pending (unpaid) checkout drafts.
 * Does not affect paid / confirmed registrations.
 */
export async function POST(_req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: idParam } = await ctx.params
  const eventId = Number(idParam)
  if (!Number.isFinite(eventId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const event = await getEventById(eventId)
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  const result = await releaseAllUnpaidHolds(eventId, admin.email)
  return NextResponse.json({ ok: true, ...result })
}
