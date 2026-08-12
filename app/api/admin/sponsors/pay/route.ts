import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { sendSponsorPayInvite } from "@/lib/sponsor-emails"
import { createSponsorCheckoutSession } from "@/lib/sponsor-checkout"
import { assertPackageHasRoom } from "@/lib/sponsor-hold"
import { getSponsorPackage } from "@/lib/sponsor-packages"
import {
  ensureSponsorPaymentColumns,
  getSponsor,
  markSponsorPaid,
  updateSponsor,
} from "@/lib/sponsors"
import { parseUsdToCents } from "@/lib/sponsor-levels"
import { publicSiteUrl } from "@/lib/stripe"

export const runtime = "nodejs"

/** Admin: set amount, send Stripe pay email, mark paid (check/manual), or open Stripe. */
export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureSponsorPaymentColumns().catch(() => undefined)

  const body = (await req.json().catch(() => null)) as {
    action?: string
    sponsorId?: number
    amountUsd?: string
    levelLabel?: string
    packageKey?: string
    via?: string
  } | null

  const sponsorId = Number(body?.sponsorId ?? 0)
  if (!Number.isFinite(sponsorId) || sponsorId <= 0) {
    return NextResponse.json({ error: "Invalid sponsor." }, { status: 400 })
  }

  const action = String(body?.action ?? "")
  let sponsor = await getSponsor(sponsorId)
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found." }, { status: 404 })
  }

  if (action === "set_amount") {
    const cents = parseUsdToCents(String(body?.amountUsd ?? ""))
    if (!cents) {
      return NextResponse.json(
        { error: "Enter a valid dollar amount." },
        { status: 400 },
      )
    }
    const packageKey = String(body?.packageKey ?? "").trim()
    let levelKey = sponsor.level_key
    let levelLabel = body?.levelLabel?.trim() || sponsor.level_label
    if (packageKey) {
      const room = await assertPackageHasRoom(packageKey)
      if (!room.ok && packageKey !== sponsor.level_key) {
        return NextResponse.json({ error: room.error }, { status: 409 })
      }
      const pkg = room.ok ? room.package : await getSponsorPackage(packageKey)
      if (!pkg) {
        return NextResponse.json(
          { error: "Sponsorship package not found." },
          { status: 404 },
        )
      }
      levelKey = pkg.key
      levelLabel = pkg.label
    }
    sponsor = await updateSponsor(sponsorId, {
      amountCents: cents,
      paymentStatus: "unpaid",
      isPublished: false,
      ensurePayToken: true,
      levelKey,
      levelLabel,
    })
    return NextResponse.json({
      sponsor,
      payUrl: `${publicSiteUrl()}/sponsor/pay/${sponsor.pay_token}`,
    })
  }

  if (action === "send_invite") {
    if (sponsor.amount_cents <= 0 || sponsor.payment_status === "paid") {
      return NextResponse.json(
        { error: "Set an unpaid amount first." },
        { status: 400 },
      )
    }
    sponsor = await updateSponsor(sponsorId, {
      ensurePayToken: true,
      paymentStatus: "unpaid",
      isPublished: false,
    })
    const result = await sendSponsorPayInvite(sponsor)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({
      ok: true,
      payUrl: `${publicSiteUrl()}/sponsor/pay/${sponsor.pay_token}`,
    })
  }

  if (action === "mark_paid" || action === "mark_paid_check") {
    const packageKey = String(body?.packageKey ?? "").trim()
    const viaCheck = action === "mark_paid_check" || body?.via === "check"

    if (packageKey && packageKey !== sponsor.level_key) {
      const room = await assertPackageHasRoom(packageKey)
      if (!room.ok) {
        return NextResponse.json({ error: room.error }, { status: 409 })
      }
      sponsor = await updateSponsor(sponsorId, {
        levelKey: room.package.key,
        levelLabel: room.package.label,
        amountCents: room.package.amountCents || sponsor.amount_cents,
      })
    } else if (viaCheck && !sponsor.level_key) {
      if (!packageKey) {
        return NextResponse.json(
          { error: "Choose which sponsorship package they took." },
          { status: 400 },
        )
      }
      const room = await assertPackageHasRoom(packageKey)
      if (!room.ok) {
        return NextResponse.json({ error: room.error }, { status: 409 })
      }
      sponsor = await updateSponsor(sponsorId, {
        levelKey: room.package.key,
        levelLabel: room.package.label,
        amountCents: room.package.amountCents || sponsor.amount_cents,
      })
    }

    if (viaCheck) {
      const note = "Paid by check"
      const notes = sponsor.contact_notes.includes(note)
        ? sponsor.contact_notes
        : sponsor.contact_notes.trim()
          ? `${sponsor.contact_notes.trim()}\n${note}`
          : note
      await sql.execute(
        `UPDATE sponsors
         SET source = CASE WHEN source = 'public' THEN source ELSE 'admin_check' END,
             contact_notes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [notes, sponsorId],
      )
    }

    sponsor = (await markSponsorPaid(sponsorId, {
      via: viaCheck ? "admin_check" : "admin_manual",
    }))!
    return NextResponse.json({ sponsor })
  }

  if (action === "stripe_checkout") {
    if (sponsor.payment_status === "paid") {
      return NextResponse.json({ error: "Already paid." }, { status: 400 })
    }
    sponsor = await updateSponsor(sponsorId, { ensurePayToken: true })
    const session = await createSponsorCheckoutSession({ sponsor })
    if (!session) {
      return NextResponse.json(
        { error: "Stripe checkout unavailable." },
        { status: 503 },
      )
    }
    return NextResponse.json({ url: session.url })
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 })
}
