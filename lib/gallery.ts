import { sql } from "@/lib/db"
import { deleteMediaKey, uploadMediaFile } from "@/lib/r2"
import { revalidatePath } from "next/cache"

export type GalleryImage = {
  id: number
  title: string
  caption: string
  image_url: string
  image_key: string
  sort_order: number
  is_published: number
  created_at: string
  updated_at: string
}

function mapImage(row: Record<string, unknown>): GalleryImage {
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    caption: String(row.caption ?? ""),
    image_url: String(row.image_url ?? ""),
    image_key: String(row.image_key ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_published: Number(row.is_published ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  }
}

export function revalidateGallery() {
  revalidatePath("/gallery")
  revalidatePath("/admin/gallery")
  revalidatePath("/", "layout")
}

export async function listGalleryImages(opts?: {
  publishedOnly?: boolean
}): Promise<GalleryImage[]> {
  const rows = opts?.publishedOnly
    ? await sql`
        SELECT * FROM gallery_images
        WHERE is_published = 1
        ORDER BY sort_order ASC, id DESC
      `
    : await sql`
        SELECT * FROM gallery_images
        ORDER BY sort_order ASC, id DESC
      `
  return rows.map(mapImage)
}

export async function getGalleryImage(id: number): Promise<GalleryImage | null> {
  const rows = await sql`SELECT * FROM gallery_images WHERE id = ${id} LIMIT 1`
  return rows[0] ? mapImage(rows[0]) : null
}

export async function createGalleryImage(opts: {
  title?: string
  caption?: string
  file: File
}): Promise<GalleryImage> {
  const uploaded = await uploadMediaFile({
    file: opts.file,
    folder: "gallery",
    filename: opts.file.name,
  })

  const maxRows =
    await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM gallery_images`
  const sortOrder = Number(maxRows[0]?.m ?? 0) + 1

  const result = await sql.execute(
    `INSERT INTO gallery_images (title, caption, image_url, image_key, sort_order, is_published)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [
      (opts.title ?? "").trim().slice(0, 160),
      (opts.caption ?? "").trim().slice(0, 500),
      uploaded.url,
      uploaded.key,
      sortOrder,
    ],
  )
  const id = Number(result.lastInsertRowid ?? 0)
  const image = await getGalleryImage(id)
  if (!image) throw new Error("Could not create gallery image")
  revalidateGallery()
  return image
}

export async function updateGalleryImage(
  id: number,
  opts: {
    title?: string
    caption?: string
    isPublished?: boolean
    sortOrder?: number
    file?: File | null
  },
): Promise<GalleryImage> {
  const current = await getGalleryImage(id)
  if (!current) throw new Error("Gallery image not found")

  let imageUrl = current.image_url
  let imageKey = current.image_key
  if (opts.file) {
    const uploaded = await uploadMediaFile({
      file: opts.file,
      folder: "gallery",
      filename: opts.file.name,
    })
    imageUrl = uploaded.url
    imageKey = uploaded.key
    if (current.image_key && current.image_key !== imageKey) {
      await deleteMediaKey(current.image_key).catch(() => undefined)
    }
  }

  await sql.execute(
    `UPDATE gallery_images
     SET title = ?, caption = ?, is_published = ?, sort_order = ?,
         image_url = ?, image_key = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      opts.title !== undefined
        ? opts.title.trim().slice(0, 160)
        : current.title,
      opts.caption !== undefined
        ? opts.caption.trim().slice(0, 500)
        : current.caption,
      opts.isPublished !== undefined
        ? opts.isPublished
          ? 1
          : 0
        : current.is_published,
      opts.sortOrder !== undefined ? opts.sortOrder : current.sort_order,
      imageUrl,
      imageKey,
      id,
    ],
  )

  const updated = await getGalleryImage(id)
  if (!updated) throw new Error("Gallery image not found")
  revalidateGallery()
  return updated
}

export async function deleteGalleryImage(id: number): Promise<void> {
  const current = await getGalleryImage(id)
  if (!current) return
  await sql.execute(`DELETE FROM gallery_images WHERE id = ?`, [id])
  if (current.image_key) {
    await deleteMediaKey(current.image_key).catch(() => undefined)
  }
  revalidateGallery()
}
