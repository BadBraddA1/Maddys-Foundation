"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { EventRow } from "@/lib/events"

type Props = {
  event?: EventRow
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventForm({ event }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(event?.title ?? "")
  const [slug, setSlug] = useState(event?.slug ?? "")
  const [summary, setSummary] = useState(event?.summary ?? "")
  const [description, setDescription] = useState(event?.description ?? "")
  const [location, setLocation] = useState(event?.location ?? "")
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at))
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at))
  const [capacity, setCapacity] = useState(
    event?.capacity != null ? String(event.capacity) : "",
  )
  const [isPublished, setIsPublished] = useState(Boolean(event?.is_published))
  const [registrationOpen, setRegistrationOpen] = useState(
    Boolean(event?.registration_open),
  )
  const [openAt, setOpenAt] = useState(toLocalInput(event?.open_at))
  const [closeAt, setCloseAt] = useState(toLocalInput(event?.close_at))
  const [feeDollars, setFeeDollars] = useState(
    event?.fee_cents ? String(event.fee_cents / 100) : "",
  )
  const [paypalLink, setPaypalLink] = useState(event?.paypal_link ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const fee_cents = feeDollars
      ? Math.round(parseFloat(feeDollars) * 100)
      : 0

    const payload = {
      title,
      slug: slug || undefined,
      summary,
      description,
      location,
      starts_at: startsAt ? new Date(startsAt).toISOString() : "",
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      capacity: capacity ? Number(capacity) : null,
      is_published: isPublished,
      registration_open: registrationOpen,
      open_at: openAt ? new Date(openAt).toISOString() : null,
      close_at: closeAt ? new Date(closeAt).toISOString() : null,
      fee_cents: Number.isFinite(fee_cents) ? fee_cents : 0,
      paypal_link: paypalLink || null,
    }

    try {
      const res = await fetch(
        event ? `/api/admin/events/${event.id}` : "/api/admin/events",
        {
          method: event ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        id?: number
      }
      if (!res.ok) {
        setError(data.error || "Save failed. Please try again.")
        return
      }
      router.push("/admin")
      router.refresh()
    } catch {
      setError("Network error. Check your connection and try again.")
    } finally {
      setPending(false)
    }
  }

  const field =
    "mt-1.5 w-full min-w-0 rounded-sm border border-line bg-surface px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-accent"

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-medium">Title</label>
        <input
          className={field}
          required
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">
          Slug <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          className={field}
          maxLength={80}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="auto-from-title"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Summary</label>
        <input
          className={field}
          maxLength={280}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          className={field}
          rows={6}
          maxLength={10000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Location</label>
        <input
          className={field}
          maxLength={200}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Starts</label>
          <input
            type="datetime-local"
            className={field}
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Ends</label>
          <input
            type="datetime-local"
            className={field}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Capacity</label>
          <input
            type="number"
            min={1}
            className={field}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Unlimited"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Fee (USD)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={field}
            value={feeDollars}
            onChange={(e) => setFeeDollars(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">PayPal.me link</label>
        <input
          className={field}
          value={paypalLink}
          onChange={(e) => setPaypalLink(e.target.value)}
          placeholder="https://paypal.me/..."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Reg opens</label>
          <input
            type="datetime-local"
            className={field}
            value={openAt}
            onChange={(e) => setOpenAt(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Reg closes</label>
          <input
            type="datetime-local"
            className={field}
            value={closeAt}
            onChange={(e) => setCloseAt(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Published
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={registrationOpen}
            onChange={(e) => setRegistrationOpen(e.target.checked)}
          />
          Registration open
        </label>
      </div>
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center bg-deep px-6 text-sm font-medium text-on-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : event ? "Update event" : "Create event"}
      </button>
    </form>
  )
}
