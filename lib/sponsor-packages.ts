import { formatUsdFromCents } from "@/lib/sponsor-levels"
import { sql } from "@/lib/db"

/**
 * Default Oak Valley Golf Scramble sponsorship packages.
 * Quantity/amount can be overridden in `sponsor_package_config` by admins.
 */
export type SponsorPackage = {
  key: string
  label: string
  amountCents: number
  /** null = unlimited inventory */
  quantity: number | null
  blurb: string
  sortOrder: number
}

export const SPONSOR_PACKAGES: SponsorPackage[] = [
  {
    key: "hole",
    label: "Hole Sponsor",
    amountCents: 10_000,
    quantity: null,
    blurb: "Your name on a hole throughout the scramble.",
    sortOrder: 10,
  },
  {
    key: "longest-drive-men",
    label: "Longest Drive — Men",
    amountCents: 50_000,
    quantity: 1,
    blurb: "Exclusive contest sponsorship for the men’s longest drive.",
    sortOrder: 20,
  },
  {
    key: "longest-drive-women",
    label: "Longest Drive — Women",
    amountCents: 50_000,
    quantity: 1,
    blurb: "Exclusive contest sponsorship for the women’s longest drive.",
    sortOrder: 30,
  },
  {
    key: "closest-pin-men",
    label: "Closest to the Pin — Men",
    amountCents: 25_000,
    quantity: 1,
    blurb: "Exclusive closest-to-the-pin contest sponsorship (men).",
    sortOrder: 40,
  },
  {
    key: "closest-pin-women",
    label: "Closest to the Pin — Women",
    amountCents: 25_000,
    quantity: 1,
    blurb: "Exclusive closest-to-the-pin contest sponsorship (women).",
    sortOrder: 50,
  },
  {
    key: "cannon-driver",
    label: "Cannon Driver",
    amountCents: 80_000,
    quantity: 1,
    blurb: "Headline sponsorship for the cannon drive.",
    sortOrder: 60,
  },
  {
    key: "beer-cart",
    label: "Beer Cart Sign",
    amountCents: 30_000,
    quantity: 4,
    blurb: "Signage on a beer cart during the scramble.",
    sortOrder: 70,
  },
  {
    key: "a-flight-1st",
    label: "A Flight — First Place",
    amountCents: 50_000,
    quantity: 1,
    blurb: "Sponsor the A Flight first-place award.",
    sortOrder: 80,
  },
  {
    key: "a-flight-2nd",
    label: "A Flight — Second Place",
    amountCents: 40_000,
    quantity: 1,
    blurb: "Sponsor the A Flight second-place award.",
    sortOrder: 90,
  },
  {
    key: "a-flight-3rd",
    label: "A Flight — Third Place",
    amountCents: 25_000,
    quantity: 1,
    blurb: "Sponsor the A Flight third-place award.",
    sortOrder: 100,
  },
  {
    key: "b-flight-1st",
    label: "B Flight — First Place",
    amountCents: 40_000,
    quantity: 1,
    blurb: "Sponsor the B Flight first-place award.",
    sortOrder: 110,
  },
  {
    key: "b-flight-2nd",
    label: "B Flight — Second Place",
    amountCents: 25_000,
    quantity: 1,
    blurb: "Sponsor the B Flight second-place award.",
    sortOrder: 120,
  },
  {
    key: "b-flight-3rd",
    label: "B Flight — Third Place",
    amountCents: 20_000,
    quantity: 1,
    blurb: "Sponsor the B Flight third-place award.",
    sortOrder: 130,
  },
  {
    key: "c-flight-1st",
    label: "C Flight — First Place",
    amountCents: 40_000,
    quantity: 1,
    blurb: "Sponsor the C Flight first-place award.",
    sortOrder: 140,
  },
  {
    key: "c-flight-2nd",
    label: "C Flight — Second Place",
    amountCents: 25_000,
    quantity: 1,
    blurb: "Sponsor the C Flight second-place award.",
    sortOrder: 150,
  },
  {
    key: "c-flight-3rd",
    label: "C Flight — Third Place",
    amountCents: 20_000,
    quantity: 1,
    blurb: "Sponsor the C Flight third-place award.",
    sortOrder: 160,
  },
  {
    key: "after-meal",
    label: "After Tournament Meal",
    amountCents: 200_000,
    quantity: 1,
    blurb: "Presenting sponsor for the post-tournament meal.",
    sortOrder: 170,
  },
]

let schemaReady: Promise<void> | null = null

export function ensureSponsorPackageConfigSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql.execute(`
        CREATE TABLE IF NOT EXISTS sponsor_package_config (
          package_key TEXT PRIMARY KEY,
          quantity INTEGER,
          amount_cents INTEGER,
          updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        )
      `)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  return schemaReady
}

