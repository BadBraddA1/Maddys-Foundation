import { NextResponse } from "next/server"
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES, r2Configured } from "@/lib/r2"
import {
  completeSponsorProfile,
  ensureSponsorPaymentColumns,
  getSponsorByPayToken,
} from "@/lib/sponsors"

export const runtime = "nodejs"

/**
 * After Stripe payment: upload logo + website + point of contact, then publish.
 */
export async function POST(req: Request) {
  await ensureSponsorPaymentColumns().catch(() => undefined)

  if (!r2Configured()) {
    return NextResponse.json(
      { error: "Logo upload is temporarily unavailable." },
      { status: 503 },
    )
  }

  const form = await req.formData()
  const token = String(form.get("token") ?? "").trim()
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 })
  }

  const sponsor = await getSponsorByPayToken(token)
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsorship not found." }, { status: 404 })
  }
  if (sponsor.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Pay for your sponsorship before adding your logo." },
      { status: 400 },
    )
  }
  if (sponsor.is_published && sponsor.logo_url) {
    return NextResponse.json({
      ok: true,
      alreadyComplete: true,
      sponsor: {
        name: sponsor.name,
        levelLabel: sponsor.level_label,
      },
    })
  }

  const contactName = String(form.get("contactName") ?? "")
  const contactEmail = String(form.get("contactEmail") ?? "")
  const contactPhone = String(form.get("contactPhone") ?? "")
  const websiteUrl = String(form.get("websiteUrl") ?? "")
  const file = form.get("logo")

  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Logo file is required." }, { status: 400 })
  }
  if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Logo must be JPEG, PNG, WebP, GIF, or SVG." },
      { status: 400 },
    )
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return NextResponse.json({ error: "Logo must be under 8 MB." }, { status: 400 })
  }
  if (!contactName.trim()) {
    return NextResponse.json(
      { error: "Point of contact is required." },
      { status: 400 },
    )
  }

  try {
    const updated = await completeSponsorProfile(sponsor.id, {
      file,
      contactName,
      contactEmail: contactEmail || sponsor.contact_email,
      contactPhone,
      websiteUrl,
    })
    return NextResponse.json({
      ok: true,
      sponsor: {
        name: updated.name,
        levelLabel: updated.level_label,
        websiteUrl: updated.website_url,
      },
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save sponsor details."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
