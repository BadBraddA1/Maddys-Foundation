import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { formatEventDate, formatFee, type EventRow } from "@/lib/events"
import { siteName } from "@/lib/site-metadata"

export const ogSize = { width: 1200, height: 630 }
export const ogContentType = "image/png"
export const siteOgAlt =
  "Madalyn Robinson Foundation — events, scholarships, and hope"

/** Home fairway green — solid card chrome. */
const DEEP = "#1c3d32"
const ON_DEEP = "#f4f1e8"
const ON_DEEP_MUTED = "#d8e4dc"
const ACCENT = "#c9a84a"
const ACCENT_INK = "#3d2e12"
const LOGO_SIZE = 144

function greenTentDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${DEEP}" fill-opacity="0.55"/></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

async function brandDataUrl(file: string, mime: "image/jpeg" | "image/png") {
  const buf = await readFile(join(process.cwd(), "public/brand", file))
  return `data:${mime};base64,${buf.toString("base64")}`
}

function TypeBlock(props: {
  logoSrc: string
  brandLine?: string
  title: string
  subtitle?: string
  footerLeft?: string
}) {
  return (
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
  )
}

/**
 * Site / default event card: pre-flattened fairway green + Maddy (opaque PNG).
 * No transparent layers — avoids checkerboard / white halo in OG renderers.
 */
function FlatCutoutCard(props: {
  baseSrc: string
  logoSrc: string
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={props.baseSrc}
        alt=""
        width={1200}
        height={630}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          objectFit: "fill",
        }}
      />
      <TypeBlock
        logoSrc={props.logoSrc}
        brandLine={props.brandLine}
        title={props.title}
        subtitle={props.subtitle}
        footerLeft={props.footerLeft}
      />
    </div>
  )
}

/** Event cover photo under a green tent + type. */
function CoverTentCard(props: {
  photoSrc: string
  logoSrc: string
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
          objectPosition: "70% 20%",
        }}
      />
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
      <TypeBlock
        logoSrc={props.logoSrc}
        brandLine={props.brandLine}
        title={props.title}
        subtitle={props.subtitle}
        footerLeft={props.footerLeft}
      />
    </div>
  )
}

/** Site card: flat fairway plate + name-forward type. */
export async function renderSiteOgImage() {
  const [base, logo] = await Promise.all([
    brandDataUrl("maddy-og-cutout.png", "image/png"),
    brandDataUrl("logo.jpg", "image/jpeg"),
  ])

  return new ImageResponse(
    (
      <FlatCutoutCard
        baseSrc={base}
        logoSrc={logo}
        title={siteName}
        subtitle="Events · scholarships · hope"
      />
    ),
    { ...ogSize },
  )
}

/** Event card: cover under tent when set; else same flat cutout plate. */
export async function renderEventOgImage(event: EventRow | null) {
  const logo = await brandDataUrl("logo.jpg", "image/jpeg")
  const title = event?.title || "Foundation gathering"
  const when = event ? formatEventDate(event.starts_at) : ""
  const where = event?.location?.trim() || ""
  const whereShort =
    where.length > 48 ? `${where.slice(0, 45).trimEnd()}…` : where
  const fee = event ? formatFee(event.fee_cents) : null
  const subtitle = [when, whereShort, fee].filter(Boolean).join(" · ")

  const cover = event?.cover_image_url?.trim()
  if (cover && /^https?:\/\//i.test(cover)) {
    return new ImageResponse(
      (
        <CoverTentCard
          photoSrc={cover}
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

  const base = await brandDataUrl("maddy-og-cutout.png", "image/png")
  return new ImageResponse(
    (
      <FlatCutoutCard
        baseSrc={base}
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
