import { NextResponse } from "next/server"
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES, r2Configured } from "@/lib/r2"
import {
  getSponsorLevel,
  parseUsdToCents,
} from "@/lib/sponsor-levels"
import { createSponsorCheckoutSession } from "@/lib/sponsor-checkout"
import { createSponsor, ensureSponsorPaymentColumns } from "@/lib/sponsors"
import { stripeConfigured } from "@/lib/stripe"

export const runtime = "nodejs"

/**
 * Public sponsorship signup: pick a level (or custom $), upload logo, pay by card.
 */
export async function POST(req: Request) {
  await ensureSponsorPaymentColumns().catch(() => undefined)

  if (!r2Configured()) {
    return NextResponse.json(
      { error: "Sponsor uploads are not available right now." },
      { status: 503 },
    )
  }

  const form = await req.formData()
  const name = String(form.get("name") ?? "")
  const websiteUrl = String(form.get("websiteUrl") ?? "")
  const contactName = String(form.get("contactName") ?? "")
  const contactEmail = String(form.get("contactEmail") ?? "")
  const contactPhone = String(form.get("contactPhone") ?? "")
  const levelKey = String(form.get("levelKey") ?? "custom")
  const customAmount = String(form.get("customAmount") ?? "")
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
  if (!contactEmail.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 })
  }

  const level = getSponsorLevel(levelKey) || getSponsorLevel("custom")!
  let amountCents = level.amountCents
  if (amountCents == null) {
    amountCents = parseUsdToCents(customAmount)
  }
  if (!amountCents || amountCents < 500) {
    return NextResponse.json(
      { error: "Enter a sponsorship amount of at least $5." },
      { status: 400 },
    )
  }

  try {
    const sponsor = await createSponsor({
      name,
      websiteUrl,
      contactName,
      contactEmail,
      contactPhone,
      file,
      amountCents,
      paymentStatus: "unpaid",
      levelKey: level.key,
      levelLabel: level.label,
      publishNow: false,
      source: "public_level",
    })

    if (!stripeConfigured()) {
      return NextResponse.json({
        sponsorId: sponsor.id,
        payToken: sponsor.pay_token,
        payPath: `/sponsor/pay/${sponsor.pay_token}`,
        checkoutUrl: null,
        message:
          "Saved — card checkout is offline; open your pay link for Venmo instructions.",
      })
    }

    const session = await createSponsorCheckoutSession({ sponsor })
    return NextResponse.json({
      sponsorId: sponsor.id,
      payToken: sponsor.pay_token,
      payPath: `/sponsor/pay/${sponsor.pay_token}`,
      checkoutUrl: session?.url ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start sponsorship."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
