/** Client-safe check-in types and money helpers (no DB). */

export type AddonKey = "skins" | "golf_cannon" | "golf_pro"

export type AddonPrice = {
  addon_key: AddonKey
  label: string
  price_cents: number
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
  golf_cannon: number
  golf_pro: number
  addon_total_cents: number
  /** Teammate email for personal ticket (may be empty until captain fills it). */
  email: string
  /** Per-player day-of QR (e.g. OV-P-A3K9Q2). */
  check_in_code: string | null
  ticket_email_sent_at: string | null
  updated_at: string
}

export function computeAddonTotalCents(
  flags: { skins: boolean; golf_cannon: boolean; golf_pro: boolean },
  prices: AddonPrice[],
): number {
  const map = Object.fromEntries(prices.map((p) => [p.addon_key, p.price_cents]))
  let total = 0
  if (flags.skins) total += Number(map.skins ?? 0)
  if (flags.golf_cannon) total += Number(map.golf_cannon ?? 0)
  if (flags.golf_pro) total += Number(map.golf_pro ?? 0)
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
