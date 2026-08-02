import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { PKPass } from "passkit-generator"
import {
  appleWalletConfigured,
  appleWalletEnvPems,
} from "@/lib/apple-wallet-config"
import { ticketUrlForCode } from "@/lib/registration-emails"
import { siteName } from "@/lib/site-metadata"
import { publicSiteUrl } from "@/lib/stripe"
import { playerTicketUrlForCode } from "@/lib/ticket"
import { toEventIso } from "@/lib/event-helpers"

export { appleWalletConfigured } from "@/lib/apple-wallet-config"

/** Oak Valley Golf Course & Resort, Pevely MO — default relevance pin. */
export const DEFAULT_VENUE = {
  latitude: 38.292404,
  longitude: -90.391714,
  relevantText: "Oak Valley Golf Course nearby",
}

export type WalletPassInput = {
  kind: "team" | "player"
  code: string
  serialSuffix: string
  eventTitle: string
  eventSlug: string
  eventWhenLabel: string
  eventStartsAt: string
  eventLocation: string
  teamName: string
  holderLabel: string
  holderName: string
  venueLatitude?: number | null
  venueLongitude?: number | null
}

const PASS_IMAGE_NAMES = [
  "icon.png",
  "icon@2x.png",
  "icon@3x.png",
  "logo.png",
  "logo@2x.png",
  "logo@3x.png",
  "strip.png",
  "strip@2x.png",
  "strip@3x.png",
] as const

/** Prebuilt under public/brand/wallet/ so Vercel never needs the sharp native binary. */
async function passImages(): Promise<Record<string, Buffer>> {
  const dir = join(process.cwd(), "public/brand/wallet")
  const entries = await Promise.all(
    PASS_IMAGE_NAMES.map(async (name) => {
      const buf = await readFile(join(dir, name))
      return [name, buf] as const
    }),
  )
  return Object.fromEntries(entries)
}

/** Compact front-face copy — Wallet truncates long secondary values with “…”. */
export function walletFrontWhen(iso: string, fallbackLabel: string): string {
  // Event times in Turso are America/Chicago wall clocks without a zone.
  // Don't append Z / shift to UTC or the pass shows the wrong hour.
  const m = iso
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?/)
  if (!m) return clipPassText(fallbackLabel, 22)
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const hour = Number(m[4] ?? 0)
  const minute = Number(m[5] ?? 0)
  const weekday = new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
  })
  const monthShort = new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
  })
  const hour12 = ((hour + 11) % 12) + 1
  const ampm = hour >= 12 ? "PM" : "AM"
  const mm = String(minute).padStart(2, "0")
  return `${weekday}, ${monthShort} ${day}, ${hour12}:${mm} ${ampm}`
}

/** Venue name only (drop street) so WHERE stays readable on the face. */
export function walletFrontWhere(location: string): string {
  const raw = location.trim()
  if (!raw) return "See back"
  const venue = raw.split(",")[0]?.trim() || raw
  return clipPassText(venue, 24)
}

