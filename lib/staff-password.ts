import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export const STAFF_COOKIE = "mf_staff_session"
const STAFF_MAX_AGE_SEC = 60 * 60 * 24 * 14 // 14 days

/** Temporary shared password until Clerk + domain. Prefer ADMIN_STAFF_PASSWORD env. */
export function staffPasswordConfigured(): boolean {
  return Boolean(getStaffPassword())
}

export function getStaffPassword(): string {
  return (
    process.env.ADMIN_STAFF_PASSWORD?.trim() ||
    // Temporary default for pre-domain staff access — override via env ASAP.
    "Braddcorp"
  )
}

function signingSecret(): string {
  return (
    process.env.ADMIN_STAFF_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    getStaffPassword()
  )
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url")
}

export function createStaffSessionToken(now = Date.now()): string {
  const exp = now + STAFF_MAX_AGE_SEC * 1000
  const payload = Buffer.from(JSON.stringify({ exp, v: 1 }), "utf8").toString(
    "base64url",
  )
  return `${payload}.${sign(payload)}`
}

export function verifyStaffSessionToken(token: string | undefined | null): boolean {
  if (!token) return false
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return false
  const expected = sign(payload)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  } catch {
    return false
  }
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number }
    return Boolean(data.exp && Date.now() <= data.exp)
  } catch {
    return false
  }
}

function base64UrlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/")
  const pad = padded + "=".repeat((4 - (padded.length % 4)) % 4)
  const bin = atob(pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Edge-safe verify for middleware (Web Crypto). */
export async function verifyStaffSessionTokenEdge(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return false

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  )
  const expectedBytes = new Uint8Array(mac)
  // base64url encode expected
  let expected = ""
  {
    let binary = ""
    for (let i = 0; i < expectedBytes.length; i++) {
      binary += String.fromCharCode(expectedBytes[i]!)
    }
    expected = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }
  if (expected.length !== sig.length) return false
  let ok = true
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== sig[i]) ok = false
  }
  if (!ok) return false

  try {
    const data = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload)),
    ) as { exp?: number }
    return Boolean(data.exp && Date.now() <= data.exp)
  } catch {
    return false
  }
}

export function passwordsMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    timingSafeEqual(Buffer.alloc(b.length), b)
    return false
  }
  return timingSafeEqual(a, b)
}

export async function hasStaffPasswordSession(): Promise<boolean> {
  const jar = await cookies()
  return verifyStaffSessionToken(jar.get(STAFF_COOKIE)?.value)
}

export const staffPasswordUser = {
  userId: "staff-password",
  email: "staff@password",
  role: "admin" as const,
  viaPassword: true as const,
}

export { STAFF_MAX_AGE_SEC }
