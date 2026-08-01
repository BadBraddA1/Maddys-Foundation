import { sql } from "@/lib/db"
import { deleteMediaKey, uploadMediaFile } from "@/lib/r2"
import { revalidatePath } from "next/cache"

export type GalleryImage = {
  id: number
  title: string
  caption: string
  image_url: string
  image_key: string
  /** Tagged event (optional). */
  event_id: number | null
  event_title: string | null
  event_slug: string | null
  sort_order: number
  is_published: number
  created_at: string
  updated_at: string
}

function mapImage(row: Record<string, unknown>): GalleryImage {
  const eventId = row.event_id
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    caption: String(row.caption ?? ""),
    image_url: String(row.image_url ?? ""),
    image_key: String(row.image_key ?? ""),
    event_id:
      eventId == null || eventId === "" ? null : Number(eventId),
    event_title: row.event_title == null ? null : String(row.event_title),
    event_slug: row.event_slug == null ? null : String(row.event_slug),
    sort_order: Number(row.sort_order ?? 0),
    is_published: Number(row.is_published ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  }
}

export function revalidateGallery(eventSlug?: string | null) {
  revalidatePath("/gallery")
  revalidatePath("/admin/gallery")
  revalidatePath("/", "layout")
  if (eventSlug) revalidatePath(`/events/${eventSlug}`)
}

export async function listGalleryImages(opts?: {
  publishedOnly?: boolean
  eventId?: number
  eventSlug?: string
}): Promise<GalleryImage[]> {
  const publishedOnly = Boolean(opts?.publishedOnly)
  const eventId = opts?.eventId
  const eventSlug = opts?.eventSlug?.trim()

  let rows
  if (eventSlug) {
    rows = publishedOnly
      ? await sql`
          SELECT g.*, e.title AS event_title, e.slug AS event_slug
          FROM gallery_images g
          LEFT JOIN events e ON e.id = g.event_id
          WHERE g.is_published = 1 AND e.slug = ${eventSlug}
          ORDER BY g.sort_order ASC, g.id DESC
        `
      : await sql`
          SELECT g.*, e.title AS event_title, e.slug AS event_slug
          FROM gallery_images g
          LEFT JOIN events e ON e.id = g.event_id
          WHERE e.slug = ${eventSlug}
          ORDER BY g.sort_order ASC, g.id DESC
        `
  } else if (eventId && Number.isFinite(eventId) && eventId > 0) {
    rows = publishedOnly
      ? await sql`
          SELECT g.*, e.title AS event_title, e.slug AS event_slug
          FROM gallery_images g
          LEFT JOIN events e ON e.id = g.event_id
          WHERE g.is_published = 1 AND g.event_id = ${eventId}
          ORDER BY g.sort_order ASC, g.id DESC
        `
      : await sql`
          SELECT g.*, e.title AS event_title, e.slug AS event_slug
          FROM gallery_images g
          LEFT JOIN events e ON e.id = g.event_id
          WHERE g.event_id = ${eventId}
          ORDER BY g.sort_order ASC, g.id DESC
        `
  } else if (publishedOnly) {
    rows = await sql`
      SELECT g.*, e.title AS event_title, e.slug AS event_slug
      FROM gallery_images g
      LEFT JOIN events e ON e.id = g.event_id
      WHERE g.is_published = 1
      ORDER BY g.sort_order ASC, g.id DESC
    `
  } else {
    rows = await sql`
      SELECT g.*, e.title AS event_title, e.slug AS event_slug
      FROM gallery_images g
      LEFT JOIN events e ON e.id = g.event_id
      ORDER BY g.sort_order ASC, g.id DESC
    `
  }

  return rows.map(mapImage)
}

/** Distinct events that have at least one published gallery photo. */
export async function listGalleryEventTags(): Promise<
  Array<{ id: number; title: string; slug: string; photoCount: number }>
> {
  const rows = await sql`
    SELECT e.id, e.title, e.slug, COUNT(g.id) AS photo_count
    FROM events e
    INNER JOIN gallery_images g ON g.event_id = e.id AND g.is_published = 1
    GROUP BY e.id, e.title, e.slug
    ORDER BY e.starts_at DESC
  `
  return rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    slug: String(r.slug),
    photoCount: Number(r.photo_count ?? 0),
  }))
}

export async function getGalleryImage(id: number): Promise<GalleryImage | null> {
  const rows = await sql`
    SELECT g.*, e.title AS event_title, e.slug AS event_slug
    FROM gallery_images g
    LEFT JOIN events e ON e.id = g.event_id
    WHERE g.id = ${id}
    LIMIT 1
  `
  return rows[0] ? mapImage(rows[0]) : null
}

function parseEventId(raw: number | null | undefined): number | null {
  if (raw == null) return null
  if (!Number.isFinite(raw) || raw <= 0) return null
  return raw
}

export async function createGalleryImage(opts: {
  title?: string
  caption?: string
  eventId?: number | null
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
  const eventId = parseEventId(opts.eventId)

  const result = await sql.execute(
    `INSERT INTO gallery_images
      (title, caption, image_url, image_key, sort_order, is_published, event_id)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      (opts.title ?? "").trim().slice(0, 160),
      (opts.caption ?? "").trim().slice(0, 500),
      uploaded.url,
      uploaded.key,
      sortOrder,
      eventId,
    ],
  )
  const id = Number(result.lastInsertRowid ?? 0)
  const image = await getGalleryImage(id)
  if (!image) throw new Error("Could not create gallery image")
  revalidateGallery(image.event_slug)
  return image
}

export async function updateGalleryImage(
  id: number,
  opts: {
    title?: string
    caption?: string
    eventId?: number | null
    clearEvent?: boolean
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

  let nextEventId = current.event_id
  if (opts.clearEvent) nextEventId = null
  else if (opts.eventId !== undefined) nextEventId = parseEventId(opts.eventId)

  await sql.execute(
    `UPDATE gallery_images
     SET title = ?, caption = ?, is_published = ?, sort_order = ?,
         image_url = ?, image_key = ?, event_id = ?,
         updated_at = CURRENT_TIMESTAMP
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
      nextEventId,
      id,
    ],
  )

  const updated = await getGalleryImage(id)
  if (!updated) throw new Error("Gallery image not found")
  revalidateGallery(updated.event_slug ?? current.event_slug)
  return updated
}

export async function deleteGalleryImage(id: number): Promise<void> {
  const current = await getGalleryImage(id)
  if (!current) return
  await sql.execute(`DELETE FROM gallery_images WHERE id = ?`, [id])
  if (current.image_key) {
    await deleteMediaKey(current.image_key).catch(() => undefined)
  }
  revalidateGallery(current.event_slug)
}
