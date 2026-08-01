import { NextResponse } from "next/server"
import QRCode from "qrcode"
import { ticketUrlForCode } from "@/lib/registration-emails"
import { getPublicTicketByCode } from "@/lib/ticket"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ code: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params
  const ticket = await getPublicTicketByCode(decodeURIComponent(raw))
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const png = await QRCode.toBuffer(ticketUrlForCode(ticket.code), {
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
