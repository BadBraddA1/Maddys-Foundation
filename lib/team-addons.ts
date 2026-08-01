/** Mulligans / skins — flat fee per team (cents). Safe for client + server. */
export const TEAM_ADDON_CENTS = 2000

/**
 * Typical Stripe US card-not-present online rate (Checkout).
 * Gross-up so the foundation nets the registration + add-on amount.
 */
export const STRIPE_FEE_PERCENT = 0.029
export const STRIPE_FEE_FIXED_CENTS = 30

export function teamAddonTotalCents(opts: {
  mulligans?: boolean
  skins?: boolean
}): number {
  let total = 0
  if (opts.mulligans) total += TEAM_ADDON_CENTS
  if (opts.skins) total += TEAM_ADDON_CENTS
  return total
}

/** Charge amount so that after 2.9% + $0.30, net ≈ `netCents`. */
export function grossUpForCardFees(netCents: number): number {
  if (netCents <= 0) return 0
  return Math.ceil(
    (netCents + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT),
  )
}

/** Extra cents to add when the donor covers processing. */
export function cardFeeCoverCents(netCents: number): number {
  if (netCents <= 0) return 0
  return Math.max(0, grossUpForCardFees(netCents) - netCents)
}

export function registrationTotalCents(opts: {
  feeCents: number
  mulligans?: boolean
  skins?: boolean
  coverCardFees?: boolean
}): {
  baseCents: number
  addonCents: number
  netCents: number
  feeCoverCents: number
  totalCents: number
} {
  const baseCents = Math.max(0, opts.feeCents)
  const addonCents = teamAddonTotalCents(opts)
  const netCents = baseCents + addonCents
  const feeCoverCents = opts.coverCardFees ? cardFeeCoverCents(netCents) : 0
  return {
    baseCents,
    addonCents,
    netCents,
    feeCoverCents,
    totalCents: netCents + feeCoverCents,
  }
}
