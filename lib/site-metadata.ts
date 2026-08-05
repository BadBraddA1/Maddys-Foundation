export const siteName = "Madalyn Robinson Foundation"
export const siteShortName = "Maddy's Foundation"
/** ~50–60 chars for SERP / social title space. */
export const siteTitle =
  "Madalyn Robinson Foundation — Events, Scholarships & Hope"
/** Keep ≤ ~125 characters for social truncations (playbook 05). */
export const siteDescription =
  "Spreading joy and light in honor of Madalyn Robinson — events, community, and hope."
export const ogImageAlt =
  "Madalyn Robinson Foundation — events, scholarships, and hope"

const CANONICAL_SITE_URL = "https://maddysfoundation.org"

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim()
  if (fromEnv) return fromEnv
  if (process.env.VERCEL_ENV === "production") return CANONICAL_SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`
  }
  return CANONICAL_SITE_URL
}

export const siteUrl = resolveSiteUrl()

/** Absolute OG / Twitter image paths (app/opengraph-image.tsx). */
export const ogImagePath = "/opengraph-image"
export const twitterImagePath = "/twitter-image"

/** Venmo profile — override with NEXT_PUBLIC_DONATE_URL if needed. */
export const donateUrl =
  process.env.NEXT_PUBLIC_DONATE_URL?.trim() ||
  "https://venmo.com/u/MadalynRobinsonFoundation"
export const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || ""
