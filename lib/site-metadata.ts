export const siteName = "Madalyn Robinson Foundation"
export const siteShortName = "Maddy's Foundation"
export const siteTitle = "Madalyn Robinson Foundation"
/** Keep ≤ ~125 characters for social truncations (playbook 05). */
export const siteDescription =
  "Spreading joy and light in honor of Madalyn Robinson — events, community, and hope."
export const ogImageAlt =
  "Madalyn Robinson Foundation — joy that still moves mountains"
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://maddysfoundation.org"
/** Venmo profile — override with NEXT_PUBLIC_DONATE_URL if needed. */
export const donateUrl =
  process.env.NEXT_PUBLIC_DONATE_URL?.trim() ||
  "https://venmo.com/u/MadalynRobinsonFoundation"
export const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || ""
