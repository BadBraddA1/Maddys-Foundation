/** Client-safe hold timing helpers (no DB / Next cache imports). */

/** How long an unpaid checkout holds a capacity slot. */
export const CHECKOUT_HOLD_MINUTES = 10
export const CHECKOUT_HOLD_SECONDS = CHECKOUT_HOLD_MINUTES * 60

/**
 * Stripe Checkout requires expires_at ≥ 30 minutes from creation.
 * We expire the session ourselves when the 10-minute hold ends.
 */
export const STRIPE_SESSION_EXPIRE_SECONDS = 30 * 60

export function holdExpiresAtUnix(fromMs = Date.now()): number {
  return Math.floor(fromMs / 1000) + CHECKOUT_HOLD_SECONDS
}

export function formatHoldCountdown(remainingSec: number): string {
  const s = Math.max(0, Math.floor(remainingSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}
