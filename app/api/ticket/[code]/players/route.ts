import { NextResponse } from "next/server"
import { saveAndSendPlayerTickets } from "@/lib/registration-emails"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ code: string }> }

/** Simple in-memory rate limit per team code (best-effort on a single instance). */
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(key: string, limit = 12, windowMs = 10 * 60 * 1000) {
  const now = Date.now()
  const cur = hits.get(key)
  if (!cur || now > cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  cur.count += 1
  return cur.count > limit
}

/**
 * Captain share: authenticated by team check-in code in the URL.
 * Body: { players: [{ id, email }], forceResend?: boolean }
 */
export async function POST(req: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params
  const teamCode = decodeURIComponent(raw).trim().toUpperCase()
  if (!teamCode) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 })
  }

  if (rateLimited(`ticket-share:${teamCode}`)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429 },
    )
  }

  let body: {
    players?: Array<{ id?: number; email?: string }>
    forceResend?: boolean
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const players = Array.isArray(body.players)
    ? body.players
        .map((p) => ({
          id: Number(p.id),
          email: String(p.email ?? "").trim(),
        }))
        .filter((p) => Number.isFinite(p.id) && p.id > 0)
    : []

  if (players.length === 0) {
    return NextResponse.json(
      { error: "Add at least one player email." },
      { status: 400 },
    )
  }

  const result = await saveAndSendPlayerTickets({
    teamCode,
    players,
    forceResend: Boolean(body.forceResend),
  })

  if (!result.ok && result.sent === 0 && result.skipped === 0) {
    return NextResponse.json(
      { error: result.error || "Could not send tickets.", failed: result.failed },
      { status: result.error?.includes("not found") ? 404 : 400 },
    )
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    error: result.error,
  })
}
