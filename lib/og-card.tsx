import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { formatEventDate, formatFee, type EventRow } from "@/lib/events"
import { ogImageAlt, siteName, siteUrl } from "@/lib/site-metadata"

export const ogSize = { width: 1200, height: 630 }
export const ogContentType = "image/png"

const DEEP = "#1c3d32"
const ON_DEEP = "#f4f1e8"
const ON_DEEP_MUTED = "#d8e0da"
const ACCENT = "#c9a84a"
const ACCENT_INK = "#3d2e12"

async function localBrand(file: "maddy.jpg" | "logo.jpg") {
  const buf = await readFile(join(process.cwd(), "public/brand", file))
  return `data:image/jpeg;base64,${buf.toString("base64")}`
}

/** Green tent over a full-bleed photo — same card language as the site OG. */
function PhotoTentCard(props: {
  photoSrc: string
  logoSrc: string
  /** Small line next to logo; omit when the title is the foundation name. */
  eyebrow?: string
  title: string
  subtitle?: string
  footerLeft?: string
  host: string
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: DEEP,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={props.photoSrc}
        alt=""
        width={1200}
        height={630}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
        }}
      />
      {/* Fairway green tent */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: DEEP,
          opacity: 0.52,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(28,61,50,0.35) 0%, rgba(28,61,50,0.15) 40%, rgba(28,61,50,0.62) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          color: ON_DEEP,
        }}
      >
        {props.eyebrow ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 22,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.logoSrc}
              alt=""
              width={72}
              height={72}
              style={{
                width: 72,
                height: 72,
                borderRadius: 9999,
                objectFit: "cover",
                backgroundColor: ON_DEEP,
              }}
            />
            <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.92 }}>
              {props.eyebrow}
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            maxWidth: 1040,
          }}
        >
          {!props.eyebrow ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.logoSrc}
              alt=""
              width={88}
              height={88}
              style={{
                width: 88,
                height: 88,
                borderRadius: 9999,
                objectFit: "cover",
                backgroundColor: ON_DEEP,
                flexShrink: 0,
              }}
            />
          ) : null}
          <div
            style={{
              fontSize: props.title.length > 42 ? 48 : 56,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
            }}
          >
            {props.title}
          </div>
        </div>

        {props.subtitle ? (
          <div
            style={{
              marginTop: 16,
              fontSize: 26,
              opacity: 0.9,
              color: ON_DEEP_MUTED,
              maxWidth: 900,
            }}
          >
            {props.subtitle}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            marginTop: 36,
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {props.footerLeft ? (
            <div
              style={{
                padding: "14px 28px",
                backgroundColor: ACCENT,
                color: ACCENT_INK,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {props.footerLeft}
            </div>
          ) : (
            <div />
          )}
          <div style={{ fontSize: 20, opacity: 0.55, color: ON_DEEP_MUTED }}>
            {props.host}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Site-wide share card — name-forward (no mountains tagline). */
export async function renderSiteOgImage() {
  const [photo, logo] = await Promise.all([
    localBrand("maddy.jpg"),
    localBrand("logo.jpg"),
  ])
  const host = new URL(siteUrl).host

  return new ImageResponse(
    (
      <PhotoTentCard
        photoSrc={photo}
        logoSrc={logo}
        title={siteName}
        subtitle="Events · scholarships · hope"
        host={host}
      />
    ),
    { ...ogSize },
  )
}

export const siteOgAlt =
  "Madalyn Robinson Foundation — events, scholarships, and hope"

/** Per-event share card — custom title/meta; cover photo when set. */
export async function renderEventOgImage(event: EventRow | null) {
  const logo = await localBrand("logo.jpg")
  const host = new URL(siteUrl).host

  let photo = await localBrand("maddy.jpg")
  if (event?.cover_image_url?.trim()) {
    const url = event.cover_image_url.trim()
    if (/^https?:\/\//i.test(url)) {
      photo = url
    }
  }

  const title = event?.title || "Foundation gathering"
  const when = event ? formatEventDate(event.starts_at) : ""
  const where = event?.location?.trim() || ""
  // Keep location short for the card
  const whereShort =
    where.length > 56 ? `${where.slice(0, 53).trimEnd()}…` : where
  const fee = event ? formatFee(event.fee_cents) : null
  const subtitle = [when, whereShort, fee].filter(Boolean).join(" · ")

  return new ImageResponse(
    (
      <PhotoTentCard
        photoSrc={photo}
        logoSrc={logo}
        eyebrow={siteName}
        title={title}
        subtitle={subtitle || undefined}
        footerLeft="View event →"
        host={host}
      />
    ),
    { ...ogSize },
  )
}
