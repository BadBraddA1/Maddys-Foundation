import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getCheckInDashboard } from "@/lib/check-in"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const eventId = Number(new URL(req.url).searchParams.get("eventId"))
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 })
  }

  const data = await getCheckInDashboard(eventId)
  return NextResponse.json(data)
}
