interface Env {
  MEDIA: R2Bucket
  R2_PUBLIC_URL: string
  UPLOAD_SECRET: string
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])
const MAX_BYTES = 8 * 1024 * 1024
const KEY_RE = /^(sponsors|gallery)\/[a-zA-Z0-9._/-]+$/

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 })
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-upload-secret",
  }
}

function extForType(type: string): string {
  if (type === "image/png") return "png"
  if (type === "image/webp") return "webp"
  if (type === "image/gif") return "gif"
  if (type === "image/svg+xml") return "svg"
  return "jpg"
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() })
    }

    const secret = request.headers.get("x-upload-secret")
    if (!secret || secret !== env.UPLOAD_SECRET) {
      return unauthorized()
    }

    if (request.method === "POST" && url.pathname === "/upload") {
      const form = await request.formData()
      const file = form.get("file")
      const folderRaw = String(form.get("folder") ?? "").trim()
      const keyOverride = String(form.get("key") ?? "").trim()

      if (!(file instanceof File)) {
        return badRequest("file is required")
      }
      if (!ALLOWED_TYPES.has(file.type)) {
        return badRequest("File must be JPEG, PNG, WebP, GIF, or SVG")
      }
      if (file.size > MAX_BYTES) {
        return badRequest("File must be under 8 MB")
      }

      let key = keyOverride
      if (!key) {
        const folder =
          folderRaw === "sponsors" || folderRaw === "gallery"
            ? folderRaw
            : null
        if (!folder) {
          return badRequest("folder must be sponsors or gallery")
        }
        const id = crypto.randomUUID()
        key = `${folder}/${id}.${extForType(file.type)}`
      }

      if (!KEY_RE.test(key) || key.includes("..")) {
        return badRequest("Invalid key")
      }

      await env.MEDIA.put(key, file.stream(), {
        httpMetadata: {
          contentType: file.type,
          cacheControl: "public, max-age=31536000, immutable",
        },
      })

      const base = env.R2_PUBLIC_URL.replace(/\/$/, "")
      return Response.json(
        { url: `${base}/${key}`, key },
        { headers: corsHeaders() },
      )
    }

    if (request.method === "DELETE" && url.pathname === "/upload") {
      const key = url.searchParams.get("key")?.trim() ?? ""
      if (!key || !KEY_RE.test(key) || key.includes("..")) {
        return badRequest("Valid key is required")
      }
      await env.MEDIA.delete(key)
      return Response.json({ ok: true }, { headers: corsHeaders() })
    }

    return Response.json({ error: "Not found" }, { status: 404 })
  },
}
