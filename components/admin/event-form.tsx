"use client"

import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import type { EventRow } from "@/lib/event-helpers"

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
  const formId = useId()
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
  const [teamSize, setTeamSize] = useState(
    event?.team_size != null ? String(event.team_size) : "",
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const fee_cents = feeDollars
      ? Math.round(parseFloat(feeDollars) * 100)
      : 0
    const team_size = teamSize ? Number(teamSize) : null

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
      team_size:
        team_size != null && Number.isFinite(team_size) && team_size > 1
          ? team_size
          : null,
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

  const field = "field-control"

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
      <div>
        <label htmlFor={`${formId}-title`} className="block text-sm font-medium text-ink">
          Title
        </label>
        <input
          id={`${formId}-title`}
          name="title"
          className={field}
          required
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor={`${formId}-slug`} className="block text-sm font-medium text-ink">
          Slug <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id={`${formId}-slug`}
          name="slug"
          className={field}
          maxLength={80}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          aria-describedby={`${formId}-slug-hint`}
        />
        <p id={`${formId}-slug-hint`} className="mt-1.5 text-sm text-muted">
          Leave blank to auto-generate from the title.
        </p>
      </div>
      <div>
        <label htmlFor={`${formId}-summary`} className="block text-sm font-medium text-ink">
          Summary
        </label>
        <input
          id={`${formId}-summary`}
          name="summary"
          className={field}
          maxLength={280}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div>
        <label
          htmlFor={`${formId}-description`}
          className="block text-sm font-medium text-ink"
        >
          Description
        </label>
        <textarea
          id={`${formId}-description`}
          name="description"
          className={field}
          rows={6}
          maxLength={10000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor={`${formId}-location`} className="block text-sm font-medium text-ink">
          Location
        </label>
        <input
          id={`${formId}-location`}
          name="location"
          className={field}
          maxLength={200}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-starts`} className="block text-sm font-medium text-ink">
            Starts
          </label>
          <input
            id={`${formId}-starts`}
            name="starts_at"
            type="datetime-local"
            className={field}
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-ends`} className="block text-sm font-medium text-ink">
            Ends
          </label>
          <input
            id={`${formId}-ends`}
            name="ends_at"
            type="datetime-local"
            className={field}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-capacity`} className="block text-sm font-medium text-ink">
            Capacity
          </label>
          <input
            id={`${formId}-capacity`}
            name="capacity"
            type="number"
            min={1}
            className={field}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            aria-describedby={`${formId}-capacity-hint`}
          />
          <p id={`${formId}-capacity-hint`} className="mt-1.5 text-sm text-muted">
            {Number(teamSize) > 1
              ? "Max teams (one registration = one team). e.g. 31 for a scramble."
              : "Max registrants. With team size set, this becomes max teams."}{" "}
            Leave blank for unlimited.
          </p>
        </div>
        <div>
          <label htmlFor={`${formId}-fee`} className="block text-sm font-medium text-ink">
            Fee (USD)
          </label>
          <input
            id={`${formId}-fee`}
            name="fee"
            type="number"
            min={0}
            step="0.01"
            className={field}
            value={feeDollars}
            onChange={(e) => setFeeDollars(e.target.value)}
            aria-describedby={`${formId}-fee-hint`}
          />
          <p id={`${formId}-fee-hint`} className="mt-1.5 text-sm text-muted">
            Use 0 or blank for free events. With a fee, the roster only shows teams after Stripe payment.
          </p>
        </div>
        <div>
          <label htmlFor={`${formId}-team`} className="block text-sm font-medium text-ink">
            Team size
          </label>
          <input
            id={`${formId}-team`}
            name="team_size"
            type="number"
            min={2}
            max={20}
            className={field}
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            aria-describedby={`${formId}-team-hint`}
          />
          <p id={`${formId}-team-hint`} className="mt-1.5 text-sm text-muted">
            e.g. 4 for a scramble. Blank = individual registration.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-open`} className="block text-sm font-medium text-ink">
            Reg opens
          </label>
          <input
            id={`${formId}-open`}
            name="open_at"
            type="datetime-local"
            className={field}
            value={openAt}
            onChange={(e) => setOpenAt(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-close`} className="block text-sm font-medium text-ink">
            Reg closes
          </label>
          <input
            id={`${formId}-close`}
            name="close_at"
            type="datetime-local"
            className={field}
            value={closeAt}
            onChange={(e) => setCloseAt(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label htmlFor={`${formId}-published`} className="flex min-h-11 items-center gap-2">
          <input
            id={`${formId}-published`}
            name="is_published"
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Published
        </label>
        <label htmlFor={`${formId}-reg-open`} className="flex min-h-11 items-center gap-2">
          <input
            id={`${formId}-reg-open`}
            name="registration_open"
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
        aria-busy={pending}
        className="btn-deep inline-flex min-h-11 items-center px-6 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : event ? "Update event" : "Create event"}
      </button>
    </form>
  )
}
