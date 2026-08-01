import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import {
  audit,
  getEventBySlug,
  isRegistrationAvailable,
} from "@/lib/events"

export const runtime = "nodejs"

type Body = {
  eventSlug?: string
  name?: string
  email?: string
  phone?: string
  guests?: number
  notes?: string
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const slug = body.eventSlug?.trim()
  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const phone = body.phone?.trim() || ""
  const notes = (body.notes?.trim() || "").slice(0, 2000)
  const guests = Math.min(20, Math.max(1, Number(body.guests) || 1))

  if (!slug || !name || !email) {
    return NextResponse.json(
      { error: "Name, email, and event are required." },
      { status: 400 },
    )
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 })
  }

  const event = await getEventBySlug(slug)
  if (!event || !event.is_published) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 })
  }

  if (!isRegistrationAvailable(event)) {
    return NextResponse.json(
      { error: "Registration is closed or this event is full." },
      { status: 400 },
    )
  }

  try {
    await sql`
      INSERT INTO registrations (event_id, name, email, phone, guests, notes, status, paid)
      VALUES (
        ${event.id},
        ${name},
        ${email},
        ${phone},
        ${guests},
        ${notes},
        'confirmed',
        ${event.fee_cents > 0 ? 0 : 1}
      )
    `
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return NextResponse.json(
        { error: "That email is already registered for this event." },
        { status: 409 },
      )
    }
    console.error("[register]", err)
    return NextResponse.json({ error: "Could not save registration." }, { status: 500 })
  }

  await audit("public", "register", "event", String(event.id), email).catch(
    () => undefined,
  )

  return NextResponse.json({ ok: true })
}
