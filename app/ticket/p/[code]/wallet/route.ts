import { NextResponse } from "next/server"
import {
  appleWalletConfigured,
  buildTicketPkpass,
} from "@/lib/apple-wallet"
import { getPublicPlayerTicketByCode } from "@/lib/ticket"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ code: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  if (!appleWalletConfigured()) {
    return NextResponse.json(
      {
        error:
          "Apple Wallet is not configured yet. Add Pass Type ID certificates (see README).",
      },
      { status: 503 },
    )
  }

  const { code: raw } = await ctx.params
  const ticket = await getPublicPlayerTicketByCode(decodeURIComponent(raw))
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const buf = await buildTicketPkpass({
      kind: "player",
      code: ticket.code,
      serialSuffix: String(ticket.playerId),
      eventTitle: ticket.eventTitle,
      eventSlug: ticket.eventSlug,
      eventWhenLabel: ticket.eventWhen,
      eventStartsAt: ticket.eventStartsAt,
      eventLocation: ticket.eventLocation,
      teamName: ticket.teamName,
      holderLabel: "PLAYER",
      holderName: ticket.playerName,
      venueLatitude: ticket.venueLatitude,
      venueLongitude: ticket.venueLongitude,
    })

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="maddy-${ticket.code}.pkpass"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[wallet player]", err)
    return NextResponse.json(
      { error: "Could not build Apple Wallet pass." },
      { status: 500 },
    )
  }
}