type ConfigRow = {
  package_key: string
  quantity: number | null
  amount_cents: number | null
}

async function loadConfigMap(): Promise<Map<string, ConfigRow>> {
  await ensureSponsorPackageConfigSchema()
  const rows = await sql`
    SELECT package_key, quantity, amount_cents FROM sponsor_package_config
  `
  const map = new Map<string, ConfigRow>()
  for (const row of rows) {
    const key = String(row.package_key)
    const qtyRaw = row.quantity
    const amtRaw = row.amount_cents
    map.set(key, {
      package_key: key,
      quantity:
        qtyRaw === null || qtyRaw === undefined || qtyRaw === ""
          ? null
          : Number(qtyRaw),
      amount_cents:
        amtRaw === null || amtRaw === undefined || amtRaw === ""
          ? null
          : Number(amtRaw),
    })
  }
  return map
}

function applyConfig(
  base: SponsorPackage,
  cfg: ConfigRow | undefined,
): SponsorPackage {
  if (!cfg) return { ...base }
  return {
    ...base,
    quantity:
      cfg.quantity == null || !Number.isFinite(cfg.quantity)
        ? null
        : Math.max(0, Math.floor(cfg.quantity)),
    amountCents:
      cfg.amount_cents != null &&
      Number.isFinite(cfg.amount_cents) &&
      cfg.amount_cents > 0
        ? Math.round(cfg.amount_cents)
        : base.amountCents,
  }
}

/** Sync package defaults + admin overrides. */
export async function listResolvedSponsorPackages(): Promise<SponsorPackage[]> {
  const map = await loadConfigMap()
  return SPONSOR_PACKAGES.map((base) => applyConfig(base, map.get(base.key)))
}

export async function getSponsorPackage(
  key: string,
): Promise<SponsorPackage | undefined> {
  const all = await listResolvedSponsorPackages()
  return all.find((p) => p.key === key)
}

/** Sync lookup of defaults only (no DB). Prefer getSponsorPackage. */
export function getDefaultSponsorPackage(
  key: string,
): SponsorPackage | undefined {
  return SPONSOR_PACKAGES.find((p) => p.key === key)
}

export async function updateSponsorPackageConfig(opts: {
  packageKey: string
  /** null = unlimited */
  quantity: number | null
  /** omit to leave amount override unchanged; null clears override back to default */
  amountCents?: number | null
}): Promise<SponsorPackage> {
  await ensureSponsorPackageConfigSchema()
  const base = getDefaultSponsorPackage(opts.packageKey)
  if (!base) throw new Error("Unknown sponsorship package.")

  const quantity =
    opts.quantity == null ? null : Math.max(0, Math.floor(opts.quantity))

  const existing = await sql`
    SELECT amount_cents FROM sponsor_package_config
    WHERE package_key = ${opts.packageKey}
    LIMIT 1
  `
  const prevAmt =
    existing[0]?.amount_cents == null || existing[0]?.amount_cents === ""
      ? null
      : Number(existing[0].amount_cents)

  let nextAmt: number | null = prevAmt
  if (opts.amountCents !== undefined) {
    nextAmt =
      opts.amountCents == null || opts.amountCents <= 0
        ? null
        : Math.round(opts.amountCents)
  }

  await sql.execute(
    `INSERT INTO sponsor_package_config (package_key, quantity, amount_cents, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(package_key) DO UPDATE SET
       quantity = excluded.quantity,
       amount_cents = excluded.amount_cents,
       updated_at = CURRENT_TIMESTAMP`,
    [opts.packageKey, quantity, nextAmt],
  )

  const resolved = await getSponsorPackage(opts.packageKey)
  if (!resolved) throw new Error("Could not load package.")
  return resolved
}

export function formatPackagePrice(pkg: SponsorPackage): string {
  return formatUsdFromCents(pkg.amountCents)
}

export function packageQuantityLabel(pkg: SponsorPackage): string {
  if (pkg.quantity == null) return "Unlimited"
  if (pkg.quantity === 1) return "Only 1 available"
  return `Only ${pkg.quantity} available`
}

export type PublicPackageAvailability = SponsorPackage & {
  /** Spots still open to start a new hold (null = unlimited). */
  remaining: number | null
  /** True only when paid/claimed count meets quantity. */
  soldOut: boolean
  /** True when every remaining spot is on a temporary hold (not final). */
  salePending: boolean
  /** Paid + waived sponsors on this package. */
  claimed: number
  /** Active form holds + unpaid checkout drafts. */
  pending: number
  /** claimed + pending (admin “used” total). */
  used: number
  /** Soonest pending hold expiry (unix seconds), if any. */
  pendingExpiresAt: number | null
}

export { formatUsdFromCents }
