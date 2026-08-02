import { NextResponse } from "next/server"
import {
  buildGoogleWalletSaveUrl,
  googleWalletConfigured,
} from "@/lib/google-wallet"
import { getPublicTicketByCode } from "@/lib/ticket"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ code: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  if (!googleWalletConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Wallet is not configured yet. Add issuer ID + service account (see README).",
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
    const url = buildGoogleWalletSaveUrl({
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
    return NextResponse.redirect(url, 302)
  } catch (err) {
    console.error("[google-wallet team]", err)
    return NextResponse.json(
      { error: "Could not build Google Wallet pass." },
      { status: 500 },
    )
  }
}
