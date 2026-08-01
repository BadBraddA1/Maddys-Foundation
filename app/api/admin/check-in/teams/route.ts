import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { searchTeams } from "@/lib/check-in"

export const runtime = "nodejs"

/** Autocomplete paid teams for check-in. */
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const eventId = Number(url.searchParams.get("eventId"))
  const q = url.searchParams.get("q") ?? ""
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 })
  }

  const teams = await searchTeams({ eventId, q, limit: 30 })
  return NextResponse.json({ teams })
}
