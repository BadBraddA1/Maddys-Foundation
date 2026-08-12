import { formatUsdFromCents } from "@/lib/sponsor-levels"

/**
 * Oak Valley Golf Scramble sponsorship packages.
 * quantity null = unlimited; otherwise hard inventory cap.
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

export function getSponsorPackage(key: string): SponsorPackage | undefined {
  return SPONSOR_PACKAGES.find((p) => p.key === key)
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
  remaining: number | null
  soldOut: boolean
}

export { formatUsdFromCents }
