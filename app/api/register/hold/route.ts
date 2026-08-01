import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import {
  createCapacityHold,
  releaseCapacityHold,
} from "@/lib/registration-hold"

export const runtime = "nodejs"

type Body = {
  eventSlug?: string
  token?: string
}

/** Start or resume a capacity hold when the register form/timer opens. */
export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const slug = body.eventSlug?.trim()
  if (!slug) {
    return NextResponse.json({ error: "Event required." }, { status: 400 })
  }

  const event = await getEventBySlug(slug).catch(() => null)
  if (!event || !event.is_published) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 })
  }
  if (event.fee_cents <= 0) {
    return NextResponse.json({ error: "Hold not needed." }, { status: 400 })
  }
  if (!event.registration_open) {
    return NextResponse.json(
      { error: "Registration is closed for this event." },
      { status: 400 },
    )
  }
  const now = Date.now()
  if (event.open_at) {
    const open = new Date(event.open_at).getTime()
    if (!Number.isNaN(open) && now < open) {
      return NextResponse.json(
        { error: "Registration is not open yet." },
        { status: 400 },
      )
    }
  }
  if (event.close_at) {
    const close = new Date(event.close_at).getTime()
    if (!Number.isNaN(close) && now > close) {
      return NextResponse.json(
        { error: "Registration has closed." },
        { status: 400 },
      )
    }
  }

  const result = await createCapacityHold({
    eventId: event.id,
    eventSlug: event.slug,
    capacity: event.capacity,
    existingToken: body.token?.trim() || null,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    token: result.token,
    holdExpiresAt: result.holdExpiresAt,
    slotsUsed: result.slotsUsed,
    capacity: event.capacity,
  })
}

/** Release a form hold early (timer expired / start over / leave). */
export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token")?.trim()
  const eventSlug = url.searchParams.get("eventSlug")?.trim()
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 })
  }
  const released = await releaseCapacityHold(token, eventSlug)
  return NextResponse.json({ ok: true, released })
}
