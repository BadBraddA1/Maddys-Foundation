import { sql } from "@/lib/db"
import { deleteMediaKey, uploadMediaFile } from "@/lib/r2"
import { revalidatePath } from "next/cache"

export type GalleryTag = {
  id: number
  name: string
  slug: string
}

export type GalleryImage = {
  id: number
  title: string
  caption: string
  image_url: string
  image_key: string
  /** @deprecated Prefer freeform `tags`. Kept for legacy rows. */
  event_id: number | null
  event_title: string | null
  event_slug: string | null
  tags: GalleryTag[]
  sort_order: number
  is_published: number
  created_at: string
  updated_at: string
}

function mapImage(row: Record<string, unknown>, tags: GalleryTag[] = []): GalleryImage {
  const eventId = row.event_id
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    caption: String(row.caption ?? ""),
    image_url: String(row.image_url ?? ""),
    image_key: String(row.image_key ?? ""),
    event_id: eventId == null || eventId === "" ? null : Number(eventId),
    event_title: row.event_title == null ? null : String(row.event_title),
    event_slug: row.event_slug == null ? null : String(row.event_slug),
    tags,
    sort_order: Number(row.sort_order ?? 0),
    is_published: Number(row.is_published ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  }
}

function mapTag(row: Record<string, unknown>): GalleryTag {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
  }
}

export function slugifyTagName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return base || "tag"
}

export function revalidateGallery(tagSlug?: string | null) {
  revalidatePath("/gallery")
  revalidatePath("/admin/gallery")
  revalidatePath("/", "layout")
  if (tagSlug) revalidatePath(`/gallery?tag=${tagSlug}`)
}

async function attachTags(images: GalleryImage[]): Promise<GalleryImage[]> {
  if (images.length === 0) return images
  const ids = images.map((i) => i.id)
  const placeholders = ids.map(() => "?").join(", ")
  const rows = await sql.query(
    `SELECT git.image_id, t.id, t.name, t.slug
     FROM gallery_image_tags git
     INNER JOIN gallery_tags t ON t.id = git.tag_id
     WHERE git.image_id IN (${placeholders})
     ORDER BY t.name COLLATE NOCASE ASC`,
    ids,
  )
  const byImage = new Map<number, GalleryTag[]>()
  for (const row of rows) {
    const imageId = Number(row.image_id)
    const list = byImage.get(imageId) ?? []
    list.push(mapTag(row))
    byImage.set(imageId, list)
  }
  return images.map((img) => ({
    ...img,
    tags: byImage.get(img.id) ?? [],
  }))
}

export async function listGalleryTags(): Promise<GalleryTag[]> {
  const rows = await sql`
    SELECT id, name, slug FROM gallery_tags
    ORDER BY name COLLATE NOCASE ASC
  `
  return rows.map(mapTag)
}

/** Tags that have at least one published photo (for public filters). */
export async function listGalleryPublicTags(): Promise<
  Array<GalleryTag & { photoCount: number }>
> {
  const rows = await sql`
    SELECT t.id, t.name, t.slug, COUNT(g.id) AS photo_count
    FROM gallery_tags t
    INNER JOIN gallery_image_tags git ON git.tag_id = t.id
    INNER JOIN gallery_images g ON g.id = git.image_id AND g.is_published = 1
    GROUP BY t.id, t.name, t.slug
    ORDER BY t.name COLLATE NOCASE ASC
  `
  return rows.map((r) => ({
    ...mapTag(r),
    photoCount: Number(r.photo_count ?? 0),
  }))
}

export async function createGalleryTag(name: string): Promise<GalleryTag> {
  const trimmed = name.trim().slice(0, 80)
  if (!trimmed) throw new Error("Tag name is required.")
  let slug = slugifyTagName(trimmed)
  const existing = await sql`SELECT id FROM gallery_tags WHERE slug = ${slug} LIMIT 1`
  if (existing[0]) {
    let n = 2
    while (n < 50) {
      const candidate = `${slug}-${n}`
      const hit =
        await sql`SELECT id FROM gallery_tags WHERE slug = ${candidate} LIMIT 1`
      if (!hit[0]) {
        slug = candidate
        break
      }
      n += 1
    }
  }
  const result = await sql.execute(
    `INSERT INTO gallery_tags (name, slug) VALUES (?, ?)`,
    [trimmed, slug],
  )
  const id = Number(result.lastInsertRowid ?? 0)
  const rows =
    await sql`SELECT id, name, slug FROM gallery_tags WHERE id = ${id} LIMIT 1`
  if (!rows[0]) throw new Error("Could not create tag.")
  revalidateGallery(slug)
  return mapTag(rows[0])
}

