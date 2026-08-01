import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { audit, getEventById } from "@/lib/events"
import { revalidatePublicEvents } from "@/lib/revalidate-public"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string; registrationId: string }> }

/** Mark a registration paid + confirmed (manual override if needed). */
export async function POST(_req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: idParam, registrationId: regParam } = await ctx.params
  const eventId = Number(idParam)
  const registrationId = Number(regParam)
  if (!Number.isFinite(eventId) || !Number.isFinite(registrationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const event = await getEventById(eventId)
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  const result = await sql.execute(
    `UPDATE registrations
     SET paid = 1, status = 'confirmed'
     WHERE id = ? AND event_id = ?`,
    [registrationId, eventId],
  )

  if (!result.rowsAffected) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 })
  }

  await audit(
    admin.email,
    "confirm_registration",
    "registration",
    String(registrationId),
    `event:${eventId}`,
  )
  revalidatePublicEvents(event.slug)
  return NextResponse.json({ ok: true })
}
