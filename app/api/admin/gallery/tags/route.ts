import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import {
  createGalleryTag,
  deleteGalleryTag,
  listGalleryTags,
} from "@/lib/gallery"

export const runtime = "nodejs"

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const tags = await listGalleryTags()
  return NextResponse.json({ tags })
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const form = await req.formData()
  const name = String(form.get("name") ?? "")
  try {
    const tag = await createGalleryTag(name)
    return NextResponse.json({ tag }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create tag."
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
  await deleteGalleryTag(id)
  return NextResponse.json({ ok: true })
}
