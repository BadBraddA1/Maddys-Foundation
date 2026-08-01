import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { audit, getEventById } from "@/lib/events"
import { sendRegistrationConfirmation } from "@/lib/registration-emails"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string; registrationId: string }> }

/** Resend registration confirmation email (force). */
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

  const result = await sendRegistrationConfirmation(registrationId, {
    force: true,
  })
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "Failed to send" },
      { status: result.error === "Registration not found" ? 404 : 502 },
    )
  }

  await audit(
    admin.email,
    "resend_confirmation_email",
    "registration",
    String(registrationId),
    `event:${eventId}`,
  )

  return NextResponse.json({ ok: true })
}
