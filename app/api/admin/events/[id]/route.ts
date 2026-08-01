import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { audit, getEventById, slugify } from "@/lib/events"
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
  paypal_link?: string | null
}

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: idParam } = await ctx.params
  const id = Number(idParam)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const existing = await getEventById(id)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const title = body.title?.trim() || existing.title
  const starts_at = body.starts_at?.trim() || existing.starts_at
  const slug =
    (body.slug?.trim() && slugify(body.slug)) || existing.slug

  try {
    await sql.execute(
      `UPDATE events SET
        slug = ?, title = ?, summary = ?, description = ?, location = ?,
        starts_at = ?, ends_at = ?, capacity = ?, is_published = ?,
        registration_open = ?, open_at = ?, close_at = ?, fee_cents = ?,
        paypal_link = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        slug,
        title,
        body.summary?.trim() ?? existing.summary,
        body.description?.trim() ?? existing.description,
        body.location?.trim() ?? existing.location,
        starts_at,
        body.ends_at !== undefined ? body.ends_at : existing.ends_at,
        body.capacity !== undefined ? body.capacity : existing.capacity,
        body.is_published !== undefined
          ? body.is_published
            ? 1
            : 0
          : existing.is_published,
        body.registration_open !== undefined
          ? body.registration_open
            ? 1
            : 0
          : existing.registration_open,
        body.open_at !== undefined ? body.open_at : existing.open_at,
        body.close_at !== undefined ? body.close_at : existing.close_at,
        body.fee_cents !== undefined ? body.fee_cents : existing.fee_cents,
        body.paypal_link !== undefined
          ? body.paypal_link
          : existing.paypal_link,
        id,
      ],
    )
    await audit(admin.email, "update_event", "event", String(id), title)
    revalidatePublicEvents(slug)
    if (slug !== existing.slug) revalidatePublicEvents(existing.slug)
    return NextResponse.json({ ok: true, id, slug })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return NextResponse.json(
        { error: "That slug is already in use." },
        { status: 409 },
      )
    }
    console.error("[admin events PATCH]", err)
    return NextResponse.json({ error: "Could not update event." }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: idParam } = await ctx.params
  const id = Number(idParam)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const existing = await getEventById(id)
  const slug = existing?.slug
  await sql.execute(`DELETE FROM registrations WHERE event_id = ?`, [id])
  await sql.execute(`DELETE FROM events WHERE id = ?`, [id])
  await audit(admin.email, "delete_event", "event", String(id), "")
  revalidatePublicEvents(slug)
  return NextResponse.json({ ok: true })
}
