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

export function registrationHoldStorageKey(eventSlug: string): string {
  return `mf-reg-hold:${eventSlug}`
}

/** Start (or resume) the 10-minute window when "Register your team" opens. */
export function beginRegistrationHold(eventSlug: string, reset = false): number {
  const key = registrationHoldStorageKey(eventSlug)
  if (typeof window === "undefined") return holdExpiresAtUnix()

  if (!reset) {
    try {
      const raw = sessionStorage.getItem(key)
      const existing = raw ? Number(raw) : NaN
      if (Number.isFinite(existing) && existing > Math.floor(Date.now() / 1000)) {
        return existing
      }
    } catch {
      // private mode / blocked storage
    }
  }

  const expires = holdExpiresAtUnix()
  try {
    sessionStorage.setItem(key, String(expires))
  } catch {
    // ignore
  }
  return expires
}

export function clearRegistrationHold(eventSlug: string): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(registrationHoldStorageKey(eventSlug))
  } catch {
    // ignore
  }
}

/**
 * Resolve hold deadline from client start time.
 * Never extends past now + 10m; uses earlier client deadline if still valid.
 */
export function resolveHoldExpiresAt(
  clientHoldExpiresAt: unknown,
  nowSec = Math.floor(Date.now() / 1000),
): { ok: true; holdExpiresAt: number } | { ok: false; error: string } {
  const max = nowSec + CHECKOUT_HOLD_SECONDS
  let hold = max
  const client = Number(clientHoldExpiresAt)
  if (Number.isFinite(client) && client > 0) {
    hold = Math.min(max, Math.floor(client))
  }
  if (hold <= nowSec) {
    return {
      ok: false,
      error: `Your ${CHECKOUT_HOLD_MINUTES}-minute registration timer ran out. Refresh the page and start again.`,
    }
  }
  return { ok: true, holdExpiresAt: hold }
}
