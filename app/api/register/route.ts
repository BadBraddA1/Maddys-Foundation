import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import {
  audit,
  formatFee,
  getEventBySlug,
  isRegistrationAvailable,
} from "@/lib/events"
import { revalidatePublicEvents } from "@/lib/revalidate-public"
import { normalizeUsPhone } from "@/lib/phone"
import { createEventCheckoutSession } from "@/lib/stripe-checkout"
import { registrationTotalCents } from "@/lib/team-addons"
import { stripeConfigured } from "@/lib/stripe"

export const runtime = "nodejs"

type NameParts = {
  firstName?: string
  lastName?: string
}

type Body = {
  eventSlug?: string
  /** @deprecated prefer firstName + lastName */
  name?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  guests?: number
  notes?: string
  teamName?: string
  teammates?: Array<string | NameParts>
  mulligans?: boolean
  skins?: boolean
  coverCardFees?: boolean
}

const PART_MAX = 60
const NAME_MAX = 120
const PHONE_MAX = 40
const NOTES_MAX = 2000
const EMAIL_MAX = 254
const TEAM_NAME_MAX = 80

function parseNameParts(
  input: NameParts | string | undefined,
  fallbackFull?: string,
): { firstName: string; lastName: string; full: string } | null {
  if (typeof input === "string") {
    const full = input.trim().slice(0, NAME_MAX)
    if (full.length < 2) return null
    const space = full.indexOf(" ")
    if (space === -1) return { firstName: full, lastName: "", full }
    return {
      firstName: full.slice(0, space),
      lastName: full.slice(space + 1).trim(),
      full,
    }
  }

  const firstName = (input?.firstName ?? "").trim().slice(0, PART_MAX)
  const lastName = (input?.lastName ?? "").trim().slice(0, PART_MAX)
  if (firstName && lastName) {
    return {
      firstName,
      lastName,
      full: `${firstName} ${lastName}`.slice(0, NAME_MAX),
    }
  }

  if (fallbackFull) {
    return parseNameParts(fallbackFull)
  }
  return null
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const slug = body.eventSlug?.trim().slice(0, 80)
  const email = body.email?.trim().toLowerCase().slice(0, EMAIL_MAX) ?? ""
  const phoneRaw = (body.phone?.trim() || "").slice(0, PHONE_MAX)
  const phoneNormalized = normalizeUsPhone(phoneRaw)
  if (phoneNormalized === null) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit US phone number, or leave it blank." },
      { status: 400 },
    )
  }
  const phone = phoneNormalized
  const teamName = (body.teamName?.trim() || "").slice(0, TEAM_NAME_MAX)
  const extraNotes = (body.notes?.trim() || "").slice(0, NOTES_MAX)

  const captain = parseNameParts(
    { firstName: body.firstName, lastName: body.lastName },
    body.name,
  )

  if (!slug || !captain || !email) {
    return NextResponse.json(
      { error: "First name, last name, email, and event are required." },
      { status: 400 },
    )
  }

  if (!captain.firstName || !captain.lastName) {
    return NextResponse.json(
      { error: "Enter a first and last name." },
      { status: 400 },
    )
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
  const name = captain.full

  if (teamSize) {
    if (!teamName) {
      return NextResponse.json(
        { error: "Team name is required." },
        { status: 400 },
      )
    }

    const rawTeammates = Array.isArray(body.teammates) ? body.teammates : []
    const teammates = rawTeammates
      .map((t) => parseNameParts(t))
      .filter((t): t is NonNullable<typeof t> => Boolean(t))

    if (teammates.length !== teamSize - 1) {
      return NextResponse.json(
        { error: `Enter all ${teamSize} players on the team.` },
        { status: 400 },
      )
    }
    if (teammates.some((t) => !t.firstName || !t.lastName)) {
      return NextResponse.json(
        { error: "Each player needs a first and last name." },
        { status: 400 },
      )
    }

    guests = teamSize
    const wantMulligans = Boolean(body.mulligans)
    const wantSkins = Boolean(body.skins)
    const coverCardFees = Boolean(body.coverCardFees)
    const totals = registrationTotalCents({
      feeCents: event.fee_cents,
      mulligans: wantMulligans,
      skins: wantSkins,
      coverCardFees,
    })
    const addOns = [
      wantMulligans ? "Mulligans: yes (+$20)" : "Mulligans: no",
      wantSkins ? "Skins: yes (+$20)" : "Skins: no",
      coverCardFees
        ? `Cover card fees: yes (+${formatFee(totals.feeCoverCents) ?? `$${(totals.feeCoverCents / 100).toFixed(2)}`})`
        : "Cover card fees: no",
    ].join(" · ")
    const roster = [
      `Captain: ${name}`,
      ...teammates.map((t, i) => `Player ${i + 2}: ${t.full}`),
    ]
    const totalLabel =
      formatFee(totals.totalCents) ?? `$${(totals.totalCents / 100).toFixed(2)}`
    notes = [
      `Team: ${teamName}`,
      `Add-ons (whole team): ${addOns}`,
      `Total due: ${totalLabel}`,
      roster.join("\n"),
      extraNotes || null,
    ]
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

  let registrationId = 0
  try {
    const result = await sql.execute(
      `INSERT INTO registrations (event_id, name, email, phone, guests, notes, status, paid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [event.id, name, email, phone, guests, notes, status, paid],
    )
    registrationId = Number(result.lastInsertRowid ?? 0)
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

  let checkoutUrl: string | null = null
  if (requirePayment && stripeConfigured() && registrationId > 0) {
    try {
      const session = await createEventCheckoutSession({
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        feeCents: event.fee_cents,
        registrationId,
        customerEmail: email,
        teamName: teamName || undefined,
        mulligans: Boolean(body.mulligans),
        skins: Boolean(body.skins),
        coverCardFees: Boolean(body.coverCardFees),
      })
      checkoutUrl = session?.url ?? null
    } catch (err) {
      console.error("[register] stripe checkout", err)
      // Registration is saved pending — staff can still confirm after manual pay.
    }
  }

  revalidatePublicEvents(slug)
  return NextResponse.json({
    ok: true,
    status,
    registrationId,
    checkoutUrl,
    stripe: stripeConfigured(),
  })
}
