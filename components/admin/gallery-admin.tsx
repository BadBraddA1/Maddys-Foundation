"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { GalleryImage } from "@/lib/gallery"

type EventOption = { id: number; title: string; slug: string }

type Props = {
  initialImages: GalleryImage[]
  events: EventOption[]
  r2Ready: boolean
}

export function GalleryAdmin({ initialImages, events, r2Ready }: Props) {
  const router = useRouter()
  const [images, setImages] = useState(initialImages)
  const [title, setTitle] = useState("")
  const [caption, setCaption] = useState("")
  const [eventId, setEventId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function refresh() {
    const res = await fetch("/api/admin/gallery")
    const data = (await res.json()) as { images?: GalleryImage[] }
    if (data.images) setImages(data.images)
    router.refresh()
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!file || busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const form = new FormData()
      form.set("title", title)
      form.set("caption", caption)
      form.set("eventId", eventId || "none")
      form.set("image", file)
      const res = await fetch("/api/admin/gallery", { method: "POST", body: form })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not add image.")
        return
      }
      setTitle("")
      setCaption("")
      setEventId("")
      setFile(null)
      setMessage("Image added.")
      await refresh()
    } catch {
      setError("Could not add image.")
    } finally {
      setBusy(false)
    }
  }

  async function togglePublished(image: GalleryImage) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("id", String(image.id))
      form.set("isPublished", image.is_published ? "0" : "1")
      const res = await fetch("/api/admin/gallery", { method: "PATCH", body: form })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not update.")
        return
      }
      await refresh()
    } catch {
      setError("Could not update.")
    } finally {
      setBusy(false)
    }
  }

  async function setImageEvent(image: GalleryImage, next: string) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("id", String(image.id))
      form.set("eventId", next || "none")
      const res = await fetch("/api/admin/gallery", { method: "PATCH", body: form })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not update event tag.")
        return
      }
      setMessage("Event tag saved.")
      await refresh()
    } catch {
      setError("Could not update event tag.")
    } finally {
      setBusy(false)
    }
  }

  async function move(image: GalleryImage, direction: -1 | 1) {
    const idx = images.findIndex((s) => s.id === image.id)
    const swap = images[idx + direction]
    if (!swap) return
    setBusy(true)
    try {
      const a = new FormData()
      a.set("id", String(image.id))
      a.set("sortOrder", String(swap.sort_order))
      const b = new FormData()
      b.set("id", String(swap.id))
      b.set("sortOrder", String(image.sort_order))
      await Promise.all([
        fetch("/api/admin/gallery", { method: "PATCH", body: a }),
        fetch("/api/admin/gallery", { method: "PATCH", body: b }),
      ])
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(image: GalleryImage) {
    if (!window.confirm(`Remove ${image.title || "this image"}?`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/gallery?id=${image.id}`, {
        method: "DELETE",
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not delete.")
        return
      }
      setMessage("Image removed.")
      await refresh()
    } catch {
      setError("Could not delete.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-10">
      {!r2Ready ? (
        <p className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          R2 is not configured. Set{" "}
          <code className="text-ink">R2_UPLOAD_WORKER_URL</code>,{" "}
          <code className="text-ink">R2_UPLOAD_SECRET</code>, and{" "}
          <code className="text-ink">R2_PUBLIC_URL</code>.
        </p>
      ) : null}
      {error ? (
        <p className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="border border-success/25 bg-success-soft px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <form onSubmit={(e) => void onCreate(e)} className="border border-line bg-surface p-5 space-y-4">
        <h2 className="font-display text-xl">Add photo</h2>
        <div>
          <label htmlFor="gallery-title" className="block text-sm font-medium">
            Title (optional)
          </label>
          <input
            id="gallery-title"
            className="field-control mt-1.5 min-h-11 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
          />
        </div>
        <div>
          <label htmlFor="gallery-caption" className="block text-sm font-medium">
            Caption (optional)
          </label>
          <textarea
            id="gallery-caption"
            className="field-control mt-1.5 min-h-24 w-full"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={500}
          />
        </div>
        <div>
          <label htmlFor="gallery-event" className="block text-sm font-medium">
            Event tag (optional)
          </label>
          <select
            id="gallery-event"
            className="field-control mt-1.5 min-h-11 w-full"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">No event</option>
            {events.map((ev) => (
              <option key={ev.id} value={String(ev.id)}>
                {ev.title}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Tagging links the photo to an event on the public gallery filters.
          </p>
        </div>
        <div>
          <label htmlFor="gallery-image" className="block text-sm font-medium">
            Photo
          </label>
          <input
            id="gallery-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="mt-1.5 block w-full text-sm"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !r2Ready}
          className="btn-deep inline-flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Saving…" : "Add to gallery"}
        </button>
      </form>

      <div>
        <h2 className="font-display text-xl">Gallery</h2>
        {images.length === 0 ? (
          <p className="mt-4 text-muted">No photos yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {images.map((img, i) => (
              <li key={img.id} className="border border-line bg-surface p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt={img.title || "Gallery photo"}
                  className="aspect-[4/3] w-full object-cover bg-bg"
                />
                <p className="mt-3 font-medium text-ink">
                  {img.title || "Untitled"}
                </p>
                <p className="text-sm text-muted">
                  {img.is_published ? "Published" : "Hidden"}
                  {img.caption ? ` · ${img.caption}` : ""}
                </p>
                <label className="mt-3 block text-sm">
                  <span className="font-medium text-ink">Event tag</span>
                  <select
                    className="field-control mt-1.5 min-h-11 w-full"
                    value={img.event_id != null ? String(img.event_id) : ""}
                    disabled={busy}
                    onChange={(e) => void setImageEvent(img, e.target.value)}
                  >
                    <option value="">No event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={String(ev.id)}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    disabled={busy || i === 0}
                    className="inline-flex min-h-11 items-center border border-line px-3 disabled:opacity-40"
                    onClick={() => void move(img, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={busy || i === images.length - 1}
                    className="inline-flex min-h-11 items-center border border-line px-3 disabled:opacity-40"
                    onClick={() => void move(img, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex min-h-11 items-center border border-line px-3"
                    onClick={() => void togglePublished(img)}
                  >
                    {img.is_published ? "Hide" : "Publish"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex min-h-11 items-center border border-danger/40 px-3 text-danger"
                    onClick={() => void onDelete(img)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
