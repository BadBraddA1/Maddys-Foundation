import { NextResponse } from "next/server"
import QRCode from "qrcode"
import { getPublicPlayerTicketByCode, playerTicketUrlForCode } from "@/lib/ticket"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ code: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params
  const ticket = await getPublicPlayerTicketByCode(decodeURIComponent(raw))
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const png = await QRCode.toBuffer(playerTicketUrlForCode(ticket.code), {
    type: "png",
    width: 280,
    margin: 1,
    errorCorrectionLevel: "M",
  })

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
