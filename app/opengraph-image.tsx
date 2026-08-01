import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { ogImageAlt, siteName, siteUrl } from "@/lib/site-metadata"

export const alt = ogImageAlt
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

async function loadPng(name: string) {
  const buf = await readFile(join(process.cwd(), "public", "brand", name))
  return `data:image/png;base64,${buf.toString("base64")}`
}

export default async function Image() {
  const host = new URL(siteUrl).host
  const photo = await loadPng("maddy-og.png")
  const logo = await loadPng("logo-og.png")

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#1f2d3f",
          color: "#f7f4ec",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(180deg, rgba(31,45,63,0.35) 0%, rgba(31,45,63,0.55) 40%, rgba(31,45,63,0.92) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 64,
            width: "100%",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt=""
              width={72}
              height={72}
              style={{
                width: 72,
                height: 72,
                borderRadius: 9999,
                objectFit: "cover",
                background: "#f7f4ec",
              }}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                opacity: 0.92,
              }}
            >
              {siteName}
            </div>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 54,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              maxWidth: 920,
            }}
          >
            Joy that still moves mountains
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 24,
              opacity: 0.8,
              maxWidth: 760,
              color: "#e8e2d4",
            }}
          >
            Events · community · hope in Maddy’s spirit
          </div>
          <div
            style={{
              marginTop: 36,
              fontSize: 20,
              opacity: 0.55,
              color: "#c8c0ae",
            }}
          >
            {host}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
