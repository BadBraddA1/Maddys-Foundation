import { ImageResponse } from "next/og"
import { ogImageAlt, siteName, siteUrl } from "@/lib/site-metadata"

export const alt = ogImageAlt
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  const host = new URL(siteUrl).host

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 64,
          background: "linear-gradient(160deg, #1c2430 0%, #3a4658 55%, #c9a227 160%)",
          color: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.85,
            marginBottom: 16,
          }}
        >
          Foundation
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.02em", maxWidth: 900 }}>
          {siteName}
        </div>
        <div style={{ marginTop: 18, fontSize: 28, opacity: 0.9, maxWidth: 800 }}>
          Joy that still moves mountains
        </div>
        <div style={{ marginTop: 36, fontSize: 22, opacity: 0.65 }}>{host}</div>
      </div>
    ),
    { ...size },
  )
}
