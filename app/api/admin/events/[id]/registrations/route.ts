import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAdminRegistration } from "@/lib/admin-registrations"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

/** Staff: manually add a paid registration (+ optional player roster). */
export async function POST(req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: idParam } = await ctx.params
  const eventId = Number(idParam)
  if (!Number.isFinite(eventId)) {
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

  const result = await createAdminRegistration(
    eventId,
    {
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      phone: body.phone != null ? String(body.phone) : undefined,
      team_name: body.team_name != null ? String(body.team_name) : undefined,
      guests: body.guests != null ? Number(body.guests) : undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
      players,
      paid: body.paid !== false,
      send_confirmation: body.send_confirmation !== false,
    },
    admin.email,
  )

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true, id: result.id })
}
