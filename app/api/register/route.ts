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

const NAME_MAX = 120
const PHONE_MAX = 40
const NOTES_MAX = 2000
const EMAIL_MAX = 254

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const slug = body.eventSlug?.trim().slice(0, 80)
  const name = body.name?.trim().slice(0, NAME_MAX) ?? ""
  const email = body.email?.trim().toLowerCase().slice(0, EMAIL_MAX) ?? ""
  const phone = (body.phone?.trim() || "").slice(0, PHONE_MAX)
  const notes = (body.notes?.trim() || "").slice(0, NOTES_MAX)
  const guests = Math.min(20, Math.max(1, Math.floor(Number(body.guests) || 1)))

  if (!slug || !name || !email) {
    return NextResponse.json(
      { error: "Name, email, and event are required." },
      { status: 400 },
    )
  }

  if (name.length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 })
  }

  let event
  try {
    event = await getEventBySlug(slug)
  } catch (err) {
    console.error("[register] db", err)
    return NextResponse.json(
      { error: "Registration is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    )
  }

  if (!event || !event.is_published) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 })
  }

  if (!isRegistrationAvailable(event)) {
    return NextResponse.json(
      { error: "Registration is closed or this event is full." },
      { status: 400 },
    )
  }

  // Re-check capacity at write time to reduce race overfills (capacity = registration slots)
  if (event.capacity != null) {
    try {
      const countRows = await sql`
        SELECT COUNT(*) AS c FROM registrations
        WHERE event_id = ${event.id} AND status = 'confirmed'
      `
      const count = Number(countRows[0]?.c ?? 0)
      if (count >= event.capacity) {
        return NextResponse.json(
          { error: "This event is full." },
          { status: 400 },
        )
      }
    } catch (err) {
      console.error("[register] capacity", err)
      return NextResponse.json(
        { error: "Registration is temporarily unavailable. Please try again shortly." },
        { status: 503 },
      )
    }
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
