/** Client-safe check-in types and money helpers (no DB). */

export type AddonKey = "skins" | "mulligans"

export type AddonPrice = {
  addon_key: AddonKey
  label: string
  price_cents: number
}

export type AddonFlags = {
  skins: boolean
  mulligans: boolean
}

export type PrepaidAddons = {
  skins: boolean
  mulligans: boolean
}

export type EventPlayer = {
  id: number
  event_id: number
  registration_id: number
  display_name: string
  sort_order: number
  checked_in: number
  checked_in_at: string | null
  skins: number
  mulligans: number
  addon_total_cents: number
  /** Teammate email for personal ticket (may be empty until captain fills it). */
  email: string
  /** Per-player day-of QR (e.g. OV-P-A3K9Q2). */
  check_in_code: string | null
  ticket_email_sent_at: string | null
  updated_at: string
}

/** Day-of skins if not prepaid online — per person. */
export const DESK_SKINS_CENTS = 500

/** Day-of / online mulligans — whole team only. */
export const DESK_MULLIGANS_CENTS = 2000

export function priceMap(prices: AddonPrice[]): Record<string, number> {
  return Object.fromEntries(prices.map((p) => [p.addon_key, p.price_cents]))
}

/**
 * Day-of money owed for one player.
 * Skins: per person (unless prepaid).
 * Mulligans: charged once on the first player with the flag (unless prepaid).
 */
export function computePlayerAddonTotalCents(
  flags: AddonFlags,
  prices: AddonPrice[],
  opts?: {
    prepaid?: PrepaidAddons
    /** True when this row should carry the team mulligans charge. */
    chargeTeamMulligans?: boolean
  },
): number {
  const map = priceMap(prices)
  const prepaid = opts?.prepaid ?? { skins: false, mulligans: false }
  let total = 0
  if (flags.skins && !prepaid.skins) {
    total += Number(map.skins ?? DESK_SKINS_CENTS)
  }
  if (
    flags.mulligans &&
    !prepaid.mulligans &&
    opts?.chargeTeamMulligans
  ) {
    total += Number(map.mulligans ?? DESK_MULLIGANS_CENTS)
  }
  return total
}

/** @deprecated Prefer computePlayerAddonTotalCents — kept for older call sites. */
export function computeAddonTotalCents(
  flags: AddonFlags,
  prices: AddonPrice[],
): number {
  return computePlayerAddonTotalCents(flags, prices, {
    chargeTeamMulligans: flags.mulligans,
  })
}

/** Live desk total: skins per checked player + one team mulligans fee. */
export function computeTeamDeskAddonTotalCents(
  players: AddonFlags[],
  prices: AddonPrice[],
  prepaid?: PrepaidAddons,
): number {
  const map = priceMap(prices)
  const pre = prepaid ?? { skins: false, mulligans: false }
  let total = 0
  let anyMulligans = false
  for (const p of players) {
    if (p.skins && !pre.skins) {
      total += Number(map.skins ?? DESK_SKINS_CENTS)
    }
    if (p.mulligans) anyMulligans = true
  }
  if (anyMulligans && !pre.mulligans) {
    total += Number(map.mulligans ?? DESK_MULLIGANS_CENTS)
  }
  return total
}

export function formatAddonMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

/** Robust check — Turso/JSON can yield 1/0, true/false, or "1"/"0". */
export function isPlayerCheckedIn(
  player: Pick<EventPlayer, "checked_in"> | null | undefined,
): boolean {
  if (!player) return false
  const v = player.checked_in as unknown
  return v === 1 || v === true || v === "1"
}