export async function deleteGalleryTag(id: number): Promise<void> {
  const rows =
    await sql`SELECT slug FROM gallery_tags WHERE id = ${id} LIMIT 1`
  const slug = rows[0] ? String(rows[0].slug) : null
  await sql.execute(`DELETE FROM gallery_tags WHERE id = ?`, [id])
  revalidateGallery(slug)
}

async function setImageTagIds(imageId: number, tagIds: number[]): Promise<void> {
  const unique = [
    ...new Set(
      tagIds.filter((id) => Number.isFinite(id) && id > 0).map((id) => Number(id)),
    ),
  ]
  await sql.execute(`DELETE FROM gallery_image_tags WHERE image_id = ?`, [imageId])
  for (const tagId of unique) {
    await sql.execute(
      `INSERT OR IGNORE INTO gallery_image_tags (image_id, tag_id) VALUES (?, ?)`,
      [imageId, tagId],
    )
  }
}

export async function listGalleryImages(opts?: {
  publishedOnly?: boolean
  /** Freeform tag slug filter. */
  tagSlug?: string
  /** @deprecated Use tagSlug. */
  eventId?: number
  /** @deprecated Use tagSlug. */
  eventSlug?: string
}): Promise<GalleryImage[]> {
  const publishedOnly = Boolean(opts?.publishedOnly)
  const tagSlug = opts?.tagSlug?.trim()
  const eventId = opts?.eventId
  const eventSlug = opts?.eventSlug?.trim()

  let rows
  if (tagSlug) {
    rows = publishedOnly
      ? await sql`
          SELECT g.*, e.title AS event_title, e.slug AS event_slug
          FROM gallery_images g
          LEFT JOIN events e ON e.id = g.event_id
          INNER JOIN gallery_image_tags git ON git.image_id = g.id
          INNER JOIN gallery_tags t ON t.id = git.tag_id AND t.slug = ${tagSlug}
          WHERE g.is_published = 1
          ORDER BY g.sort_order ASC, g.id DESC
        `
      : await sql`
          SELECT g.*, e.title AS event_title, e.slug AS event_slug
          FROM gallery_images g
          LEFT JOIN events e ON e.id = g.event_id
          INNER JOIN gallery_image_tags git ON git.image_id = g.id
          INNER JOIN gallery_tags t ON t.id = git.tag_id AND t.slug = ${tagSlug}
          ORDER BY g.sort_order ASC, g.id DESC
        `
  } else if (eventSlug) {
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

  return attachTags(rows.map((r) => mapImage(r)))
}

/** @deprecated Prefer listGalleryPublicTags. */
export async function listGalleryEventTags(): Promise<
  Array<{ id: number; title: string; slug: string; photoCount: number }>
> {
  const tags = await listGalleryPublicTags()
  return tags.map((t) => ({
    id: t.id,
    title: t.name,
    slug: t.slug,
    photoCount: t.photoCount,
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
  if (!rows[0]) return null
  const [image] = await attachTags([mapImage(rows[0])])
  return image ?? null
}

function parseEventId(raw: number | null | undefined): number | null {
  if (raw == null) return null
  if (!Number.isFinite(raw) || raw <= 0) return null
  return raw
}

export async function createGalleryImage(opts: {
  title?: string
  caption?: string
  /** @deprecated Prefer tagIds. */
  eventId?: number | null
  tagIds?: number[]
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
  if (opts.tagIds?.length) {
    await setImageTagIds(id, opts.tagIds)
  }
  const image = await getGalleryImage(id)
  if (!image) throw new Error("Could not create gallery image")
  revalidateGallery(image.tags[0]?.slug)
  return image
}

export async function updateGalleryImage(
  id: number,
  opts: {
    title?: string
    caption?: string
    eventId?: number | null
    clearEvent?: boolean
    tagIds?: number[]
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

  if (opts.tagIds !== undefined) {
    await setImageTagIds(id, opts.tagIds)
  }

  const updated = await getGalleryImage(id)
  if (!updated) throw new Error("Gallery image not found")
  revalidateGallery(updated.tags[0]?.slug ?? current.tags[0]?.slug)
  return updated
}

export async function deleteGalleryImage(id: number): Promise<void> {
  const current = await getGalleryImage(id)
  if (!current) return
  await sql.execute(`DELETE FROM gallery_images WHERE id = ?`, [id])
  if (current.image_key) {
    await deleteMediaKey(current.image_key).catch(() => undefined)
  }
  revalidateGallery(current.tags[0]?.slug)
}
