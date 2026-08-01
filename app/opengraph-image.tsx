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
          background: "linear-gradient(165deg, #1f2d3f 0%, #2a3a4d 65%, #6b7a48 145%)",
          color: "#f7f4ec",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", maxWidth: 900 }}>
          {siteName}
        </div>
        <div style={{ marginTop: 16, fontSize: 26, opacity: 0.88, maxWidth: 760, color: "#e8e2d4" }}>
          Joy that still moves mountains
        </div>
        <div style={{ marginTop: 40, fontSize: 20, opacity: 0.55, color: "#c8c0ae" }}>{host}</div>
      </div>
    ),
    { ...size },
  )
}
