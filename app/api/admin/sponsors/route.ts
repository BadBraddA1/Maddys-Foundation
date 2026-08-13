import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES, r2Configured } from "@/lib/r2"
import { assertPackageHasRoom } from "@/lib/sponsor-hold"
import { getSponsorPackage } from "@/lib/sponsor-packages"
import {
  createSponsor,
  deleteSponsor,
  listSponsors,
  updateSponsor,
} from "@/lib/sponsors"

export const runtime = "nodejs"

function collectPackageKeys(form: FormData): string[] {
  const keys = new Set<string>()
  for (const value of form.getAll("packageKeys")) {
    const key = String(value ?? "").trim()
    if (key) keys.add(key)
  }
  // Back-compat single select
  const single = String(form.get("packageKey") ?? "").trim()
  if (single) keys.add(single)
  return [...keys]
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { ensureSponsorPaymentColumns } = await import("@/lib/sponsors")
  await ensureSponsorPaymentColumns().catch(() => undefined)
  const sponsors = await listSponsors()
  return NextResponse.json({ sponsors, r2Configured: r2Configured() })
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!r2Configured()) {
    return NextResponse.json(
      { error: "Media storage is not configured (R2)." },
      { status: 503 },
    )
  }

  const form = await req.formData()
  const name = String(form.get("name") ?? "")
  const websiteUrl = String(form.get("websiteUrl") ?? "")
  const contactName = String(form.get("contactName") ?? "")
  const contactEmail = String(form.get("contactEmail") ?? "")
  const contactPhone = String(form.get("contactPhone") ?? "")
  const contactNotes = String(form.get("contactNotes") ?? "")
  const packageKeys = collectPackageKeys(form)
  const paymentMethod = String(form.get("paymentMethod") ?? "waived").trim()
  // waived | card | check
  const file = form.get("logo")
  if (!(file instanceof File)) {
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

  if (
    paymentMethod !== "waived" &&
    paymentMethod !== "card" &&
    paymentMethod !== "check"
  ) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 })
  }

  if (
    (paymentMethod === "check" || paymentMethod === "card") &&
    packageKeys.length === 0
  ) {
    return NextResponse.json(
      { error: "Choose at least one sponsorship package." },
      { status: 400 },
    )
  }

  // Complimentary with no package → one published row.
  const keysToCreate =
    packageKeys.length > 0 ? packageKeys : paymentMethod === "waived" ? [""] : []

  const resolved: {
    key: string
    label: string
    amountCents: number
  }[] = []

  for (const packageKey of keysToCreate) {
    if (!packageKey) {
      resolved.push({ key: "", label: "", amountCents: 0 })
      continue
    }
    const room = await assertPackageHasRoom(packageKey)
    if (!room.ok) {
      return NextResponse.json({ error: room.error }, { status: 409 })
    }
    resolved.push({
      key: room.package.key,
      label: room.package.label,
      amountCents: room.package.amountCents,
    })
  }

  let paymentStatus: "unpaid" | "paid" | "waived" = "waived"
  let publishNow = true
  let source = "admin"
  let notes = contactNotes

  if (paymentMethod === "card") {
    paymentStatus = "unpaid"
    publishNow = false
    source = "admin"
  } else if (paymentMethod === "check") {
    paymentStatus = "paid"
    publishNow = true
    source = "admin_check"
    const checkNote = "Paid by check"
    notes = notes.trim()
      ? `${notes.trim()}\n${checkNote}`
      : checkNote
  } else {
    paymentStatus = "waived"
    publishNow = true
    source = "admin"
  }

  try {
    const sponsors = []
    let sharedLogoUrl = ""
    let sharedLogoKey = ""

    for (let i = 0; i < resolved.length; i++) {
      const pkg = resolved[i]!
      const amountCents =
        paymentMethod === "waived" && !pkg.key ? 0 : pkg.amountCents

      const sponsor =
        i === 0
          ? await createSponsor({
              name,
              websiteUrl,
              contactName,
              contactEmail,
              contactPhone,
              contactNotes: notes,
              file,
              amountCents,
              paymentStatus,
              levelKey: pkg.key,
              levelLabel: pkg.label,
              publishNow,
              source,
            })
          : await createSponsor({
              name,
              websiteUrl,
              contactName,
              contactEmail,
              contactPhone,
              contactNotes: notes,
              logoUrl: sharedLogoUrl,
              logoKey: sharedLogoKey,
              amountCents,
              paymentStatus,
              levelKey: pkg.key,
              levelLabel: pkg.label,
              publishNow,
              source,
            })

      if (i === 0) {
        sharedLogoUrl = sponsor.logo_url
        sharedLogoKey = sponsor.logo_key
      }
      sponsors.push(sponsor)
    }

    return NextResponse.json(
      { sponsor: sponsors[0], sponsors, count: sponsors.length },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save sponsor."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await req.formData()
  const id = Number(form.get("id"))
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 })
  }

  const file = form.get("logo")
  const logo = file instanceof File && file.size > 0 ? file : null
  if (logo) {
    if (!ALLOWED_MEDIA_TYPES.has(logo.type)) {
      return NextResponse.json(
        { error: "Logo must be JPEG, PNG, WebP, GIF, or SVG." },
        { status: 400 },
      )
    }
    if (logo.size > MAX_MEDIA_BYTES) {
      return NextResponse.json({ error: "Logo must be under 8 MB." }, { status: 400 })
    }
  }

  const publishedRaw = form.get("isPublished")
  const sortRaw = form.get("sortOrder")
  const packageKeyRaw = form.get("packageKey")

  let levelKey: string | undefined
  let levelLabel: string | undefined
  let amountCents: number | undefined

  if (packageKeyRaw != null) {
    const packageKey = String(packageKeyRaw).trim()
    if (packageKey) {
      const pkg = await getSponsorPackage(packageKey)
      if (!pkg) {
        return NextResponse.json(
          { error: "Sponsorship package not found." },
          { status: 404 },
        )
      }
      levelKey = pkg.key
      levelLabel = pkg.label
      amountCents = pkg.amountCents
    } else {
      levelKey = ""
      levelLabel = ""
    }
  }

  try {
    const sponsor = await updateSponsor(id, {
      name: form.has("name") ? String(form.get("name")) : undefined,
      websiteUrl: form.has("websiteUrl")
        ? String(form.get("websiteUrl"))
        : undefined,
      contactName: form.has("contactName")
        ? String(form.get("contactName"))
        : undefined,
      contactEmail: form.has("contactEmail")
        ? String(form.get("contactEmail"))
        : undefined,
      contactPhone: form.has("contactPhone")
        ? String(form.get("contactPhone"))
        : undefined,
      contactNotes: form.has("contactNotes")
        ? String(form.get("contactNotes"))
        : undefined,
      isPublished:
        publishedRaw == null ? undefined : String(publishedRaw) === "1",
      sortOrder:
        sortRaw == null || sortRaw === "" ? undefined : Number(sortRaw),
      file: logo,
      levelKey,
      levelLabel,
      amountCents,
    })
    return NextResponse.json({ sponsor })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const url = new URL(req.url)
  const id = Number(url.searchParams.get("id"))
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 })
  }
  await deleteSponsor(id)
  return NextResponse.json({ ok: true })
}
