/**
 * Public sponsorship levels + custom amounts.
 * Staff can still set any amount_cents on a draft sponsor (Option B).
 */
export type SponsorLevel = {
  key: string
  label: string
  /** null = custom amount entered by the sponsor */
  amountCents: number | null
  blurb: string
}

export const SPONSOR_LEVELS: SponsorLevel[] = [
  {
    key: "title",
    label: "Title Sponsor",
    amountCents: 500_000,
    blurb: "Premier partner recognition across the scramble and site.",
  },
  {
    key: "gold",
    label: "Gold Sponsor",
    amountCents: 250_000,
    blurb: "High-visibility logo placement and event recognition.",
  },
  {
    key: "silver",
    label: "Silver Sponsor",
    amountCents: 100_000,
    blurb: "Logo on the site sponsor strip and event materials.",
  },
  {
    key: "bronze",
    label: "Bronze Sponsor",
    amountCents: 50_000,
    blurb: "Logo on the site sponsor strip.",
  },
  {
    key: "friend",
    label: "Friend of the Foundation",
    amountCents: 25_000,
    blurb: "Support at a flexible entry level.",
  },
  {
    key: "custom",
    label: "Custom amount",
    amountCents: null,
    blurb: "Enter whatever your sponsorship commitment is.",
  },
]

export function getSponsorLevel(key: string): SponsorLevel | undefined {
  return SPONSOR_LEVELS.find((l) => l.key === key)
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

/** Parse dollars like "250" or "250.00" → cents. */
export function parseUsdToCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "").trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

export function venmoHandle(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DONATE_URL?.trim() || ""
  const match = fromEnv.match(/venmo\.com\/u\/([^/?#]+)/i) || fromEnv.match(/@([\w.-]+)/)
  if (match?.[1]) return match[1].replace(/^@/, "")
  if (fromEnv.startsWith("@")) return fromEnv.slice(1)
  return "MadalynRobinsonFoundation"
}

export function venmoPayUrl(amountDollars: number, note: string): string {
  const handle = venmoHandle()
  const params = new URLSearchParams({
    txn: "pay",
    audience: "public",
    amount: amountDollars.toFixed(2),
    note: note.slice(0, 50),
  })
  return `https://venmo.com/u/${encodeURIComponent(handle)}?${params.toString()}`
}
