import { randomUUID } from "crypto"
import { sql } from "@/lib/db"
import { audit } from "@/lib/audit"
import { getStripe, stripeConfigured } from "@/lib/stripe"
import {
  CHECKOUT_HOLD_MINUTES,
  holdExpiresAtUnix,
} from "@/lib/sponsor-hold-shared"
import {
  getSponsorPackage,
  listResolvedSponsorPackages,
  type PublicPackageAvailability,
  type SponsorPackage,
} from "@/lib/sponsor-packages"
import { revalidateSponsors } from "@/lib/sponsors"

export type SponsorPackageHoldRow = {
  id: number
  package_key: string
  token: string
  hold_expires_at: number
}

let schemaReady: Promise<void> | null = null

/** Idempotent schema for package holds + sponsor hold_expires_at. */
export function ensureSponsorHoldSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql.execute(`
        CREATE TABLE IF NOT EXISTS sponsor_package_holds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          package_key TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          hold_expires_at INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        )
      `)
      await sql.execute(`
        CREATE INDEX IF NOT EXISTS idx_sponsor_package_holds_pkg_expires
          ON sponsor_package_holds (package_key, hold_expires_at)
      `)
      try {
        await sql.execute(
          `ALTER TABLE sponsors ADD COLUMN hold_expires_at INTEGER`,
        )
      } catch {
        // column exists
      }
      await sql.execute(`
        CREATE INDEX IF NOT EXISTS idx_sponsors_level_hold
          ON sponsors (level_key, payment_status, hold_expires_at)
      `)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  return schemaReady
}

/** Slots currently occupying inventory for a package. */
export async function packageSlotsUsed(packageKey: string): Promise<number> {
  await ensureSponsorHoldSchema()
  const now = Math.floor(Date.now() / 1000)
  const rows = await sql`
    SELECT
      (SELECT COUNT(*) FROM sponsors s
        WHERE s.level_key = ${packageKey}
          AND (
            s.payment_status != 'unpaid'
            OR (
              s.payment_status = 'unpaid'
              AND s.hold_expires_at IS NOT NULL
              AND s.hold_expires_at > ${now}
            )
          )
      )
      + (SELECT COUNT(*) FROM sponsor_package_holds h
          WHERE h.package_key = ${packageKey}
            AND h.hold_expires_at > ${now}) AS c
  `
  return Number(rows[0]?.c ?? 0)
}

/** Admin / check: ensure a package still has room before claiming a slot. */
export async function assertPackageHasRoom(
  packageKey: string,
): Promise<
  | { ok: true; package: SponsorPackage; used: number }
  | { ok: false; error: string }
> {
  await releaseExpiredSponsorHolds().catch(() => undefined)
  const pkg = await getSponsorPackage(packageKey)
  if (!pkg) return { ok: false, error: "Sponsorship package not found." }
  const used = await packageSlotsUsed(pkg.key)
  if (pkg.quantity != null && used >= pkg.quantity) {
    return {
      ok: false,
      error: `${pkg.label} is sold out (${used}/${pkg.quantity}). Increase spots in Package inventory, or pick another package.`,
    }
  }
  return { ok: true, package: pkg, used }
}

export async function listPackageAvailability(): Promise<
  PublicPackageAvailability[]
> {
  await ensureSponsorHoldSchema()
  await releaseExpiredSponsorHolds().catch(() => undefined)

  const packages = await listResolvedSponsorPackages()
  const out: PublicPackageAvailability[] = []
  for (const pkg of packages) {
    const used = await packageSlotsUsed(pkg.key)
    if (pkg.quantity == null) {
      out.push({ ...pkg, remaining: null, soldOut: false, used })
      continue
    }
    const remaining = Math.max(0, pkg.quantity - used)
    out.push({ ...pkg, remaining, soldOut: remaining <= 0, used })
  }
  return out
}

export async function getActiveSponsorPackageHold(
  token: string,
  packageKey?: string,
): Promise<SponsorPackageHoldRow | null> {
  await ensureSponsorHoldSchema()
  const now = Math.floor(Date.now() / 1000)
  const rows = packageKey
    ? await sql`
        SELECT id, package_key, token, hold_expires_at
        FROM sponsor_package_holds
        WHERE token = ${token}
          AND package_key = ${packageKey}
          AND hold_expires_at > ${now}
        LIMIT 1
      `
    : await sql`
        SELECT id, package_key, token, hold_expires_at
        FROM sponsor_package_holds
        WHERE token = ${token} AND hold_expires_at > ${now}
        LIMIT 1
      `
  const row = rows[0]
  if (!row) return null
  return {
    id: Number(row.id),
    package_key: String(row.package_key),
    token: String(row.token),
    hold_expires_at: Number(row.hold_expires_at),
  }
}

export async function createSponsorPackageHold(opts: {
  packageKey: string
  existingToken?: string | null
}): Promise<
  | {
      ok: true
      token: string
      holdExpiresAt: number
      package: SponsorPackage
      remaining: number | null
    }
  | { ok: false; error: string; status: number }
