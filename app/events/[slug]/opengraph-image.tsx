import { ImageResponse } from "next/og"
import { formatEventDate, formatFee, getEventBySlug } from "@/lib/events"
import { siteName, siteUrl } from "@/lib/site-metadata"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Foundation event"

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const event = await getEventBySlug(slug).catch(() => null)
  const host = new URL(siteUrl).host

  const title = event?.title || "Foundation gathering"
  const when = event ? formatEventDate(event.starts_at) : ""
  const where = event?.location || ""
  const fee = event ? formatFee(event.fee_cents) : null
  const meta = [when, where, fee].filter(Boolean).join(" · ")

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: "linear-gradient(165deg, #1f2d3f 0%, #2a3a4d 55%, #6b7a48 140%)",
          color: "#f7f4ec",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.85 }}>{siteName}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 980 }}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
            }}
          >
            {title}
          </div>
          {meta ? (
            <div style={{ fontSize: 26, opacity: 0.88, color: "#e8e2d4" }}>{meta}</div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "14px 28px",
              backgroundColor: "#c9a84a",
              color: "#3d2e12",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            View event →
          </div>
          <div style={{ fontSize: 20, opacity: 0.55, color: "#c8c0ae" }}>{host}</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
