import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { searchTeams } from "@/lib/check-in"
import { findRegistrationIdByCheckInCode } from "@/lib/check-in-code"

export const runtime = "nodejs"

/** Autocomplete paid teams for check-in, or resolve ?code= to a registration id. */
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const eventId = Number(url.searchParams.get("eventId"))
  const q = url.searchParams.get("q") ?? ""
  const code = url.searchParams.get("code") ?? ""

  if (code.trim()) {
    const registrationId = await findRegistrationIdByCheckInCode(
      code,
      Number.isFinite(eventId) && eventId > 0 ? eventId : undefined,
    )
    if (!registrationId) {
      return NextResponse.json({ error: "Code not found." }, { status: 404 })
    }
    return NextResponse.json({ registrationId, code: code.trim().toUpperCase() })
  }

  if (!Number.isFinite(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 })
  }

  const teams = await searchTeams({ eventId, q, limit: 30 })
  return NextResponse.json({ teams })
}
