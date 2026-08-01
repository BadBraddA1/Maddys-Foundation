import { sql } from "@/lib/db"
import { deleteMediaKey, uploadMediaFile } from "@/lib/r2"
import { revalidatePath } from "next/cache"

export type Sponsor = {
  id: number
  name: string
  logo_url: string
  logo_key: string
  website_url: string
  sort_order: number
  is_published: number
  created_at: string
  updated_at: string
}

function mapSponsor(row: Record<string, unknown>): Sponsor {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    logo_url: String(row.logo_url ?? ""),
    logo_key: String(row.logo_key ?? ""),
    website_url: String(row.website_url ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_published: Number(row.is_published ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  }
}

export function revalidateSponsors() {
  revalidatePath("/", "layout")
  revalidatePath("/admin/sponsors")
}

export async function listSponsors(opts?: {
  publishedOnly?: boolean
}): Promise<Sponsor[]> {
  const rows = opts?.publishedOnly
    ? await sql`
        SELECT * FROM sponsors
        WHERE is_published = 1
        ORDER BY sort_order ASC, id ASC
      `
    : await sql`
        SELECT * FROM sponsors
        ORDER BY sort_order ASC, id ASC
      `
  return rows.map(mapSponsor)
}

export async function getSponsor(id: number): Promise<Sponsor | null> {
  const rows = await sql`SELECT * FROM sponsors WHERE id = ${id} LIMIT 1`
  return rows[0] ? mapSponsor(rows[0]) : null
}

export async function createSponsor(opts: {
  name: string
  websiteUrl?: string
  file: File
}): Promise<Sponsor> {
  const name = opts.name.trim().slice(0, 120)
  if (!name) throw new Error("Sponsor name is required")

  const uploaded = await uploadMediaFile({
    file: opts.file,
    folder: "sponsors",
    filename: opts.file.name,
  })

  const maxRows = await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM sponsors`
  const sortOrder = Number(maxRows[0]?.m ?? 0) + 1

  const result = await sql.execute(
    `INSERT INTO sponsors (name, logo_url, logo_key, website_url, sort_order, is_published)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [
      name,
      uploaded.url,
      uploaded.key,
      (opts.websiteUrl ?? "").trim().slice(0, 500),
      sortOrder,
    ],
  )
  const id = Number(result.lastInsertRowid ?? 0)
  const sponsor = await getSponsor(id)
  if (!sponsor) throw new Error("Could not create sponsor")
  revalidateSponsors()
  return sponsor
}

export async function updateSponsor(
  id: number,
  opts: {
    name?: string
    websiteUrl?: string
    isPublished?: boolean
    sortOrder?: number
    file?: File | null
  },
): Promise<Sponsor> {
  const current = await getSponsor(id)
  if (!current) throw new Error("Sponsor not found")

  let logoUrl = current.logo_url
  let logoKey = current.logo_key
  if (opts.file) {
    const uploaded = await uploadMediaFile({
      file: opts.file,
      folder: "sponsors",
      filename: opts.file.name,
    })
    logoUrl = uploaded.url
    logoKey = uploaded.key
    if (current.logo_key && current.logo_key !== logoKey) {
      await deleteMediaKey(current.logo_key).catch(() => undefined)
    }
  }

  await sql.execute(
    `UPDATE sponsors
     SET name = ?, website_url = ?, is_published = ?, sort_order = ?,
         logo_url = ?, logo_key = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      opts.name?.trim().slice(0, 120) || current.name,
      opts.websiteUrl !== undefined
        ? opts.websiteUrl.trim().slice(0, 500)
        : current.website_url,
      opts.isPublished !== undefined
        ? opts.isPublished
          ? 1
          : 0
        : current.is_published,
      opts.sortOrder !== undefined ? opts.sortOrder : current.sort_order,
      logoUrl,
      logoKey,
      id,
    ],
  )

  const updated = await getSponsor(id)
  if (!updated) throw new Error("Sponsor not found")
  revalidateSponsors()
  return updated
}

export async function deleteSponsor(id: number): Promise<void> {
  const current = await getSponsor(id)
  if (!current) return
  await sql.execute(`DELETE FROM sponsors WHERE id = ?`, [id])
  if (current.logo_key) {
    await deleteMediaKey(current.logo_key).catch(() => undefined)
  }
  revalidateSponsors()
}
