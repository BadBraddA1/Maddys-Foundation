/**
 * Per-site auth settings. This is the ONLY file you should need to edit
 * when installing the BraddCorp auth kit on a new site.
 * Colors live in styles/auth.css (the :root token block).
 */

export type SocialProvider = "oauth_google" | "oauth_apple"

export const authConfig = {
  /** Shown in shell headers and page metadata. */
  siteName: "Madalyn Robinson Foundation",

  /** Small link above the heading, back to the home page. */
  homeUrl: "/",

  /** Where finalize() sends users after auth. Staff-only — the admin desk. */
  afterSignInUrl: "/admin",
  afterSignUpUrl: "/admin",

  /** Route paths — keep in sync with the app/ folders and .env. */
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
  forgotPasswordUrl: "/forgot-password",
  ssoCallbackUrl: "/sso-callback",

  /** Collect first/last name on sign-up (requires "Name" enabled in Clerk). */
  collectName: true,

  /** OAuth buttons to render. Empty array hides the social block. */
  socialProviders: [] as SocialProvider[],

  copy: {
    signInTitle: "Staff sign-in",
    signInSubtitle: "Use your staff email and password to open the admin desk.",
    signUpTitle: "Create staff account",
    signUpSubtitle:
      "Prefer an invite from an existing admin — that grants access automatically. Use this only if you already have an invite, or someone will promote you afterward.",
    forgotTitle: "Reset your password",
    forgotSubtitle: "We'll email you a reset code.",
  },
}
