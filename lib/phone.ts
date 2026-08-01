/**
 * US phone normalization for registration rosters.
 * Stored / displayed as: (636) 208-0974
 */

const US_DISPLAY =
  /^\((\d{3})\) (\d{3})-(\d{4})$/

/** Digits only (strips +1 country code when present). */
export function phoneDigits(input: string): string {
  const digits = input.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1)
  }
  return digits
}

/**
 * Normalize to `(XXX) XXX-XXXX`, or `""` if blank.
 * Returns `null` when non-empty input isn't a valid 10-digit US number.
 */
export function normalizeUsPhone(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return ""

  if (US_DISPLAY.test(trimmed)) return trimmed

  const digits = phoneDigits(trimmed)
  if (digits.length !== 10) return null

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Best-effort display for older messy rows. */
export function formatPhoneDisplay(input: string): string {
  const normalized = normalizeUsPhone(input)
  if (normalized !== null) return normalized || "—"
  return input.trim() || "—"
}

/** `tel:` href — E.164 when we can parse US digits. */
export function phoneTelHref(input: string): string | null {
  const digits = phoneDigits(input)
  if (digits.length !== 10) {
    const raw = input.trim()
    return raw ? `tel:${raw}` : null
  }
  return `tel:+1${digits}`
}
