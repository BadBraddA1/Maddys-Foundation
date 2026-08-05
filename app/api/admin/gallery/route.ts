import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import {
  createGalleryImage,
  deleteGalleryImage,
  listGalleryImages,
  listGalleryTags,
  updateGalleryImage,
} from "@/lib/gallery"
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES, r2Configured } from "@/lib/r2"

export const runtime = "nodejs"
export const maxDuration = 60

function parseTagIds(form: FormData): number[] | undefined {
  if (!form.has("tagIds") && !form.has("tagId")) return undefined
  const raw: string[] = []
  for (const value of form.getAll("tagIds")) {
    raw.push(String(value))
  }
  for (const value of form.getAll("tagId")) {
    raw.push(String(value))
  }
  // Also accept comma-separated single field
  const flat = raw
    .flatMap((s) => s.split(","))
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
  return [...new Set(flat)]
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const [images, tags] = await Promise.all([
    listGalleryImages(),
    listGalleryTags(),
  ])
  return NextResponse.json({
    images,
    tags,
    r2Configured: r2Configured(),
  })
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
  const title = String(form.get("title") ?? "")
  const caption = String(form.get("caption") ?? "")
  const tagIds = parseTagIds(form) ?? []
  const file = form.get("image")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 })
  }
  if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Image must be JPEG, PNG, WebP, GIF, or SVG." },
      { status: 400 },
    )
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return NextResponse.json({ error: "Image must be under 8 MB." }, { status: 400 })
  }

  try {
    const image = await createGalleryImage({
      title,
      caption,
      tagIds,
      file,
    })
    return NextResponse.json({ image }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save image."
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

  const file = form.get("image")
  const image = file instanceof File && file.size > 0 ? file : null
  if (image) {
    if (!ALLOWED_MEDIA_TYPES.has(image.type)) {
      return NextResponse.json(
        { error: "Image must be JPEG, PNG, WebP, GIF, or SVG." },
        { status: 400 },
      )
    }
    if (image.size > MAX_MEDIA_BYTES) {
      return NextResponse.json({ error: "Image must be under 8 MB." }, { status: 400 })
    }
  }

  const publishedRaw = form.get("isPublished")
  const sortRaw = form.get("sortOrder")
  const tagIds = parseTagIds(form)

  try {
    const updated = await updateGalleryImage(id, {
      title: form.has("title") ? String(form.get("title")) : undefined,
      caption: form.has("caption") ? String(form.get("caption")) : undefined,
      isPublished:
        publishedRaw == null ? undefined : String(publishedRaw) === "1",
      sortOrder:
        sortRaw == null || sortRaw === "" ? undefined : Number(sortRaw),
      file: image,
      tagIds,
    })
    return NextResponse.json({ image: updated })
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
  await deleteGalleryImage(id)
  return NextResponse.json({ ok: true })
}
