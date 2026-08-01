/** Cloudflare R2 uploads via the maddys-foundation-media Worker. */

export const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024

export type MediaFolder = "sponsors" | "gallery"

export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_UPLOAD_WORKER_URL?.trim() &&
      process.env.R2_UPLOAD_SECRET?.trim() &&
      process.env.R2_PUBLIC_URL?.trim(),
  )
}

export function r2PublicUrlForKey(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "")
  if (!base) throw new Error("R2_PUBLIC_URL is not configured")
  return `${base}/${key.replace(/^\//, "")}`
}

export async function uploadMediaFile(opts: {
  file: File | Blob
  folder: MediaFolder
  filename?: string
  key?: string
}): Promise<{ url: string; key: string }> {
  const workerUrl = process.env.R2_UPLOAD_WORKER_URL?.replace(/\/$/, "")
  const secret = process.env.R2_UPLOAD_SECRET
  if (!workerUrl || !secret) {
    throw new Error("R2 upload worker is not configured")
  }

  const form = new FormData()
  form.append("file", opts.file, opts.filename ?? "upload")
  form.append("folder", opts.folder)
  if (opts.key) form.append("key", opts.key)

  const response = await fetch(`${workerUrl}/upload`, {
    method: "POST",
    headers: { "x-upload-secret": secret },
    body: form,
  })

  const data = (await response.json()) as {
    error?: string
    url?: string
    key?: string
  }
  if (!response.ok || !data.url || !data.key) {
    throw new Error(data.error ?? "Upload failed")
  }
  return { url: data.url, key: data.key }
}

export async function deleteMediaKey(key: string): Promise<void> {
  const workerUrl = process.env.R2_UPLOAD_WORKER_URL?.replace(/\/$/, "")
  const secret = process.env.R2_UPLOAD_SECRET
  if (!workerUrl || !secret) {
    throw new Error("R2 upload worker is not configured")
  }

  const response = await fetch(
    `${workerUrl}/upload?key=${encodeURIComponent(key)}`,
    {
      method: "DELETE",
      headers: { "x-upload-secret": secret },
    },
  )
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error ?? "Delete failed")
  }
}
