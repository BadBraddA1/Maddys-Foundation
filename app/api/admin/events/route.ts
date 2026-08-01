import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { audit, slugify } from "@/lib/events"
import { revalidatePublicEvents } from "@/lib/revalidate-public"

export const runtime = "nodejs"

type Body = {
  title?: string
  slug?: string
  summary?: string
  description?: string
  location?: string
  starts_at?: string
  ends_at?: string | null
  capacity?: number | null
  is_published?: boolean
  registration_open?: boolean
  open_at?: string | null
  close_at?: string | null
  fee_cents?: number
  team_size?: number | null
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await sql`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registration_count,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = e.id AND r.status = 'confirmed' AND r.paid = 1) AS confirmed_count
    FROM events e
    ORDER BY e.starts_at DESC
  `
  return NextResponse.json({ events: rows })
}

export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const title = body.title?.trim()
  const starts_at = body.starts_at?.trim()
  if (!title || !starts_at) {
    return NextResponse.json(
      { error: "Title and start date are required." },
      { status: 400 },
    )
  }

  let slug = (body.slug?.trim() && slugify(body.slug)) || slugify(title)
  if (!slug) slug = `event-${Date.now()}`

  try {
    const result = await sql.execute(
      `INSERT INTO events (
        slug, title, summary, description, location,
        starts_at, ends_at, capacity, is_published, registration_open,
        open_at, close_at, fee_cents, team_size, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        slug,
        title,
        body.summary?.trim() || "",
        body.description?.trim() || "",
        body.location?.trim() || "",
        starts_at,
        body.ends_at || null,
        body.capacity ?? null,
        body.is_published ? 1 : 0,
        body.registration_open ? 1 : 0,
        body.open_at || null,
        body.close_at || null,
        body.fee_cents ?? 0,
        body.team_size ?? null,
      ],
    )

    const id = Number(result.lastInsertRowid ?? 0)
    await audit(admin.email, "create_event", "event", String(id), title)
    revalidatePublicEvents(slug)
    return NextResponse.json({ ok: true, id, slug })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return NextResponse.json(
        { error: "That slug is already in use." },
        { status: 409 },
      )
    }
    console.error("[admin events POST]", err)
    return NextResponse.json({ error: "Could not create event." }, { status: 500 })
  }
}
