import { sql } from "@/lib/db"
import { deleteMediaKey, uploadMediaFile } from "@/lib/r2"
import { revalidatePath } from "next/cache"

export type Sponsor = {
  id: number
  name: string
  logo_url: string
  logo_key: string
  website_url: string
  /** Staff-only — not shown on the public site. */
  contact_name: string
  contact_email: string
  contact_phone: string
  contact_notes: string
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
    contact_name: String(row.contact_name ?? ""),
    contact_email: String(row.contact_email ?? ""),
    contact_phone: String(row.contact_phone ?? ""),
    contact_notes: String(row.contact_notes ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_published: Number(row.is_published ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  }
}

/** Public footer payload — never includes contact fields. */
export type PublicSponsor = Pick<
  Sponsor,
  "id" | "name" | "logo_url" | "website_url" | "sort_order"
>

function mapPublicSponsor(row: Record<string, unknown>): PublicSponsor {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    logo_url: String(row.logo_url ?? ""),
    website_url: String(row.website_url ?? ""),
    sort_order: Number(row.sort_order ?? 0),
  }
}

export function revalidateSponsors() {
  revalidatePath("/", "layout")
  revalidatePath("/admin/sponsors")
}

export async function listPublishedSponsorsPublic(): Promise<PublicSponsor[]> {
  const rows = await sql`
    SELECT id, name, logo_url, website_url, sort_order
    FROM sponsors
    WHERE is_published = 1
    ORDER BY sort_order ASC, id ASC
  `
  return rows.map(mapPublicSponsor)
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

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 200)
}

export async function createSponsor(opts: {
  name: string
  websiteUrl?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  contactNotes?: string
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
    `INSERT INTO sponsors
      (name, logo_url, logo_key, website_url,
       contact_name, contact_email, contact_phone, contact_notes,
       sort_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      name,
      uploaded.url,
      uploaded.key,
      (opts.websiteUrl ?? "").trim().slice(0, 500),
      (opts.contactName ?? "").trim().slice(0, 120),
      normalizeEmail(opts.contactEmail ?? ""),
      (opts.contactPhone ?? "").trim().slice(0, 40),
      (opts.contactNotes ?? "").trim().slice(0, 1000),
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
    contactName?: string
    contactEmail?: string
    contactPhone?: string
    contactNotes?: string
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
     SET name = ?, website_url = ?,
         contact_name = ?, contact_email = ?, contact_phone = ?, contact_notes = ?,
         is_published = ?, sort_order = ?,
         logo_url = ?, logo_key = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      opts.name?.trim().slice(0, 120) || current.name,
      opts.websiteUrl !== undefined
        ? opts.websiteUrl.trim().slice(0, 500)
        : current.website_url,
      opts.contactName !== undefined
        ? opts.contactName.trim().slice(0, 120)
        : current.contact_name,
      opts.contactEmail !== undefined
        ? normalizeEmail(opts.contactEmail)
        : current.contact_email,
      opts.contactPhone !== undefined
        ? opts.contactPhone.trim().slice(0, 40)
        : current.contact_phone,
      opts.contactNotes !== undefined
        ? opts.contactNotes.trim().slice(0, 1000)
        : current.contact_notes,
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
