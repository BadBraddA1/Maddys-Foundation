/** Client-safe sponsor hold timing (mirrors registration). */

import {
  CHECKOUT_HOLD_MINUTES,
  CHECKOUT_HOLD_SECONDS,
  STRIPE_SESSION_EXPIRE_SECONDS,
  formatHoldCountdown,
  holdExpiresAtUnix,
  resolveHoldExpiresAt,
} from "@/lib/registration-hold-shared"

export {
  CHECKOUT_HOLD_MINUTES,
  CHECKOUT_HOLD_SECONDS,
  STRIPE_SESSION_EXPIRE_SECONDS,
  formatHoldCountdown,
  holdExpiresAtUnix,
  resolveHoldExpiresAt,
}

export function sponsorHoldStorageKey(packageKey: string): string {
  return `mf-sponsor-hold:${packageKey}`
}

export type StoredSponsorHold = {
  token: string
  holdExpiresAt: number
  packageKey: string
}

export function readStoredSponsorHold(
  packageKey: string,
): StoredSponsorHold | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(sponsorHoldStorageKey(packageKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSponsorHold
    if (
      !parsed?.token ||
      parsed.packageKey !== packageKey ||
      !Number.isFinite(parsed.holdExpiresAt) ||
      parsed.holdExpiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeStoredSponsorHold(hold: StoredSponsorHold): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(
      sponsorHoldStorageKey(hold.packageKey),
      JSON.stringify(hold),
    )
  } catch {
    // ignore
  }
}

export function clearStoredSponsorHold(packageKey: string): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(sponsorHoldStorageKey(packageKey))
  } catch {
    // ignore
  }
}

export function clearAllStoredSponsorHolds(): void {
  if (typeof window === "undefined") return
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith("mf-sponsor-hold:")) keys.push(k)
    }
    for (const k of keys) sessionStorage.removeItem(k)
  } catch {
    // ignore
  }
}
