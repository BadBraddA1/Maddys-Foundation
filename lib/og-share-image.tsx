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
 * Share card bands:
 * 1) Top — fairway green tent + logo/text
 * 2) Bottom — photo with green tent over it
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
          flexDirection: "column",
          backgroundColor: "#1c3d32",
        }}
      >
        {/* Top band: tent + text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "100%",
            height: 300,
            padding: "40px 56px 28px",
            background:
              "linear-gradient(165deg, #1c3d32 0%, #243f36 55%, #2a4a3e 100%)",
            color: "#f4f1e8",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 18,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt=""
              width={64}
              height={64}
              style={{
                width: 64,
                height: 64,
                borderRadius: 9999,
                objectFit: "cover",
                backgroundColor: "#f4f1e8",
              }}
            />
            <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.95 }}>
              {siteName}
            </div>
          </div>

          <div
            style={{
              fontSize: 52,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              maxWidth: 980,
            }}
          >
            Joy that still moves mountains
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 24,
              opacity: 0.88,
              color: "#d8e0da",
            }}
          >
            Events · community · hope in Maddy’s spirit
          </div>
        </div>

        {/* Bottom band: photo + tent */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: 330,
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            width={1200}
            height={330}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 18%",
            }}
          />
          {/* Green tent over the photo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(28,61,50,0.55) 0%, rgba(28,61,50,0.28) 45%, rgba(28,61,50,0.45) 100%)",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-end",
              marginTop: "auto",
              padding: "0 56px 28px",
              fontSize: 20,
              color: "#d8e0da",
              opacity: 0.75,
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
