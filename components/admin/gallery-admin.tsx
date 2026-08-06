"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import type { GalleryImage, GalleryTag } from "@/lib/gallery"

type Props = {
  initialImages: GalleryImage[]
  initialTags: GalleryTag[]
  r2Ready: boolean
}

const UPLOAD_CONCURRENCY = 2
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/svg+xml"

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]!, i)
    }
  }
  const n = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

function TagChecklist({
  tags,
  selected,
  onChange,
  disabled,
  idPrefix,
}: {
  tags: GalleryTag[]
  selected: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
  idPrefix: string
}) {
  if (tags.length === 0) {
    return (
      <p className="mt-1.5 text-sm text-muted">
        No tags yet — create one above.
      </p>
    )
  }
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {tags.map((tag) => {
        const checked = selected.includes(tag.id)
        return (
          <li key={tag.id}>
            <label
              htmlFor={`${idPrefix}-${tag.id}`}
              className={`inline-flex min-h-11 cursor-pointer items-center px-3 text-sm ${
                checked ? "btn-deep" : "btn-surface"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <input
                id={`${idPrefix}-${tag.id}`}
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  onChange(
                    checked
                      ? selected.filter((id) => id !== tag.id)
                      : [...selected, tag.id],
                  )
                }}
              />
              {tag.name}
            </label>
          </li>
        )
      })}
    </ul>
  )
}

export function GalleryAdmin({ initialImages, initialTags, r2Ready }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState(initialImages)
  const [tags, setTags] = useState(initialTags)
  const [title, setTitle] = useState("")
  const [caption, setCaption] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState<{
    done: number
    total: number
  } | null>(null)
  const [failures, setFailures] = useState<string[]>([])

  async function refresh() {
    const res = await fetch("/api/admin/gallery")
    const data = (await res.json()) as {
      images?: GalleryImage[]
      tags?: GalleryTag[]
    }
    if (data.images) setImages(data.images)
    if (data.tags) setTags(data.tags)
    router.refresh()
  }

  async function onCreateTag(e: React.FormEvent) {
    e.preventDefault()
    if (!newTagName.trim() || busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const form = new FormData()
      form.set("name", newTagName.trim())
      const res = await fetch("/api/admin/gallery/tags", {
        method: "POST",
        body: form,
      })
      const data = (await res.json()) as { tag?: GalleryTag; error?: string }
      if (!res.ok || !data.tag) {
        setError(data.error || "Could not create tag.")
        return
      }
      setTags((prev) =>
        [...prev, data.tag!].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        ),
      )
      setSelectedTagIds((prev) => [...prev, data.tag!.id])
      setNewTagName("")
      setMessage(`Tag “${data.tag.name}” created.`)
    } catch {
      setError("Could not create tag.")
    } finally {
      setBusy(false)
    }
  }

  async function onDeleteTag(tag: GalleryTag) {
    if (
      !window.confirm(
        `Delete tag “${tag.name}”? It will be removed from all photos.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/gallery/tags?id=${tag.id}`, {
        method: "DELETE",
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not delete tag.")
        return
      }
      setTags((prev) => prev.filter((t) => t.id !== tag.id))
      setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id))
      setMessage(`Tag “${tag.name}” deleted.`)
      await refresh()
    } catch {
      setError("Could not delete tag.")
    } finally {
      setBusy(false)
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (files.length === 0 || busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    setFailures([])
    setProgress({ done: 0, total: files.length })

    const batchCaption = caption
    const batchTagIds = selectedTagIds
    const singleTitle = title.trim()
    const total = files.length
    let ok = 0
    const failed: string[] = []

    try {
      await mapPool(files, UPLOAD_CONCURRENCY, async (file) => {
        const form = new FormData()
        // Public gallery does not show titles; only set when staff typed one for a single file.
        const fileTitle = total === 1 ? singleTitle : ""
        form.set("title", fileTitle)
        form.set("caption", batchCaption)
        for (const id of batchTagIds) form.append("tagIds", String(id))
        form.set("image", file)
        try {
          const res = await fetch("/api/admin/gallery", {
            method: "POST",
            body: form,
          })
          const data = (await res.json()) as { error?: string }
          if (!res.ok) {
            failed.push(`${file.name}: ${data.error || "upload failed"}`)
          } else {
            ok += 1
          }
        } catch {
          failed.push(`${file.name}: network error`)
        } finally {
          setProgress((p) =>
            p ? { done: Math.min(p.done + 1, p.total), total: p.total } : p,
          )
        }
      })

      setFailures(failed)
      setTitle("")
      setCaption("")
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ""

      if (ok === 0) {
        setError(
          failed.length
            ? `None of ${total} photos uploaded.`
            : "Could not add images.",
        )
      } else if (failed.length) {
        setMessage(`Uploaded ${ok} of ${total}. ${failed.length} failed.`)
      } else {
        setMessage(ok === 1 ? "Image added." : `Uploaded ${ok} photos.`)
      }
      await refresh()
    } catch {
      setError("Could not add images.")
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  async function saveImageTags(image: GalleryImage, nextIds: number[]) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("id", String(image.id))
      for (const id of nextIds) form.append("tagIds", String(id))
      if (nextIds.length === 0) form.set("tagIds", "")
      const res = await fetch("/api/admin/gallery", { method: "PATCH", body: form })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not update tags.")
        return
      }
      setMessage("Tags saved.")
      await refresh()
    } catch {
      setError("Could not update tags.")
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
      {failures.length > 0 ? (
        <ul
          className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger space-y-1"
          role="alert"
        >
          {failures.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : null}

      <section className="border border-line bg-surface p-5 space-y-4">
        <h2 className="font-display text-xl">Tags</h2>
        <p className="text-sm text-muted">
          Freeform labels for the public gallery filters — not tied to events.
          Examples: Golf outing, Volunteers, Community night.
        </p>
        <form onSubmit={(e) => void onCreateTag(e)} className="flex flex-wrap gap-2">
          <label htmlFor="new-tag" className="sr-only">
            New tag name
          </label>
          <input
            id="new-tag"
            className="field-control min-h-11 min-w-[12rem] flex-1"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            maxLength={80}
            placeholder="New tag name"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !newTagName.trim()}
            className="btn-deep inline-flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-60"
          >
            Create tag
          </button>
        </form>
        {tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-sm"
              >
                <span>{tag.name}</span>
                <button
                  type="button"
                  disabled={busy}
                  className="text-danger underline-offset-2 hover:underline disabled:opacity-40"
                  onClick={() => void onDeleteTag(tag)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No tags yet.</p>
        )}
      </section>

      <form onSubmit={(e) => void onCreate(e)} className="border border-line bg-surface p-5 space-y-4">
        <h2 className="font-display text-xl">Add photos</h2>
        <p className="text-sm text-muted">
          Select one or many images. Shared tags and caption apply to the whole
          batch. Titles are optional (not shown on the public gallery).
        </p>
        {files.length <= 1 ? (
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
              disabled={busy}
            />
          </div>
        ) : null}
        <div>
          <label htmlFor="gallery-caption" className="block text-sm font-medium">
            Caption (optional, shared)
          </label>
          <textarea
            id="gallery-caption"
            className="field-control mt-1.5 min-h-24 w-full"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={500}
            disabled={busy}
          />
        </div>
        <div>
          <span className="block text-sm font-medium">Tags (optional, shared)</span>
          <TagChecklist
            idPrefix="upload-tag"
            tags={tags}
            selected={selectedTagIds}
            onChange={setSelectedTagIds}
            disabled={busy}
          />
        </div>
        <div>
          <label htmlFor="gallery-image" className="block text-sm font-medium">
            Photos
          </label>
          <input
            id="gallery-image"
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="mt-1.5 block w-full text-sm"
            required
            disabled={busy}
            onChange={(e) =>
              setFiles(e.target.files ? Array.from(e.target.files) : [])
            }
          />
          {files.length > 0 ? (
            <p className="mt-1.5 text-xs text-muted">
              {files.length} file{files.length === 1 ? "" : "s"} selected
            </p>
          ) : null}
        </div>
        {progress ? (
          <p className="text-sm text-muted" role="status" aria-live="polite">
            Uploading {progress.done} / {progress.total}…
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !r2Ready || files.length === 0}
          className="btn-deep inline-flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-60"
        >
          {busy
            ? progress
              ? `Uploading ${progress.done}/${progress.total}…`
              : "Saving…"
            : files.length > 1
              ? `Add ${files.length} to gallery`
              : "Add to gallery"}
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
                <div className="mt-3">
                  <span className="block text-sm font-medium text-ink">Tags</span>
                  <TagChecklist
                    idPrefix={`img-${img.id}-tag`}
                    tags={tags}
                    selected={(img.tags ?? []).map((t) => t.id)}
                    disabled={busy}
                    onChange={(ids) => void saveImageTags(img, ids)}
                  />
                </div>
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
