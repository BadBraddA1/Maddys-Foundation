import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import {
  audit,
  getEventBySlug,
  isRegistrationAvailable,
} from "@/lib/events"
import { revalidatePublicEvents } from "@/lib/revalidate-public"

export const runtime = "nodejs"

type Body = {
  eventSlug?: string
  name?: string
  email?: string
  phone?: string
  guests?: number
  notes?: string
  teamName?: string
  teammates?: string[]
}

const NAME_MAX = 120
const PHONE_MAX = 40
const NOTES_MAX = 2000
const EMAIL_MAX = 254
const TEAM_NAME_MAX = 80

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
  const teamName = (body.teamName?.trim() || "").slice(0, TEAM_NAME_MAX)
  const extraNotes = (body.notes?.trim() || "").slice(0, NOTES_MAX)
  const teammates = Array.isArray(body.teammates)
    ? body.teammates
        .map((t) => String(t).trim().slice(0, NAME_MAX))
        .filter(Boolean)
    : []

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

  const teamSize =
    event.team_size && event.team_size > 1 ? event.team_size : null
  const requirePayment = event.fee_cents > 0

  let guests = Math.min(20, Math.max(1, Math.floor(Number(body.guests) || 1)))
  let notes = extraNotes

  if (teamSize) {
    if (teammates.length !== teamSize - 1) {
      return NextResponse.json(
        { error: `Enter all ${teamSize} players on the team.` },
        { status: 400 },
      )
    }
    if (teammates.some((t) => t.length < 2)) {
      return NextResponse.json(
        { error: "Each teammate needs a full name." },
        { status: 400 },
      )
    }
    guests = teamSize
    const roster = [
      `Captain: ${name}`,
      ...teammates.map((t, i) => `Player ${i + 2}: ${t}`),
    ]
    const teamLine = teamName ? `Team: ${teamName}` : null
    notes = [teamLine, roster.join("\n"), extraNotes || null]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, NOTES_MAX)
  }

  // Capacity = confirmed (paid) slots only so unpaid drafts don't block the field.
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

  const status = requirePayment ? "pending" : "confirmed"
  const paid = requirePayment ? 0 : 1

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
        ${status},
        ${paid}
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

  await audit("public", "register", "event", String(event.id), `${email}:${status}`).catch(
    () => undefined,
  )

  revalidatePublicEvents(slug)
  return NextResponse.json({ ok: true, status })
}
