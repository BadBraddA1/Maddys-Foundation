import { randomBytes } from "crypto"
import { sql } from "@/lib/db"
import { deleteMediaKey, uploadMediaFile } from "@/lib/r2"
import { revalidatePath } from "next/cache"

export type SponsorPaymentStatus = "unpaid" | "paid" | "waived"

export type Sponsor = {
  id: number
  name: string
  logo_url: string
  logo_key: string
  website_url: string
  contact_name: string
  contact_email: string
  contact_phone: string
  contact_notes: string
  sort_order: number
  is_published: number
  amount_cents: number
  payment_status: SponsorPaymentStatus
  level_key: string
  level_label: string
  pay_token: string
  stripe_checkout_session_id: string
  paid_at: string
  source: string
  /** Unix seconds — unpaid public draft holds package inventory. */
  hold_expires_at: number | null
  created_at: string
  updated_at: string
}

function mapSponsor(row: Record<string, unknown>): Sponsor {
  const statusRaw = String(row.payment_status ?? "waived")
  const payment_status: SponsorPaymentStatus =
    statusRaw === "unpaid" || statusRaw === "paid" || statusRaw === "waived"
      ? statusRaw
      : "waived"
  const holdRaw = row.hold_expires_at
  const hold_expires_at =
    holdRaw == null || holdRaw === ""
      ? null
      : Number(holdRaw)
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
    amount_cents: Number(row.amount_cents ?? 0),
    payment_status,
    level_key: String(row.level_key ?? ""),
    level_label: String(row.level_label ?? ""),
    pay_token: String(row.pay_token ?? ""),
    stripe_checkout_session_id: String(row.stripe_checkout_session_id ?? ""),
    paid_at: String(row.paid_at ?? ""),
    source: String(row.source ?? "admin"),
    hold_expires_at:
      hold_expires_at != null && Number.isFinite(hold_expires_at)
        ? hold_expires_at
        : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  }
}

