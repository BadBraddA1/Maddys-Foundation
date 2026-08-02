import { readFileSync } from "node:fs"
import { siteUrl } from "@/lib/site-metadata"

type ServiceAccountKey = {
  client_email: string
  private_key: string
  [key: string]: unknown
}

function parseServiceAccountKey(raw: string): ServiceAccountKey | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    if (trimmed.startsWith("{")) return JSON.parse(trimmed) as ServiceAccountKey
    // base64 of the JSON file
    const decoded = Buffer.from(trimmed, "base64").toString("utf8")
    if (decoded.trim().startsWith("{")) {
      return JSON.parse(decoded) as ServiceAccountKey
    }
  } catch {
    return null
  }
  return null
}

export function loadGoogleWalletServiceAccount(): ServiceAccountKey | null {
  const inline = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY?.trim()
  if (inline) {
    const parsed = parseServiceAccountKey(inline)
    if (parsed?.client_email && parsed?.private_key) return parsed
  }
  const file = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_FILE?.trim()
  if (file) {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as ServiceAccountKey
      if (parsed?.client_email && parsed?.private_key) return parsed
    } catch {
      return null
    }
  }
  return null
}

export function googleWalletConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID?.trim() && loadGoogleWalletServiceAccount(),
  )
}

export function googleWalletIssuerId(): string {
  return process.env.GOOGLE_WALLET_ISSUER_ID!.trim()
}

export function googleWalletClassSuffix(eventSlug: string): string {
  const fromEnv = process.env.GOOGLE_WALLET_CLASS_SUFFIX?.trim()
  if (fromEnv) {
    // Per-event class keeps titles accurate when multiple events exist.
    const slug = eventSlug
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40)
    return `${fromEnv}_${slug || "event"}`
  }
  return "mrf_event_ticket"
}

export function googleWalletOrigins(): string[] {
  const origins = new Set<string>([
    "https://maddys-foundation.vercel.app",
    siteUrl,
  ])
  try {
    origins.add(new URL(siteUrl).origin)
  } catch {
    /* ignore */
  }
  const extra = process.env.GOOGLE_WALLET_ORIGINS?.split(",") ?? []
  for (const o of extra) {
    const t = o.trim()
    if (t) origins.add(t.replace(/\/$/, ""))
  }
  return [...origins]
}
