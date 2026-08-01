import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getCheckInTeam } from "@/lib/check-in"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ registrationId: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { registrationId: idParam } = await ctx.params
  const registrationId = Number(idParam)
  if (!Number.isFinite(registrationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const team = await getCheckInTeam(registrationId)
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 })
  }
  return NextResponse.json({ team })
}
