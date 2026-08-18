import { NextResponse } from "next/server"
import JSZip from "jszip"
import { requireAdmin } from "@/lib/auth"
import { getSponsor, listSponsors, type Sponsor } from "@/lib/sponsors"

export const runtime = "nodejs"

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
}

function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return slug || "sponsor"
}

/** Prefer the R2 key's extension, then content-type, then the URL path. */
function logoExtension(sponsor: Sponsor, contentType: string): string {
  const fromKey = sponsor.logo_key.match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromKey) return fromKey.toLowerCase()
  const fromType = EXT_BY_CONTENT_TYPE[contentType.split(";")[0]?.trim() ?? ""]
  if (fromType) return fromType
  const fromUrl = sponsor.logo_url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]
  return fromUrl?.toLowerCase() ?? "png"
}

async function fetchLogo(
  sponsor: Sponsor,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const url = sponsor.logo_url.trim()
  if (!url) return null
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    return {
      bytes: await res.arrayBuffer(),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const idRaw = url.searchParams.get("id")

  // Single logo download
  if (idRaw != null) {
    const id = Number(idRaw)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 })
    }
    const sponsor = await getSponsor(id)
    if (!sponsor) {
      return NextResponse.json({ error: "Sponsor not found." }, { status: 404 })
    }
    const logo = await fetchLogo(sponsor)
    if (!logo) {
      return NextResponse.json(
        { error: "This sponsor has no downloadable logo." },
        { status: 404 },
      )
    }
    const filename = `${slugifyName(sponsor.name)}.${logoExtension(sponsor, logo.contentType)}`
    return new NextResponse(logo.bytes, {
      headers: {
        "Content-Type": logo.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  }

  // All logos as a zip — one entry per unique logo (multi-package sponsors
  // share a logo across rows).
  const sponsors = await listSponsors()
  const seen = new Set<string>()
  const unique: Sponsor[] = []
  for (const sponsor of sponsors) {
    const dedupeKey = (sponsor.logo_key || sponsor.logo_url).trim().toLowerCase()
    if (!dedupeKey || seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    unique.push(sponsor)
  }
  if (unique.length === 0) {
    return NextResponse.json(
      { error: "No sponsor logos to download." },
      { status: 404 },
    )
  }

  const zip = new JSZip()
  const usedNames = new Set<string>()
  const results = await Promise.all(
    unique.map(async (sponsor) => ({ sponsor, logo: await fetchLogo(sponsor) })),
  )

  let added = 0
  for (const { sponsor, logo } of results) {
    if (!logo) continue
    const base = slugifyName(sponsor.name)
    const ext = logoExtension(sponsor, logo.contentType)
    let filename = `${base}.${ext}`
    for (let n = 2; usedNames.has(filename); n++) {
      filename = `${base}-${n}.${ext}`
    }
    usedNames.add(filename)
    zip.file(filename, logo.bytes)
    added++
  }

  if (added === 0) {
    return NextResponse.json(
      { error: "Could not fetch any sponsor logos." },
      { status: 502 },
    )
  }

  const bytes = await zip.generateAsync({ type: "uint8array" })
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="sponsor-logos-${date}.zip"`,
      "Cache-Control": "no-store",
    },
  })
}