> {
  await ensureSponsorHoldSchema()
  await releaseExpiredSponsorHolds().catch(() => undefined)

  const pkg = await getSponsorPackage(opts.packageKey)
  if (!pkg) {
    return { ok: false, error: "Sponsorship package not found.", status: 404 }
  }

  if (opts.existingToken) {
    const existing = await getActiveSponsorPackageHold(
      opts.existingToken,
      pkg.key,
    )
    if (existing) {
      const used = await packageSlotsUsed(pkg.key)
      return {
        ok: true,
        token: existing.token,
        holdExpiresAt: existing.hold_expires_at,
        package: pkg,
        remaining:
          pkg.quantity == null ? null : Math.max(0, pkg.quantity - used),
      }
    }
  }

  if (pkg.quantity != null) {
    const used = await packageSlotsUsed(pkg.key)
    if (used >= pkg.quantity) {
      return {
        ok: false,
        error: "This sponsorship is sold out.",
        status: 409,
      }
    }
  }

  const token = randomUUID()
  const holdExpiresAt = holdExpiresAtUnix()
  await sql.execute(
    `INSERT INTO sponsor_package_holds (package_key, token, hold_expires_at)
     VALUES (?, ?, ?)`,
    [pkg.key, token, holdExpiresAt],
  )
  await audit(
    "public",
    "sponsor_hold_start",
    "sponsor_package",
    pkg.key,
    token,
  ).catch(() => undefined)

  const used = await packageSlotsUsed(pkg.key)
  return {
    ok: true,
    token,
    holdExpiresAt,
    package: pkg,
    remaining: pkg.quantity == null ? null : Math.max(0, pkg.quantity - used),
  }
}

export async function releaseSponsorPackageHold(token: string): Promise<boolean> {
  await ensureSponsorHoldSchema()
  const rows = await sql`
    SELECT package_key FROM sponsor_package_holds WHERE token = ${token} LIMIT 1
  `
  if (!rows[0]) return false
  const packageKey = String(rows[0].package_key)
  const result = await sql.execute(
    `DELETE FROM sponsor_package_holds WHERE token = ?`,
    [token],
  )
  if (result.rowsAffected > 0) {
    await audit(
      "public",
      "sponsor_hold_release",
      "sponsor_package",
      packageKey,
      token,
    ).catch(() => undefined)
    return true
  }
  return false
}

/** After unpaid sponsor draft is created, drop the form hold. */
export async function consumeSponsorPackageHold(token: string): Promise<void> {
  await ensureSponsorHoldSchema()
  await sql.execute(`DELETE FROM sponsor_package_holds WHERE token = ?`, [
    token,
  ])
}

/**
 * Drop unpaid sponsor drafts + form holds past hold_expires_at.
 * Paid sponsors are never touched.
 */
export async function releaseExpiredSponsorHolds(): Promise<number> {
  await ensureSponsorHoldSchema()
  const now = Math.floor(Date.now() / 1000)
  const rows = await sql`
    SELECT id, stripe_checkout_session_id
    FROM sponsors
    WHERE payment_status = 'unpaid'
      AND source = 'public'
      AND hold_expires_at IS NOT NULL
      AND hold_expires_at <= ${now}
  `

  const stripe = stripeConfigured() ? getStripe() : null
  let released = 0

  for (const row of rows) {
    const id = Number(row.id)
    const sessionId =
      row.stripe_checkout_session_id == null
        ? null
        : String(row.stripe_checkout_session_id)

    if (stripe && sessionId) {
      try {
        await stripe.checkout.sessions.expire(sessionId)
      } catch {
        // already expired/completed
      }
    }

    const { deleteSponsor } = await import("@/lib/sponsors")
    const current = await sql`
      SELECT id FROM sponsors
      WHERE id = ${id} AND payment_status = 'unpaid' AND source = 'public'
      LIMIT 1
    `
    if (current[0]) {
      await deleteSponsor(id)
    }
    await audit(
      "system",
      "release_expired_sponsor_hold",
      "sponsor",
      String(id),
      sessionId ?? "",
    ).catch(() => undefined)
    released += 1
  }

  const holdResult = await sql.execute(
    `DELETE FROM sponsor_package_holds WHERE hold_expires_at <= ?`,
    [now],
  )
  released += holdResult.rowsAffected

  if (released > 0) revalidateSponsors()
  return released
}

export async function dropUnpaidPublicSponsor(opts: {
  sponsorId?: number
  checkoutSessionId?: string
  payToken?: string
}): Promise<boolean> {
  await ensureSponsorHoldSchema()
  const { deleteSponsor, getSponsor, getSponsorByPayToken } = await import(
    "@/lib/sponsors"
  )

  let sponsorId: number | null = null

  if (opts.checkoutSessionId) {
    const rows = await sql`
      SELECT id FROM sponsors
      WHERE stripe_checkout_session_id = ${opts.checkoutSessionId}
        AND payment_status = 'unpaid'
        AND source = 'public'
      LIMIT 1
    `
    if (rows[0]) sponsorId = Number(rows[0].id)
  }

  if (sponsorId == null && opts.payToken) {
    const sponsor = await getSponsorByPayToken(opts.payToken)
    if (
      sponsor &&
      sponsor.payment_status === "unpaid" &&
      sponsor.source === "public"
    ) {
      sponsorId = sponsor.id
    }
  }

  if (sponsorId == null && opts.sponsorId && opts.sponsorId > 0) {
    const sponsor = await getSponsor(opts.sponsorId)
    if (
      sponsor &&
      sponsor.payment_status === "unpaid" &&
      sponsor.source === "public"
    ) {
      sponsorId = sponsor.id
    }
  }

  if (sponsorId == null) return false
  await deleteSponsor(sponsorId)
  return true
}

export { CHECKOUT_HOLD_MINUTES }
