import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { ogImageAlt, siteName, siteUrl } from "@/lib/site-metadata"

export const ogShareSize = { width: 1200, height: 630 }
export const ogShareContentType = "image/png"
export const ogShareAlt = ogImageAlt

async function brandDataUrls() {
  const brand = join(process.cwd(), "public/brand")
  const [photo, logo] = await Promise.all([
    readFile(join(brand, "maddy.jpg")),
    readFile(join(brand, "logo.jpg")),
  ])
  return {
    photo: `data:image/jpeg;base64,${photo.toString("base64")}`,
    logo: `data:image/jpeg;base64,${logo.toString("base64")}`,
  }
}

/**
 * Site share card — matches home hero: clear photo + fairway green washes
 * (top scrim + bottom stage), not a muddy full-frame green filter.
 */
export async function renderOgShareImage() {
  const { photo, logo } = await brandDataUrls()
  const host = new URL(siteUrl).host

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#1c3d32",
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
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />

        {/* Soft top scrim (header readability) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(28,61,50,0.72) 0%, rgba(28,61,50,0.28) 28%, rgba(28,61,50,0) 48%)",
          }}
        />

        {/* Bottom stage wash — same idea as home hero from-deep gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(0deg, rgba(28,61,50,0.94) 0%, rgba(28,61,50,0.78) 28%, rgba(28,61,50,0.35) 55%, rgba(28,61,50,0) 72%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
            padding: "52px 56px 48px",
            color: "#f4f1e8",
          }}
        >
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
              src={logo}
              alt=""
              width={72}
              height={72}
              style={{
                width: 72,
                height: 72,
                borderRadius: 9999,
                objectFit: "cover",
                backgroundColor: "#f4f1e8",
              }}
            />
            <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.95 }}>
              {siteName}
            </div>
          </div>

          <div
            style={{
              fontSize: 58,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              maxWidth: 920,
            }}
          >
            Joy that still moves mountains
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 26,
              opacity: 0.88,
              color: "#d8e0da",
            }}
          >
            Events · community · hope in Maddy’s spirit
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 20,
              opacity: 0.5,
              color: "#c5cfc8",
            }}
          >
            {host}
          </div>
        </div>
      </div>
    ),
    { ...ogShareSize },
  )
}