/** Paid public sponsor still needs logo + contact before publishing. */
export function sponsorNeedsProfile(sponsor: Sponsor): boolean {
  if (sponsor.payment_status !== "paid") return false
  if (sponsor.is_published) return false
  return !sponsor.logo_url.trim()
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

export function newPayToken(): string {
  return randomBytes(24).toString("hex")
}

export async function listPublishedSponsorsPublic(): Promise<PublicSponsor[]> {
  const rows = await sql`
    SELECT id, name, logo_url, website_url, sort_order
    FROM sponsors
    WHERE is_published = 1
    ORDER BY sort_order ASC, id ASC
  `
  // One logo per company on the public strip when they buy multiple packages.
  const seen = new Set<string>()
  const out: PublicSponsor[] = []
  for (const row of rows) {
    const mapped = mapPublicSponsor(row)
    const dedupeKey = (mapped.logo_url || mapped.name).trim().toLowerCase()
    if (!dedupeKey || seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    out.push(mapped)
  }
  return out
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

export async function getSponsorByPayToken(
  token: string,
): Promise<Sponsor | null> {
  const t = token.trim()
  if (!t) return null
  const rows = await sql`
    SELECT * FROM sponsors WHERE pay_token = ${t} LIMIT 1
  `
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
  /** Upload a new logo file, or reuse an existing logo from another row. */
  file?: File
  logoUrl?: string
  logoKey?: string
  /** When set + unpaid, logo stays off the public strip until paid (or waived). */
  amountCents?: number
  paymentStatus?: SponsorPaymentStatus
  levelKey?: string
  levelLabel?: string
  publishNow?: boolean
  source?: string
}): Promise<Sponsor> {
  const name = opts.name.trim().slice(0, 120)
  if (!name) throw new Error("Sponsor name is required")

  const amountCents = Math.max(0, Math.round(opts.amountCents ?? 0))
  const paymentStatus: SponsorPaymentStatus =
    opts.paymentStatus ??
    (amountCents > 0 ? "unpaid" : "waived")
  const publishNow =
    opts.publishNow ??
    (paymentStatus === "waived" || paymentStatus === "paid")
  const payToken =
    paymentStatus === "unpaid" && amountCents > 0 ? newPayToken() : ""

  let logoUrl = (opts.logoUrl ?? "").trim()
  let logoKey = (opts.logoKey ?? "").trim()
  if (opts.file) {
    const uploaded = await uploadMediaFile({
      file: opts.file,
      folder: "sponsors",
      filename: opts.file.name,
    })
    logoUrl = uploaded.url
    logoKey = uploaded.key
  }
  if (!logoUrl) throw new Error("Logo is required")

  const maxRows = await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM sponsors`
  const sortOrder = Number(maxRows[0]?.m ?? 0) + 1

  const result = await sql.execute(
    `INSERT INTO sponsors
      (name, logo_url, logo_key, website_url,
       contact_name, contact_email, contact_phone, contact_notes,
       sort_order, is_published,
       amount_cents, payment_status, level_key, level_label, pay_token, source,
       paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      logoUrl,
      logoKey,
      (opts.websiteUrl ?? "").trim().slice(0, 500),
      (opts.contactName ?? "").trim().slice(0, 120),
      normalizeEmail(opts.contactEmail ?? ""),
      (opts.contactPhone ?? "").trim().slice(0, 40),
      (opts.contactNotes ?? "").trim().slice(0, 1000),
      sortOrder,
      publishNow ? 1 : 0,
      amountCents,
      paymentStatus,
      (opts.levelKey ?? "").trim().slice(0, 40),
      (opts.levelLabel ?? "").trim().slice(0, 80),
      payToken,
      (opts.source ?? "admin").slice(0, 40),
      paymentStatus === "paid" ? new Date().toISOString() : null,
    ],
  )
  const id = Number(result.lastInsertRowid ?? 0)
  const sponsor = await getSponsor(id)
  if (!sponsor) throw new Error("Could not create sponsor")
  revalidateSponsors()
  return sponsor
}

async function logoKeyInUseElsewhere(
  logoKey: string,
  exceptId: number,
): Promise<boolean> {
  if (!logoKey) return false
  const rows = await sql`
    SELECT id FROM sponsors
    WHERE logo_key = ${logoKey} AND id != ${exceptId}
    LIMIT 1
  `
  return Boolean(rows[0])
}

/**
 * Claim another package for an existing company (reuse logo + contacts).
 * Used when one sponsor pays for multiple packages (e.g. check for two contests).
 */
export async function claimAdditionalPackage(opts: {
  fromSponsorId: number
  packageKey: string
  via?: "admin_check" | "admin_manual" | "waived"
}): Promise<Sponsor> {
  const source = await getSponsor(opts.fromSponsorId)
  if (!source) throw new Error("Sponsor not found")
  if (!source.logo_url.trim()) {
    throw new Error("Add a logo on the original sponsor before claiming another package.")
  }

  const { assertPackageHasRoom } = await import("@/lib/sponsor-hold")
  const room = await assertPackageHasRoom(opts.packageKey)
  if (!room.ok) throw new Error(room.error)

  const via = opts.via ?? "admin_check"
  const paymentStatus: SponsorPaymentStatus =
    via === "waived" ? "waived" : "paid"
  const checkNote =
    via === "admin_check"
      ? "Paid by check"
      : via === "waived"
        ? "Complimentary"
        : "Paid (admin)"
  const priorNotes = source.contact_notes.trim()
  const notes = priorNotes
    ? priorNotes.includes(checkNote)
      ? priorNotes
      : `${priorNotes}\n${checkNote}`
    : checkNote

  return createSponsor({
    name: source.name,
    websiteUrl: source.website_url,
    contactName: source.contact_name,
    contactEmail: source.contact_email,
    contactPhone: source.contact_phone,
    contactNotes: notes,
    logoUrl: source.logo_url,
    logoKey: source.logo_key,
    amountCents: room.package.amountCents,
    paymentStatus,
    levelKey: room.package.key,
    levelLabel: room.package.label,
    publishNow: true,
    source: via === "admin_check" ? "admin_check" : "admin",
  })
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
    amountCents?: number
    paymentStatus?: SponsorPaymentStatus
    levelKey?: string
    levelLabel?: string
    ensurePayToken?: boolean
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
    if (
      current.logo_key &&
      current.logo_key !== logoKey &&
      !(await logoKeyInUseElsewhere(current.logo_key, id))
    ) {
      await deleteMediaKey(current.logo_key).catch(() => undefined)
    }
  }

  const amountCents =
    opts.amountCents !== undefined
      ? Math.max(0, Math.round(opts.amountCents))
      : current.amount_cents
  const paymentStatus = opts.paymentStatus ?? current.payment_status
  let payToken = current.pay_token
  if (opts.ensurePayToken && !payToken) {
    payToken = newPayToken()
  }
  if (paymentStatus === "unpaid" && amountCents > 0 && !payToken) {
    payToken = newPayToken()
  }

  await sql.execute(
    `UPDATE sponsors
     SET name = ?, website_url = ?,
         contact_name = ?, contact_email = ?, contact_phone = ?, contact_notes = ?,
         is_published = ?, sort_order = ?,
         logo_url = ?, logo_key = ?,
         amount_cents = ?, payment_status = ?, level_key = ?, level_label = ?,
         pay_token = ?,
         updated_at = CURRENT_TIMESTAMP
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
      amountCents,
      paymentStatus,
      opts.levelKey !== undefined
        ? opts.levelKey.trim().slice(0, 40)
        : current.level_key,
      opts.levelLabel !== undefined
        ? opts.levelLabel.trim().slice(0, 80)
        : current.level_label,
      payToken,
      id,
    ],
  )

  const updated = await getSponsor(id)
  if (!updated) throw new Error("Sponsor not found")
  revalidateSponsors()
  return updated
}

/**
 * Mark paid (Stripe webhook or admin manual).
 * Publishes only when a logo is already on file (admin pay links).
 * Public package sponsors upload logo after payment.
 */
export async function markSponsorPaid(
  id: number,
  opts?: { stripeSessionId?: string; via?: string },
): Promise<Sponsor | null> {
  const current = await getSponsor(id)
  if (!current) return null
  if (current.payment_status === "paid" && current.is_published) {
    return current
  }

  const publishNow = Boolean(current.logo_url.trim())

  await sql.execute(
    `UPDATE sponsors
     SET payment_status = 'paid',
         is_published = ?,
         paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
         hold_expires_at = NULL,
         stripe_checkout_session_id = COALESCE(?, stripe_checkout_session_id),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [publishNow ? 1 : 0, opts?.stripeSessionId ?? null, id],
  )

  revalidateSponsors()
  return getSponsor(id)
}