function clipPassText(value: string, max: number): string {
  const t = value.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}…`
}

function walletFrontTitle(title: string): string {
  // Event-ticket primary field is short; prefer a scramble-friendly label.
  const t = title.trim()
  if (/golf\s*scramble/i.test(t)) return "Golf Scramble"
  return clipPassText(t, 22)
}

function venueFor(input: WalletPassInput) {
  const lat =
    input.venueLatitude != null && Number.isFinite(input.venueLatitude)
      ? input.venueLatitude
      : DEFAULT_VENUE.latitude
  const lng =
    input.venueLongitude != null && Number.isFinite(input.venueLongitude)
      ? input.venueLongitude
      : DEFAULT_VENUE.longitude
  const relevantText = input.eventLocation.trim()
    ? `${walletFrontWhere(input.eventLocation)} nearby`
    : DEFAULT_VENUE.relevantText
  return { latitude: lat, longitude: lng, relevantText }
}

export async function buildTicketPkpass(
  input: WalletPassInput,
): Promise<Buffer> {
  if (!appleWalletConfigured()) {
    throw new Error("Apple Wallet is not configured")
  }

  const {
    passTypeIdentifier,
    teamIdentifier,
    wwdr,
    signerCert,
    signerKey,
    signerKeyPassphrase,
  } = appleWalletEnvPems()

  const ticketUrl =
    input.kind === "player"
      ? playerTicketUrlForCode(input.code)
      : ticketUrlForCode(input.code)

  const images = await passImages()
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier,
    teamIdentifier,
    organizationName: siteName,
    description: `${input.eventTitle} check-in`,
    serialNumber: `mrf-${input.kind}-${input.serialSuffix}-${input.code}`
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
      .slice(0, 64),
    foregroundColor: "rgb(244, 241, 232)",
    backgroundColor: "rgb(28, 61, 50)",
    labelColor: "rgb(201, 168, 74)",
    logoText: "Maddy’s",
    sharingProhibited: false,
  }

  const pass = new PKPass(
    {
      ...images,
      "pass.json": Buffer.from(JSON.stringify(passJson), "utf8"),
    },
    {
      wwdr,
      signerCert,
      signerKey,
      signerKeyPassphrase,
    },
  )

  pass.type = "eventTicket"

  pass.headerFields.push({
    key: "code",
    label: "CODE",
    value: input.code,
  })

  pass.primaryFields.push({
    key: "event",
    label: "EVENT",
    value: walletFrontTitle(input.eventTitle),
  })

  pass.secondaryFields.push(
    {
      key: "when",
      label: "WHEN",
      value: walletFrontWhen(input.eventStartsAt, input.eventWhenLabel),
    },
    {
      key: "where",
      label: "WHERE",
      value: walletFrontWhere(input.eventLocation),
    },
  )

  pass.auxiliaryFields.push(
    {
      key: "team",
      label: "TEAM",
      value: clipPassText(input.teamName, 18),
    },
    {
      key: "holder",
      label: input.holderLabel,
      value: clipPassText(input.holderName, 18),
    },
  )

  pass.backFields.push(
    {
      key: "when_full",
      label: "When",
      value: input.eventWhenLabel,
    },
    {
      key: "where_full",
      label: "Where",
      value: input.eventLocation || "See event page",
    },
    {
      key: "instructions",
      label: "Check-in",
      value:
        input.kind === "player"
          ? "Show this pass at the check-in desk. Staff will scan the QR to check you in automatically."
          : "Show this team pass at the desk, or have each player use their personal ticket QR for auto check-in.",
    },
    {
      key: "web",
      label: "Ticket page",
      value: ticketUrl,
    },
    {
      key: "eventpage",
      label: "Event details",
      value: `${publicSiteUrl()}/events/${input.eventSlug}`,
    },
  )

  // QR encodes the same URL the desk scanner already understands.
  pass.setBarcodes({
    message: ticketUrl,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: input.code,
  })

  const venue = venueFor(input)
  pass.setLocations({
    latitude: venue.latitude,
    longitude: venue.longitude,
    relevantText: venue.relevantText,
  })

  const starts = new Date(toEventIso(input.eventStartsAt))
  if (!Number.isNaN(starts.getTime())) {
    // Show on lock screen around event day; location also triggers near the course.
    const dayStart = new Date(starts)
    dayStart.setHours(starts.getHours() - 2, 0, 0, 0)
    const dayEnd = new Date(starts)
    dayEnd.setHours(starts.getHours() + 8, 0, 0, 0)
    pass.setRelevantDates([
      {
        startDate: dayStart.toISOString(),
        endDate: dayEnd.toISOString(),
      },
    ])
    pass.setExpirationDate(
      new Date(starts.getTime() + 2 * 24 * 60 * 60 * 1000),
    )
  }

  return pass.getAsBuffer()
}
