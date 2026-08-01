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

/**
 * Strength of the green tent — matched to the old cool-gray fog on the
 * screenshot OG (even wash over the whole photo, text sits on top).
 * Satori often ignores div opacity, so the tent is an SVG <img> layer.
 */
const TENT_OPACITY = 0.55

/** Shift Maddy right so type can sit more centered without covering her face. */
const PHOTO_POSITION = "68% 18%"

const LOGO_SIZE = 128

function greenTentDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${DEEP}" fill-opacity="${TENT_OPACITY}"/></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

async function localBrand(file: "maddy.jpg" | "logo.jpg") {
  const buf = await readFile(join(process.cwd(), "public/brand", file))
  return `data:image/jpeg;base64,${buf.toString("base64")}`
}

/**
 * Stack (bottom → top): photo → even green tent → text.
 * Same structure as the gray-tinted screenshot card; tent is fairway green.
 */
function PhotoGreenTentCard(props: {
  photoSrc: string
  logoSrc: string
  /** Small label beside the logo (events use foundation name). */
  brandLine?: string
  title: string
  subtitle?: string
  footerLeft?: string
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
      {/* 1) Photo — subject nudged right */}
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
          objectFit: "cover",
          objectPosition: PHOTO_POSITION,
        }}
      />

      {/* 2) Even green tent as SVG <img> — above photo, below text */}
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

      {/* 3) Graphics more centered; face stays clear on the right */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: 1200,
          height: 630,
          padding: "56px 80px",
          color: ON_DEEP,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: 820,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 22,
              marginBottom: 26,
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
              <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.95 }}>
                {props.brandLine}
              </div>
            ) : null}
          </div>

          <div
            style={{
              fontSize: props.title.length > 40 ? 44 : 54,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            {props.title}
          </div>

          {props.subtitle ? (
            <div
              style={{
                marginTop: 16,
                fontSize: 26,
                opacity: 0.9,
                color: ON_DEEP_MUTED,
                textAlign: "center",
              }}
            >
              {props.subtitle}
            </div>
          ) : null}

          {props.footerLeft ? (
            <div
              style={{
                marginTop: 32,
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

/** Site card: name-forward, green tent over Maddy (no mountains line). */
export async function renderSiteOgImage() {
  const [photo, logo] = await Promise.all([
    localBrand("maddy.jpg"),
    localBrand("logo.jpg"),
  ])

  return new ImageResponse(
    (
      <PhotoGreenTentCard
        photoSrc={photo}
        logoSrc={logo}
        title={siteName}
        subtitle="Events · scholarships · hope"
      />
    ),
    { ...ogSize },
  )
}

/** Event card: same green tent; custom title + details; cover when set. */
export async function renderEventOgImage(event: EventRow | null) {
  const logo = await localBrand("logo.jpg")

  let photo = await localBrand("maddy.jpg")
  if (event?.cover_image_url?.trim()) {
    const url = event.cover_image_url.trim()
    if (/^https?:\/\//i.test(url)) photo = url
  }

  const title = event?.title || "Foundation gathering"
  const when = event ? formatEventDate(event.starts_at) : ""
  const where = event?.location?.trim() || ""
  const whereShort =
    where.length > 56 ? `${where.slice(0, 53).trimEnd()}…` : where
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
      />
    ),
    { ...ogSize },
  )
}
