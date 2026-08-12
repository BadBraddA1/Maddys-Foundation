import { NextResponse } from "next/server"
import { releaseExpiredHolds } from "@/lib/registration-hold"
import { releaseExpiredSponsorHolds } from "@/lib/sponsor-hold"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Optional cron: GET /api/cron/release-holds
 * Auth: Authorization: Bearer $CRON_SECRET (or ?secret=)
 * Releases expired registration + sponsor package holds.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  const header = req.headers.get("authorization")
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null
  const url = new URL(req.url)
  const querySecret = url.searchParams.get("secret")

  if (secret && bearer !== secret && querySecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [registrations, sponsors] = await Promise.all([
    releaseExpiredHolds(),
    releaseExpiredSponsorHolds(),
  ])
  return NextResponse.json({
    ok: true,
    released: registrations + sponsors,
    registrations,
    sponsors,
  })
}
