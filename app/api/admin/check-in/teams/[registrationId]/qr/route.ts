import { NextResponse } from "next/server"
import QRCode from "qrcode"
import { requireAdmin } from "@/lib/auth"
import { getCheckInTeam } from "@/lib/check-in"
import { publicSiteUrl } from "@/lib/stripe"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ registrationId: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { registrationId: idParam } = await ctx.params
  const registrationId = Number(idParam)
  if (!Number.isFinite(registrationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const team = await getCheckInTeam(registrationId)
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 })
  }

  const url = `${publicSiteUrl()}/ticket/${encodeURIComponent(team.checkInCode)}`
  const dataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
  })

  return NextResponse.json({
    url,
    dataUrl,
    teamName: team.teamName,
    checkInCode: team.checkInCode,
  })
}
