"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Sponsor } from "@/lib/sponsors"

type Props = {
  initialSponsors: Sponsor[]
  r2Ready: boolean
}

const emptyForm = {
  name: "",
  websiteUrl: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactNotes: "",
}

export function SponsorsAdmin({ initialSponsors, r2Ready }: Props) {
  const router = useRouter()
  const [sponsors, setSponsors] = useState(initialSponsors)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState(emptyForm)
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
      const body = new FormData()
      body.set("name", form.name)
      body.set("websiteUrl", form.websiteUrl)
      body.set("contactName", form.contactName)
      body.set("contactEmail", form.contactEmail)
      body.set("contactPhone", form.contactPhone)
      body.set("contactNotes", form.contactNotes)
      body.set("logo", file)
      const res = await fetch("/api/admin/sponsors", { method: "POST", body })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not add sponsor.")
        return
      }
      setForm(emptyForm)
      setFile(null)
      setMessage("Sponsor added.")
      await refresh()
    } catch {
      setError("Could not add sponsor.")
    } finally {
      setBusy(false)
    }
  }

  function startEdit(sponsor: Sponsor) {
    setEditingId(sponsor.id)
    setEditDraft({
      name: sponsor.name,
      websiteUrl: sponsor.website_url,
      contactName: sponsor.contact_name,
      contactEmail: sponsor.contact_email,
      contactPhone: sponsor.contact_phone,
      contactNotes: sponsor.contact_notes,
    })
    setError(null)
    setMessage(null)
  }

  async function saveEdit(sponsorId: number) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.set("id", String(sponsorId))
      body.set("name", editDraft.name)
      body.set("websiteUrl", editDraft.websiteUrl)
      body.set("contactName", editDraft.contactName)
      body.set("contactEmail", editDraft.contactEmail)
      body.set("contactPhone", editDraft.contactPhone)
      body.set("contactNotes", editDraft.contactNotes)
      const res = await fetch("/api/admin/sponsors", { method: "PATCH", body })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not save contacts.")
        return
      }
      setEditingId(null)
      setMessage("Sponsor contacts saved.")
      await refresh()
    } catch {
      setError("Could not save contacts.")
    } finally {
      setBusy(false)
    }
  }

  async function togglePublished(sponsor: Sponsor) {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.set("id", String(sponsor.id))
      body.set("isPublished", sponsor.is_published ? "0" : "1")
      const res = await fetch("/api/admin/sponsors", { method: "PATCH", body })
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
        <p className="text-sm text-muted">
          Logo shows in the footer. Contact details stay staff-only for outreach
          later.
        </p>
        <div>
          <label htmlFor="sponsor-name" className="block text-sm font-medium">
            Organization name
          </label>
          <input
            id="sponsor-name"
            className="field-control mt-1.5 min-h-11 w-full"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
            value={form.websiteUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, websiteUrl: e.target.value }))
            }
            placeholder="https://"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sponsor-contact" className="block text-sm font-medium">
              Point of contact
            </label>
            <input
              id="sponsor-contact"
              className="field-control mt-1.5 min-h-11 w-full"
              value={form.contactName}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactName: e.target.value }))
              }
              maxLength={120}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="sponsor-email" className="block text-sm font-medium">
              Contact email
            </label>
            <input
              id="sponsor-email"
              type="email"
              className="field-control mt-1.5 min-h-11 w-full"
              value={form.contactEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactEmail: e.target.value }))
              }
              maxLength={200}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="sponsor-phone" className="block text-sm font-medium">
              Contact phone (optional)
            </label>
            <input
              id="sponsor-phone"
              type="tel"
              className="field-control mt-1.5 min-h-11 w-full"
              value={form.contactPhone}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactPhone: e.target.value }))
              }
              maxLength={40}
              autoComplete="tel"
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
        </div>
        <div>
          <label htmlFor="sponsor-notes" className="block text-sm font-medium">
            Staff notes (optional)
          </label>
          <textarea
            id="sponsor-notes"
            className="field-control mt-1.5 min-h-24 w-full"
            value={form.contactNotes}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactNotes: e.target.value }))
            }
            maxLength={1000}
            placeholder="Package level, last event, follow-up reminders…"
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
              <li key={s.id} className="space-y-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.logo_url}
                      alt=""
                      className="h-12 w-24 shrink-0 object-contain bg-bg"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{s.name}</p>
                      <p className="text-sm text-muted">
                        {s.is_published ? "Published" : "Hidden"}
                        {s.website_url ? ` · ${s.website_url}` : ""}
                      </p>
                      {editingId !== s.id ? (
                        <p className="mt-2 text-sm text-muted">
                          {s.contact_name || s.contact_email ? (
                            <>
                              {s.contact_name || "Contact"}
                              {s.contact_email ? (
                                <>
                                  {" · "}
                                  <a
                                    href={`mailto:${s.contact_email}`}
                                    className="text-accent-ink underline underline-offset-4"
                                  >
                                    {s.contact_email}
                                  </a>
                                </>
                              ) : null}
                              {s.contact_phone ? ` · ${s.contact_phone}` : ""}
                            </>
                          ) : (
                            "No contact on file"
                          )}
                        </p>
                      ) : null}
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
                      onClick={() =>
                        editingId === s.id
                          ? setEditingId(null)
                          : startEdit(s)
                      }
                    >
                      {editingId === s.id ? "Cancel" : "Edit contact"}
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
                </div>

                {editingId === s.id ? (
                  <div className="grid gap-3 border border-line bg-bg p-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium">
                        Organization name
                      </label>
                      <input
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.name}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Point of contact
                      </label>
                      <input
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.contactName}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            contactName: e.target.value,
                          }))
                        }
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Contact email
                      </label>
                      <input
                        type="email"
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.contactEmail}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            contactEmail: e.target.value,
                          }))
                        }
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Contact phone
                      </label>
                      <input
                        type="tel"
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.contactPhone}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            contactPhone: e.target.value,
                          }))
                        }
                        maxLength={40}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Website
                      </label>
                      <input
                        type="url"
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.websiteUrl}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            websiteUrl: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium">
                        Staff notes
                      </label>
                      <textarea
                        className="field-control mt-1.5 min-h-24 w-full"
                        value={editDraft.contactNotes}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            contactNotes: e.target.value,
                          }))
                        }
                        maxLength={1000}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="btn-deep inline-flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-60"
                        onClick={() => void saveEdit(s.id)}
                      >
                        {busy ? "Saving…" : "Save contacts"}
                      </button>
                    </div>
                  </div>
                ) : s.contact_notes ? (
                  <p className="text-sm text-muted">{s.contact_notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
