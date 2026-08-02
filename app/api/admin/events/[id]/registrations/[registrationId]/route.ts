import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import {
  deleteAdminRegistration,
  getAdminRegistrationDetail,
  updateAdminRegistration,
} from "@/lib/admin-registrations"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string; registrationId: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: idParam, registrationId: regParam } = await ctx.params
  const eventId = Number(idParam)
  const registrationId = Number(regParam)
  if (!Number.isFinite(eventId) || !Number.isFinite(registrationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const detail = await getAdminRegistrationDetail(eventId, registrationId)
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(detail)
}

export async function PATCH(req: Request, ctx: Ctx) {
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

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const players = Array.isArray(body.players)
    ? body.players.map((p) => {
        const row = p as { id?: number; display_name?: string; email?: string }
        return {
          id: row.id,
          display_name: String(row.display_name ?? ""),
          email: String(row.email ?? ""),
        }
      })
    : undefined

  const result = await updateAdminRegistration(
    eventId,
    registrationId,
    {
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      phone: body.phone != null ? String(body.phone) : undefined,
      team_name: body.team_name != null ? String(body.team_name) : undefined,
      guests: body.guests != null ? Number(body.guests) : undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
      players,
    },
    admin.email,
  )

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctx: Ctx) {
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

  const result = await deleteAdminRegistration(
    eventId,
    registrationId,
    admin.email,
  )
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