/**
 * Public post-pay profile: logo + website + point of contact, then publish.
 */
export async function completeSponsorProfile(
  id: number,
  opts: {
    websiteUrl?: string
    contactName: string
    contactEmail?: string
    contactPhone?: string
    file: File
  },
): Promise<Sponsor> {
  const current = await getSponsor(id)
  if (!current) throw new Error("Sponsor not found")
  if (current.payment_status !== "paid") {
    throw new Error("Sponsorship must be paid before adding your logo.")
  }

  const contactName = opts.contactName.trim().slice(0, 120)
  if (!contactName) throw new Error("Point of contact is required")

  const uploaded = await uploadMediaFile({
    file: opts.file,
    folder: "sponsors",
    filename: opts.file.name,
  })

  if (current.logo_key && current.logo_key !== uploaded.key) {
    await deleteMediaKey(current.logo_key).catch(() => undefined)
  }

  await sql.execute(
    `UPDATE sponsors
     SET logo_url = ?, logo_key = ?,
         website_url = ?,
         contact_name = ?,
         contact_email = COALESCE(NULLIF(?, ''), contact_email),
         contact_phone = ?,
         is_published = 1,
         hold_expires_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      uploaded.url,
      uploaded.key,
      (opts.websiteUrl ?? "").trim().slice(0, 500),
      contactName,
      opts.contactEmail ? normalizeEmail(opts.contactEmail) : "",
      (opts.contactPhone ?? "").trim().slice(0, 40),
      id,
    ],
  )

  const updated = await getSponsor(id)
  if (!updated) throw new Error("Sponsor not found")
  revalidateSponsors()
  return updated
}

/** Create unpaid public draft with full profile during package checkout. */
export async function createPublicSponsorDraft(opts: {
  name: string
  contactEmail: string
  contactName: string
  contactPhone?: string
  websiteUrl?: string
  file: File
  amountCents: number
  levelKey: string
  levelLabel: string
  holdExpiresAt: number
}): Promise<Sponsor> {
  const name = opts.name.trim().slice(0, 120)
  if (!name) throw new Error("Sponsor name is required")
  const email = normalizeEmail(opts.contactEmail)
  if (!email) throw new Error("Email is required")
  const contactName = opts.contactName.trim().slice(0, 120)
  if (!contactName) throw new Error("Point of contact is required")

  const amountCents = Math.max(0, Math.round(opts.amountCents))
  if (amountCents <= 0) throw new Error("Invalid sponsorship amount")

  const uploaded = await uploadMediaFile({
    file: opts.file,
    folder: "sponsors",
    filename: opts.file.name,
  })

  const payToken = newPayToken()
  const maxRows = await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM sponsors`
  const sortOrder = Number(maxRows[0]?.m ?? 0) + 1

  const result = await sql.execute(
    `INSERT INTO sponsors
      (name, logo_url, logo_key, website_url,
       contact_name, contact_email, contact_phone, contact_notes,
       sort_order, is_published,
       amount_cents, payment_status, level_key, level_label, pay_token, source,
       hold_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, 0, ?, 'unpaid', ?, ?, ?, 'public', ?)`,
    [
      name,
      uploaded.url,
      uploaded.key,
      (opts.websiteUrl ?? "").trim().slice(0, 500),
      contactName,
      email,
      (opts.contactPhone ?? "").trim().slice(0, 40),
      sortOrder,
      amountCents,
      opts.levelKey.trim().slice(0, 40),
      opts.levelLabel.trim().slice(0, 80),
      payToken,
      opts.holdExpiresAt,
    ],
  )
  const id = Number(result.lastInsertRowid ?? 0)
  const sponsor = await getSponsor(id)
  if (!sponsor) throw new Error("Could not create sponsorship")
  revalidateSponsors()
  return sponsor
}

export async function setSponsorStripeSession(
  id: number,
  sessionId: string,
): Promise<void> {
  await sql.execute(
    `UPDATE sponsors
     SET stripe_checkout_session_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [sessionId, id],
  )
}

export async function deleteSponsor(id: number): Promise<void> {
  const current = await getSponsor(id)
  if (!current) return
  await sql.execute(`DELETE FROM sponsors WHERE id = ?`, [id])
  if (
    current.logo_key &&
    !(await logoKeyInUseElsewhere(current.logo_key, id))
  ) {
    await deleteMediaKey(current.logo_key).catch(() => undefined)
  }
  revalidateSponsors()
}

/** Ensure payment columns exist (idempotent for local/prod without manual migrate). */
export async function ensureSponsorPaymentColumns(): Promise<void> {
  const cols = [
    ["amount_cents", "INTEGER NOT NULL DEFAULT 0"],
    ["payment_status", "TEXT NOT NULL DEFAULT 'waived'"],
    ["level_key", "TEXT NOT NULL DEFAULT ''"],
    ["level_label", "TEXT NOT NULL DEFAULT ''"],
    ["pay_token", "TEXT"],
    ["stripe_checkout_session_id", "TEXT"],
    ["paid_at", "TEXT"],
    ["source", "TEXT NOT NULL DEFAULT 'admin'"],
    ["hold_expires_at", "INTEGER"],
  ] as const
  for (const [name, def] of cols) {
    try {
      await sql.execute(`ALTER TABLE sponsors ADD COLUMN ${name} ${def}`)
    } catch {
      // column already exists
    }
  }
}
