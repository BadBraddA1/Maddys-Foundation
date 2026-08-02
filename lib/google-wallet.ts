import jwt from "jsonwebtoken"
import type { WalletPassInput } from "@/lib/apple-wallet"
import {
  DEFAULT_VENUE,
  walletFrontWhen,
  walletFrontWhere,
} from "@/lib/apple-wallet"
import {
  googleWalletClassSuffix,
  googleWalletConfigured,
  googleWalletIssuerId,
  googleWalletOrigins,
  loadGoogleWalletServiceAccount,
} from "@/lib/google-wallet-config"
import { ticketUrlForCode } from "@/lib/registration-emails"
import { siteName } from "@/lib/site-metadata"
import { publicSiteUrl } from "@/lib/stripe"
import { playerTicketUrlForCode } from "@/lib/ticket"
import { toEventIso } from "@/lib/event-helpers"

export { googleWalletConfigured } from "@/lib/google-wallet-config"

function loc(value: string) {
  return {
    defaultValue: {
      language: "en-US",
      value,
    },
  }
}

function objectSuffix(input: WalletPassInput): string {
  return `mrf_${input.kind}_${input.serialSuffix}_${input.code}`
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 64)
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
  return { latitude: lat, longitude: lng }
}

function eventStartIso(input: WalletPassInput): string | null {
  const d = new Date(toEventIso(input.eventStartsAt))
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/** Signed “Add to Google Wallet” URL for this ticket. */
export function buildGoogleWalletSaveUrl(input: WalletPassInput): string {
  if (!googleWalletConfigured()) {
    throw new Error("Google Wallet is not configured")
  }
  const sa = loadGoogleWalletServiceAccount()!
  const issuerId = googleWalletIssuerId()
  const classSuffix = googleWalletClassSuffix(input.eventSlug)
  const objSuffix = objectSuffix(input)
  const classId = `${issuerId}.${classSuffix}`
  const objectId = `${issuerId}.${objSuffix}`

  const ticketUrl =
    input.kind === "player"
      ? playerTicketUrlForCode(input.code)
      : ticketUrlForCode(input.code)

  const logoUri = `${publicSiteUrl()}/brand/maddy-wallet-badge.png`
  const venue = venueFor(input)
  const start = eventStartIso(input)

  const newClass = {
    id: classId,
    issuerName: siteName,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: "#1c3d32",
    logo: {
      sourceUri: { uri: logoUri },
      contentDescription: loc(`${siteName} logo`),
    },
    eventName: loc(input.eventTitle),
    venue: {
      name: loc(walletFrontWhere(input.eventLocation) || "Event venue"),
      address: loc(input.eventLocation || "See event page"),
    },
    ...(start
      ? {
          dateTime: {
            start,
          },
        }
      : {}),
    homepageUri: {
      uri: `${publicSiteUrl()}/events/${input.eventSlug}`,
      description: "Event details",
    },
  }

  const newObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    ticketHolderName: input.holderName,
    ticketNumber: input.code,
    ticketType: loc(input.kind === "player" ? "Player" : "Team / Captain"),
    barcode: {
      type: "QR_CODE",
      value: ticketUrl,
      alternateText: input.code,
    },
    locations: [venue],
    textModulesData: [
      {
        id: "when",
        header: "When",
        body: walletFrontWhen(input.eventStartsAt, input.eventWhenLabel),
      },
      {
        id: "team",
        header: "Team",
        body: input.teamName,
      },
      {
        id: "holder",
        header: input.holderLabel,
        body: input.holderName,
      },
    ],
    linksModuleData: {
      uris: [
        {
          uri: ticketUrl,
          description: "Open ticket page",
          id: "ticket",
        },
        {
          uri: `${publicSiteUrl()}/events/${input.eventSlug}`,
          description: "Event details",
          id: "event",
        },
      ],
    },
  }

  const claims = {
    iss: sa.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: googleWalletOrigins(),
    payload: {
      eventTicketClasses: [newClass],
      eventTicketObjects: [newObject],
    },
  }

  const token = jwt.sign(claims, sa.private_key, { algorithm: "RS256" })
  return `https://pay.google.com/gp/v/save/${token}`
}
