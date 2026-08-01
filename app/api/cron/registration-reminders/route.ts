import { NextResponse } from "next/server"
import {
  listRegistrationsForSevenDayReminder,
  sendTeammateCheckInReminder,
} from "@/lib/registration-emails"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Daily cron: GET /api/cron/registration-reminders
 * Auth: Authorization: Bearer $CRON_SECRET (or ?secret=)
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

  const ids = await listRegistrationsForSevenDayReminder()
  let sent = 0
  let skipped = 0
  let failed = 0

  for (const id of ids) {
    const result = await sendTeammateCheckInReminder(id).catch((err) => {
      console.error("[cron] reminder failed", id, err)
      return { ok: false as const, error: String(err) }
    })
    if (result.ok && result.skipped) skipped += 1
    else if (result.ok) sent += 1
    else failed += 1
  }

  return NextResponse.json({
    ok: true,
    candidates: ids.length,
    sent,
    skipped,
    failed,
  })
}
