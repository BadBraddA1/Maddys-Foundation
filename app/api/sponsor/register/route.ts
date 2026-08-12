import { NextResponse } from "next/server"
import { createSponsorCheckoutSession } from "@/lib/sponsor-checkout"
import {
  consumeSponsorPackageHold,
  ensureSponsorHoldSchema,
  getActiveSponsorPackageHold,
  packageSlotsUsed,
  releaseExpiredSponsorHolds,
  releaseSponsorPackageHold,
} from "@/lib/sponsor-hold"
import { resolveHoldExpiresAt } from "@/lib/sponsor-hold-shared"
import { getSponsorPackage } from "@/lib/sponsor-packages"
import {
  createPublicSponsorDraft,
  ensureSponsorPaymentColumns,
} from "@/lib/sponsors"
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES, r2Configured } from "@/lib/r2"
import { stripeConfigured } from "@/lib/stripe"

export const runtime = "nodejs"

/**
 * Public sponsorship checkout:
 * full profile (logo + contacts) → consume 10-minute hold → unpaid draft → Stripe.
 */
export async function POST(req: Request) {
  await ensureSponsorPaymentColumns().catch(() => undefined)
  await ensureSponsorHoldSchema().catch(() => undefined)
  await releaseExpiredSponsorHolds().catch(() => undefined)

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Card checkout is not available right now." },
      { status: 503 },
    )
  }
  if (!r2Configured()) {
    return NextResponse.json(
      { error: "Logo upload is temporarily unavailable." },
      { status: 503 },
    )
  }

  const form = await req.formData()
  const packageKey = String(form.get("packageKey") ?? "").trim()
  const holdToken = String(form.get("holdToken") ?? "").trim()
  const holdExpiresAtRaw = form.get("holdExpiresAt")
  const name = String(form.get("name") ?? "").trim()
  const email = String(form.get("email") ?? "").trim()
  const contactName = String(form.get("contactName") ?? "").trim()
  const contactPhone = String(form.get("contactPhone") ?? "").trim()
  const websiteUrl = String(form.get("websiteUrl") ?? "").trim()
  const file = form.get("logo")

  if (!packageKey || !holdToken) {
    return NextResponse.json(
      { error: "Select a sponsorship package to continue." },
      { status: 400 },
    )
  }
  if (!name) {
    return NextResponse.json(
      { error: "Business or sponsor name is required." },
      { status: 400 },
    )
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email is required for checkout." },
      { status: 400 },
    )
  }
  if (!contactName) {
    return NextResponse.json(
      { error: "Point of contact is required." },
      { status: 400 },
    )
  }
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

  const holdResolved = resolveHoldExpiresAt(holdExpiresAtRaw)
  if (!holdResolved.ok) {
    await releaseSponsorPackageHold(holdToken).catch(() => undefined)
    return NextResponse.json({ error: holdResolved.error }, { status: 409 })
  }

  const hold = await getActiveSponsorPackageHold(holdToken, packageKey)
  if (!hold) {
    return NextResponse.json(
      {
        error:
          "Your sponsorship hold expired. Pick a package again to start a new 10-minute timer.",
      },
      { status: 409 },
    )
  }

  const pkg = await getSponsorPackage(packageKey)
  if (!pkg) {
    return NextResponse.json(
      { error: "Sponsorship package not found." },
      { status: 404 },
    )
  }

  if (pkg.quantity != null) {
    const used = await packageSlotsUsed(pkg.key)
    if (used > pkg.quantity) {
      await releaseSponsorPackageHold(holdToken).catch(() => undefined)
      return NextResponse.json(
        { error: "This sponsorship just sold out." },
        { status: 409 },
      )
    }
  }

  const holdExpiresAt = Math.min(
    hold.hold_expires_at,
    holdResolved.holdExpiresAt,
  )

  let sponsor
  try {
    sponsor = await createPublicSponsorDraft({
      name,
      contactEmail: email,
      contactName,
      contactPhone,
      websiteUrl,
      file,
      amountCents: pkg.amountCents,
      levelKey: pkg.key,
      levelLabel: pkg.label,
      holdExpiresAt,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not start sponsorship."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await consumeSponsorPackageHold(holdToken)

  const session = await createSponsorCheckoutSession({
    sponsor,
    holdExpiresAt,
  })

  if (!session) {
    const { dropUnpaidPublicSponsor } = await import("@/lib/sponsor-hold")
    await dropUnpaidPublicSponsor({ sponsorId: sponsor.id }).catch(() => undefined)
    return NextResponse.json(
      { error: "Could not open Stripe checkout. Try again." },
      { status: 503 },
    )
  }

  return NextResponse.json({
    ok: true,
    checkoutUrl: session.url,
    holdExpiresAt: session.holdExpiresAt,
    payToken: sponsor.pay_token,
  })
}
