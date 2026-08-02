"use client"

import { useRouter } from "next/navigation"
import { useId, useState } from "react"

export type RegistrationFormPlayer = {
  id?: number
  display_name: string
  email: string
  checked_in?: number
  check_in_code?: string | null
}

type Props = {
  eventId: number
  teamSize: number | null
  mode: "create" | "edit"
  registrationId?: number
  initial?: {
    name: string
    email: string
    phone: string
    team_name: string
    guests: number
    notes: string
    players: RegistrationFormPlayer[]
  }
}

export function RegistrationForm({
  eventId,
  teamSize,
  mode,
  registrationId,
  initial,
}: Props) {
  const formId = useId()
  const router = useRouter()
  const isTeam = Boolean(teamSize && teamSize > 1)
  const slotCount = isTeam ? teamSize! : 1

  const [name, setName] = useState(initial?.name ?? "")
  const [email, setEmail] = useState(initial?.email ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [teamName, setTeamName] = useState(initial?.team_name ?? "")
  const [guests, setGuests] = useState(
    initial?.guests != null ? String(initial.guests) : String(slotCount),
  )
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [players, setPlayers] = useState<RegistrationFormPlayer[]>(() => {
    if (initial?.players?.length) {
      const list = [...initial.players]
      while (isTeam && list.length < slotCount) {
        list.push({ display_name: "", email: "" })
      }
      return list
    }
    if (isTeam) {
      return Array.from({ length: slotCount }, (_, i) => ({
        display_name: i === 0 ? "" : "",
        email: "",
      }))
    }
    return [{ display_name: "", email: "" }]
  })
  const [sendConfirmation, setSendConfirmation] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function updatePlayer(
    index: number,
    patch: Partial<RegistrationFormPlayer>,
  ) {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    )
  }

  function addPlayerRow() {
    setPlayers((prev) => [...prev, { display_name: "", email: "" }])
  }

  function removePlayerRow(index: number) {
    setPlayers((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const playerPayload = isTeam
      ? players
          .map((p, i) => ({
            id: p.id,
            display_name:
              p.display_name.trim() || (i === 0 ? name.trim() : ""),
            email: p.email.trim(),
          }))
          .filter((p) => p.display_name)
      : [{ display_name: name.trim(), email: email.trim() }]

    if (playerPayload[0]) {
      playerPayload[0].display_name =
        playerPayload[0].display_name || name.trim()
      playerPayload[0].email = playerPayload[0].email || email.trim()
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      team_name: teamName.trim(),
      guests: Number(guests) || playerPayload.length || 1,
      notes: notes.trim(),
      players: playerPayload,
      send_confirmation: sendConfirmation,
      paid: true,
    }

    try {
      const url =
        mode === "create"
          ? `/api/admin/events/${eventId}/registrations`
          : `/api/admin/events/${eventId}/registrations/${registrationId}`
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Save failed.")
        return
      }
      router.push(`/admin/events/${eventId}/registrations`)
      router.refresh()
    } catch {
      setError("Network error. Try again.")
    } finally {
      setPending(false)
    }
  }

  async function onDelete() {
    if (!registrationId) return
    const ok = window.confirm(
      `Delete this registration for ${name || "this team"}? Players and check-in history for this entry will be removed.`,
    )
    if (!ok) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/registrations/${registrationId}`,
        { method: "DELETE" },
      )
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Delete failed.")
        return
      }
      router.push(`/admin/events/${eventId}/registrations`)
      router.refresh()
    } catch {
      setError("Network error. Try again.")
    } finally {
      setDeleting(false)
    }
  }

  const field = "field-control"

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor={`${formId}-name`} className="block text-sm font-medium">
          {isTeam ? "Captain name" : "Name"}
        </label>
        <input
          id={`${formId}-name`}
          className={field}
          required
          maxLength={120}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (isTeam) {
              updatePlayer(0, { display_name: e.target.value })
            }
          }}
        />
      </div>
      <div>
        <label htmlFor={`${formId}-email`} className="block text-sm font-medium">
          {isTeam ? "Captain email" : "Email"}
        </label>
        <input
          id={`${formId}-email`}
          type="email"
          className={field}
          required
          maxLength={200}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (isTeam) {
              updatePlayer(0, { email: e.target.value })
            }
          }}
        />
      </div>
      <div>
        <label htmlFor={`${formId}-phone`} className="block text-sm font-medium">
          Phone
        </label>
        <input
          id={`${formId}-phone`}
          type="tel"
          className={field}
          maxLength={40}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {isTeam ? (
        <div>
          <label
            htmlFor={`${formId}-team`}
            className="block text-sm font-medium"
          >
            Team name
          </label>
          <input
            id={`${formId}-team`}
            className={field}
            maxLength={120}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>
      ) : null}
      <div>
        <label
          htmlFor={`${formId}-guests`}
          className="block text-sm font-medium"
        >
          Guests / party size
        </label>
        <input
          id={`${formId}-guests`}
          type="number"
          min={1}
          max={20}
          className={field}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
        />
      </div>

      {isTeam ? (
        <fieldset className="space-y-4 border border-line px-4 py-4">
          <legend className="px-1 text-sm font-medium">Player roster</legend>
          <p className="text-sm text-muted">
            Edit names and emails for each player. Player 1 is the captain.
          </p>
          {players.map((p, i) => (
            <div
              key={p.id ?? `new-${i}`}
              className="grid gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_1fr_auto]"
            >
              <div>
                <label
                  htmlFor={`${formId}-p-name-${i}`}
                  className="block text-sm font-medium"
                >
                  Player {i + 1} name
                  {p.checked_in ? (
                    <span className="ml-2 font-normal text-muted">· checked in</span>
                  ) : null}
                </label>
                <input
                  id={`${formId}-p-name-${i}`}
                  className={field}
                  required={i === 0}
                  maxLength={120}
                  value={p.display_name}
                  onChange={(e) => {
                    updatePlayer(i, { display_name: e.target.value })
                    if (i === 0) setName(e.target.value)
                  }}
                />
                {p.check_in_code ? (
                  <p className="mt-1 font-mono text-xs text-muted">
                    {p.check_in_code}
                  </p>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor={`${formId}-p-email-${i}`}
                  className="block text-sm font-medium"
                >
                  Email
                </label>
                <input
                  id={`${formId}-p-email-${i}`}
                  type="email"
                  className={field}
                  maxLength={200}
                  value={p.email}
                  onChange={(e) => {
                    updatePlayer(i, { email: e.target.value })
                    if (i === 0) setEmail(e.target.value)
                  }}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center text-sm text-danger underline underline-offset-4 disabled:opacity-40"
                  disabled={players.length <= 1}
                  onClick={() => removePlayerRow(i)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
            onClick={addPlayerRow}
          >
            Add player
          </button>
        </fieldset>
      ) : null}

      <div>
        <label
          htmlFor={`${formId}-notes`}
          className="block text-sm font-medium"
        >
          Notes{" "}
          <span className="font-normal text-muted">(optional extras)</span>
        </label>
        <textarea
          id={`${formId}-notes`}
          className={field}
          rows={3}
          maxLength={4000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {mode === "create" ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sendConfirmation}
            onChange={(e) => setSendConfirmation(e.target.checked)}
          />
          Send confirmation email with ticket link
        </label>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending || deleting}
          aria-busy={pending}
          className="btn-deep inline-flex min-h-11 items-center px-6 text-sm font-medium disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Add to roster"
              : "Save changes"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            disabled={pending || deleting}
            aria-busy={deleting}
            onClick={() => void onDelete()}
            className="inline-flex min-h-11 items-center border border-danger px-5 text-sm font-medium text-danger disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete registration"}
          </button>
        ) : null}
      </div>
    </form>
  )
}
