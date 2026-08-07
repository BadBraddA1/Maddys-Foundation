import { NextResponse } from "next/server"
import { startCheckoutForPayToken } from "@/lib/sponsor-checkout"
import { ensureSponsorPaymentColumns } from "@/lib/sponsors"

export const runtime = "nodejs"

export async function POST(req: Request) {
  await ensureSponsorPaymentColumns().catch(() => undefined)
  const body = (await req.json().catch(() => null)) as { token?: string } | null
  const token = String(body?.token ?? "").trim()
  if (!token) {
    return NextResponse.json({ error: "Missing pay token." }, { status: 400 })
  }
  const result = await startCheckoutForPayToken(token)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ url: result.url })
}
