import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { formatEventDate, formatFee, type EventRow } from "@/lib/events"
import { siteName } from "@/lib/site-metadata"

export const ogSize = { width: 1200, height: 630 }
export const ogContentType = "image/png"
export const siteOgAlt =
  "Madalyn Robinson Foundation — events, scholarships, and hope"

const DEEP = "#1c3d32"
const ON_DEEP = "#f4f1e8"
const ON_DEEP_MUTED = "#e2e8e4"
const ACCENT = "#c9a84a"
const ACCENT_INK = "#3d2e12"

/** Green tent over white + cutout (Satori-safe SVG layer). */
const TENT_OPACITY = 0.48
/** ~20% larger than the previous 120px mark */
const LOGO_SIZE = 144

function greenTentDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${DEEP}" fill-opacity="${TENT_OPACITY}"/></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

async function brandDataUrl(file: string, mime: "image/jpeg" | "image/png") {
  const buf = await readFile(join(process.cwd(), "public/brand", file))
  return `data:${mime};base64,${buf.toString("base64")}`
}

/**
 * Stack: white (or photo) → subject cutout on the right → green tent → text on the left.
 * Avoids text colliding with Maddy’s body.
 */
function PhotoGreenTentCard(props: {
  photoSrc: string
  logoSrc: string
  brandLine?: string
  title: string
  subtitle?: string
  footerLeft?: string
  /** When true, photo is a cutout already placed on white (site card). */
  cutoutOnWhite?: boolean
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Subject — cutout asset is already composed 1200×630 (use fill, don’t re-crop).
          Full-bleed covers still bias right so faces stay clear of left type. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={props.photoSrc}
        alt=""
        width={1200}
        height={630}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          objectFit: props.cutoutOnWhite ? "fill" : "cover",
          objectPosition: props.cutoutOnWhite ? "center center" : "70% 20%",
        }}
      />

      {/* Green tent above photo/cutout, below text */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={greenTentDataUrl()}
        alt=""
        width={1200}
        height={630}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
        }}
      />

      {/* Type in the open left area — stays off her face/torso */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          width: 1200,
          height: 630,
          padding: "48px 56px 56px 64px",
          color: ON_DEEP,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            maxWidth: 560,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 24,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.logoSrc}
              alt=""
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              style={{
                width: LOGO_SIZE,
                height: LOGO_SIZE,
                borderRadius: 9999,
                objectFit: "cover",
                backgroundColor: ON_DEEP,
                flexShrink: 0,
              }}
            />
            {props.brandLine ? (
              <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.95 }}>
                {props.brandLine}
              </div>
            ) : null}
          </div>

          <div
            style={{
              fontSize: props.title.length > 36 ? 42 : 50,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {props.title}
          </div>

          {props.subtitle ? (
            <div
              style={{
                marginTop: 16,
                fontSize: 24,
                opacity: 0.92,
                color: ON_DEEP_MUTED,
              }}
            >
              {props.subtitle}
            </div>
          ) : null}

          {props.footerLeft ? (
            <div
              style={{
                marginTop: 28,
                padding: "14px 28px",
                backgroundColor: ACCENT,
                color: ACCENT_INK,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {props.footerLeft}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Site card: cutout on white, green tent, name-forward type on the left. */
export async function renderSiteOgImage() {
  const [photo, logo] = await Promise.all([
    brandDataUrl("maddy-og-cutout.png", "image/png"),
    brandDataUrl("logo.jpg", "image/jpeg"),
  ])

  return new ImageResponse(
    (
      <PhotoGreenTentCard
        photoSrc={photo}
        logoSrc={logo}
        title={siteName}
        subtitle="Events · scholarships · hope"
        cutoutOnWhite
      />
    ),
    { ...ogSize },
  )
}

/** Event card: cover when set, else same cutout treatment. */
export async function renderEventOgImage(event: EventRow | null) {
  const logo = await brandDataUrl("logo.jpg", "image/jpeg")

  let photo = await brandDataUrl("maddy-og-cutout.png", "image/png")
  let cutoutOnWhite = true
  if (event?.cover_image_url?.trim()) {
    const url = event.cover_image_url.trim()
    if (/^https?:\/\//i.test(url)) {
      photo = url
      cutoutOnWhite = false
    }
  }

  const title = event?.title || "Foundation gathering"
  const when = event ? formatEventDate(event.starts_at) : ""
  const where = event?.location?.trim() || ""
  const whereShort =
    where.length > 48 ? `${where.slice(0, 45).trimEnd()}…` : where
  const fee = event ? formatFee(event.fee_cents) : null
  const subtitle = [when, whereShort, fee].filter(Boolean).join(" · ")

  return new ImageResponse(
    (
      <PhotoGreenTentCard
        photoSrc={photo}
        logoSrc={logo}
        brandLine={siteName}
        title={title}
        subtitle={subtitle || undefined}
        footerLeft="View event →"
        cutoutOnWhite={cutoutOnWhite}
      />
    ),
    { ...ogSize },
  )
}
