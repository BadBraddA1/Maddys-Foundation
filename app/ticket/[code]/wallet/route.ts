import { NextResponse } from "next/server"
import {
  appleWalletConfigured,
  buildTicketPkpass,
} from "@/lib/apple-wallet"
import { getPublicTicketByCode } from "@/lib/ticket"

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
  const ticket = await getPublicTicketByCode(decodeURIComponent(raw))
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const buf = await buildTicketPkpass({
      kind: "team",
      code: ticket.code,
      serialSuffix: String(ticket.registrationId),
      eventTitle: ticket.eventTitle,
      eventSlug: ticket.eventSlug,
      eventWhenLabel: ticket.eventWhen,
      eventStartsAt: ticket.eventStartsAt,
      eventLocation: ticket.eventLocation,
      teamName: ticket.teamName,
      holderLabel: "CAPTAIN",
      holderName: ticket.captainName,
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
    console.error("[wallet team]", err)
    return NextResponse.json(
      { error: "Could not build Apple Wallet pass." },
      { status: 500 },
    )
  }
}
