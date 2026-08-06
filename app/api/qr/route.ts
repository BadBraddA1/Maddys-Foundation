import { NextResponse } from "next/server"
import QRCode from "qrcode"
import { publicSiteUrl } from "@/lib/stripe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Public QR PNG for email / tickets.
 * Only encodes URLs under this site's ticket paths (no open redirect / open QR proxy).
 *
 * GET /api/qr?data=https://maddysfoundation.org/ticket/OV-XXXX
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("data")?.trim() || ""
  if (!raw) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  const site = new URL(publicSiteUrl())
  if (target.origin !== site.origin) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 })
  }
  const path = target.pathname
  if (
    !path.startsWith("/ticket/") &&
    !path.startsWith("/ticket/p/")
  ) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 })
  }

  const png = await QRCode.toBuffer(target.toString(), {
    type: "png",
    width: 280,
    margin: 1,
    errorCorrectionLevel: "M",
  })

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
