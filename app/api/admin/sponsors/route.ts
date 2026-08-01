import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES, r2Configured } from "@/lib/r2"
import {
  createSponsor,
  deleteSponsor,
  listSponsors,
  updateSponsor,
} from "@/lib/sponsors"

export const runtime = "nodejs"

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
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

  try {
    const sponsor = await createSponsor({
      name,
      websiteUrl,
      contactName,
      contactEmail,
      contactPhone,
      contactNotes,
      file,
    })
    return NextResponse.json({ sponsor }, { status: 201 })
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
