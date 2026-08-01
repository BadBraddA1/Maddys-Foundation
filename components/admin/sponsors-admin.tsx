"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Sponsor } from "@/lib/sponsors"

type Props = {
  initialSponsors: Sponsor[]
  r2Ready: boolean
}

export function SponsorsAdmin({ initialSponsors, r2Ready }: Props) {
  const router = useRouter()
  const [sponsors, setSponsors] = useState(initialSponsors)
  const [name, setName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function refresh() {
    const res = await fetch("/api/admin/sponsors")
    const data = (await res.json()) as { sponsors?: Sponsor[] }
    if (data.sponsors) setSponsors(data.sponsors)
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
      form.set("name", name)
      form.set("websiteUrl", websiteUrl)
      form.set("logo", file)
      const res = await fetch("/api/admin/sponsors", { method: "POST", body: form })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not add sponsor.")
        return
      }
      setName("")
      setWebsiteUrl("")
      setFile(null)
      setMessage("Sponsor added.")
      await refresh()
    } catch {
      setError("Could not add sponsor.")
    } finally {
      setBusy(false)
    }
  }

  async function togglePublished(sponsor: Sponsor) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("id", String(sponsor.id))
      form.set("isPublished", sponsor.is_published ? "0" : "1")
      const res = await fetch("/api/admin/sponsors", { method: "PATCH", body: form })
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

  async function move(sponsor: Sponsor, direction: -1 | 1) {
    const idx = sponsors.findIndex((s) => s.id === sponsor.id)
    const swap = sponsors[idx + direction]
    if (!swap) return
    setBusy(true)
    try {
      const a = new FormData()
      a.set("id", String(sponsor.id))
      a.set("sortOrder", String(swap.sort_order))
      const b = new FormData()
      b.set("id", String(swap.id))
      b.set("sortOrder", String(sponsor.sort_order))
      await Promise.all([
        fetch("/api/admin/sponsors", { method: "PATCH", body: a }),
        fetch("/api/admin/sponsors", { method: "PATCH", body: b }),
      ])
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(sponsor: Sponsor) {
    if (!window.confirm(`Remove ${sponsor.name}?`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/sponsors?id=${sponsor.id}`, {
        method: "DELETE",
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not delete.")
        return
      }
      setMessage("Sponsor removed.")
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
        <h2 className="font-display text-xl">Add sponsor</h2>
        <div>
          <label htmlFor="sponsor-name" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="sponsor-name"
            className="field-control mt-1.5 min-h-11 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div>
          <label htmlFor="sponsor-url" className="block text-sm font-medium">
            Website (optional)
          </label>
          <input
            id="sponsor-url"
            type="url"
            className="field-control mt-1.5 min-h-11 w-full"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
        <div>
          <label htmlFor="sponsor-logo" className="block text-sm font-medium">
            Logo
          </label>
          <input
            id="sponsor-logo"
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
          {busy ? "Saving…" : "Add sponsor"}
        </button>
      </form>

      <div>
        <h2 className="font-display text-xl">Sponsors</h2>
        {sponsors.length === 0 ? (
          <p className="mt-4 text-muted">No sponsors yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line">
            {sponsors.map((s, i) => (
              <li
                key={s.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.logo_url}
                    alt=""
                    className="h-12 w-24 object-contain bg-bg"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{s.name}</p>
                    <p className="text-sm text-muted">
                      {s.is_published ? "Published" : "Hidden"}
                      {s.website_url ? ` · ${s.website_url}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    disabled={busy || i === 0}
                    className="inline-flex min-h-11 items-center border border-line px-3 disabled:opacity-40"
                    onClick={() => void move(s, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={busy || i === sponsors.length - 1}
                    className="inline-flex min-h-11 items-center border border-line px-3 disabled:opacity-40"
                    onClick={() => void move(s, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex min-h-11 items-center border border-line px-3"
                    onClick={() => void togglePublished(s)}
                  >
                    {s.is_published ? "Hide" : "Publish"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex min-h-11 items-center border border-danger/40 px-3 text-danger"
                    onClick={() => void onDelete(s)}
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
