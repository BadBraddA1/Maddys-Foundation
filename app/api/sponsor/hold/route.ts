import { NextResponse } from "next/server"
import {
  createSponsorPackageHold,
  releaseSponsorPackageHold,
  ensureSponsorHoldSchema,
} from "@/lib/sponsor-hold"

export const runtime = "nodejs"

type Body = {
  packageKey?: string
  token?: string
}

/** Start or resume a 10-minute package hold. */
export async function POST(req: Request) {
  await ensureSponsorHoldSchema().catch(() => undefined)

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const packageKey = body.packageKey?.trim()
  if (!packageKey) {
    return NextResponse.json({ error: "Package required." }, { status: 400 })
  }

  const result = await createSponsorPackageHold({
    packageKey,
    existingToken: body.token?.trim() || null,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    token: result.token,
    holdExpiresAt: result.holdExpiresAt,
    packageKey: result.package.key,
    label: result.package.label,
    amountCents: result.package.amountCents,
    remaining: result.remaining,
  })
}

/** Release a form hold early (timer expired / start over). */
export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token")?.trim()
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 })
  }
  const released = await releaseSponsorPackageHold(token)
  return NextResponse.json({ ok: true, released })
}
