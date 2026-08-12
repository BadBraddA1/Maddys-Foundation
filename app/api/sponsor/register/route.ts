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
import { stripeConfigured } from "@/lib/stripe"

export const runtime = "nodejs"

type Body = {
  packageKey?: string
  holdToken?: string
  holdExpiresAt?: number
  name?: string
  email?: string
}

/**
 * Public sponsorship checkout:
 * consume 10-minute package hold → unpaid draft → Stripe Checkout.
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

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const packageKey = String(body.packageKey ?? "").trim()
  const holdToken = String(body.holdToken ?? "").trim()
  const name = String(body.name ?? "").trim()
  const email = String(body.email ?? "").trim()

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

  const holdResolved = resolveHoldExpiresAt(body.holdExpiresAt)
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
    // Hold already counts toward used; ensure capacity still allows this slot.
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
