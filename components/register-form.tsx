"use client"

import { useId, useRef, useState } from "react"
import Link from "next/link"

type Props = {
  eventSlug: string
  eventTitle: string
  feeLabel: string | null
  paypalLink: string | null
  /** When > 1, collect a full team and require payment before confirmation. */
  teamSize: number | null
  requirePayment: boolean
}

const NAME_MAX = 120
const PHONE_MAX = 40
const NOTES_MAX = 2000
const TEAM_NAME_MAX = 80

export function RegisterForm({
  eventSlug,
  eventTitle,
  feeLabel,
  paypalLink,
  teamSize,
  requirePayment,
}: Props) {
  const isTeam = Boolean(teamSize && teamSize > 1)
  const playersNeeded = isTeam ? teamSize! : 1
  const formId = useId()
  const abortRef = useRef<AbortController | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [teamName, setTeamName] = useState("")
  const [playerNames, setPlayerNames] = useState<string[]>(() =>
    Array.from({ length: Math.max(0, playersNeeded - 1) }, () => ""),
  )
  const [guests, setGuests] = useState(1)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)
  const [awaitingPayment, setAwaitingPayment] = useState(false)

  function validate(): boolean {
    const next: Record<string, string> = {}
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) next.name = isTeam ? "Enter the team captain’s name." : "Enter your name."
    else if (trimmedName.length < 2) next.name = "Name looks too short."

    if (!trimmedEmail) next.email = "Enter your email."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = "Enter a valid email address."
    }

    if (isTeam) {
      playerNames.forEach((p, i) => {
        if (!p.trim() || p.trim().length < 2) {
          next[`player${i + 2}`] = `Enter player ${i + 2}’s full name.`
        }
      })
    } else if (guests < 1 || guests > 20) {
      next.guests = "Party size must be between 1 and 20."
    }

    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    if (pending) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 20_000)

    setPending(true)
    try {
      const teammateList = playerNames.map((p) => p.trim()).filter(Boolean)
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          eventSlug,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          guests: isTeam ? playersNeeded : guests,
          teamName: teamName.trim() || undefined,
          teammates: isTeam ? teammateList : undefined,
          notes: notes.trim(),
        }),
      })

      let data: { error?: string; status?: string } = {}
      try {
        data = (await res.json()) as { error?: string; status?: string }
      } catch {
        data = {}
      }

      if (!res.ok) {
        if (res.status === 409) {
          setError(
            data.error ||
              "That email is already registered for this event. Try a different email or contact the foundation.",
          )
        } else if (res.status === 404) {
          setError("This event is no longer available.")
        } else {
          setError(data.error || "Registration failed. Please try again.")
        }
        return
      }
      setAwaitingPayment(data.status === "pending" || requirePayment)
      setDone(true)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("That took too long. Check your connection and try again.")
      } else {
        setError("Network error. Check your connection and try again.")
      }
    } finally {
      window.clearTimeout(timeout)
      setPending(false)
    }
  }

  if (done) {
    const first = name.trim().split(/\s+/)[0] || "friend"

    if (awaitingPayment && feeLabel) {
      return (
        <div
          className="border border-line bg-surface px-6 py-8"
          role="status"
          aria-live="polite"
        >
          <h2 className="font-display text-2xl text-ink">One more step</h2>
          <p className="mt-3 break-words text-ink/75">
            Thanks, {first}. Your team details for{" "}
            <span className="font-medium text-ink">{eventTitle}</span> are saved,
            but registration isn&apos;t complete until we receive{" "}
            <strong className="text-ink">{feeLabel}</strong>.
          </p>
          {paypalLink ? (
            <a
              href={paypalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="motion-press mt-6 inline-flex min-h-11 w-full items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink sm:w-auto"
            >
              Pay {feeLabel} via PayPal
            </a>
          ) : (
            <p className="mt-6 text-sm text-muted">
              Online payment is being set up. We&apos;ll follow up by email with
              how to pay {feeLabel} and confirm your spot.
            </p>
          )}
          <p className="mt-4 text-sm text-muted">
            After you pay, staff will mark your team confirmed. Keep this email
            handy: {email.trim()}.
          </p>
          <Link
            href={`/events/${eventSlug}`}
            className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
          >
            Back to event
          </Link>
        </div>
      )
    }

    return (
      <div
        className="success-enter border border-success/25 bg-success-soft px-6 py-8"
        role="status"
        aria-live="polite"
      >
        <h2 className="font-display text-2xl text-ink">You&apos;re registered</h2>
        <p className="mt-3 break-words text-ink/75">
          Thanks, {first}. We&apos;ve saved your spot for{" "}
          <span className="font-medium text-ink">{eventTitle}</span>.
        </p>
        {feeLabel && paypalLink ? (
          <p className="mt-4 text-sm text-ink/75">
            Contribution: {feeLabel}.{" "}
            <a
              href={paypalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent-ink underline decoration-accent underline-offset-4"
            >
              Pay via PayPal
            </a>
          </p>
        ) : null}
        <Link
          href={`/events/${eventSlug}`}
          className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
        >
          Back to event
        </Link>
      </div>
    )
  }

  const input = "field-control"

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {isTeam ? (
        <p className="text-sm text-muted">
          Register a {playersNeeded}-person scramble team
          {feeLabel ? (
            <>
              {" "}
              · <strong className="text-ink">{feeLabel}</strong> due before
              registration is complete
            </>
          ) : null}
          .
        </p>
      ) : null}

      {isTeam ? (
        <div>
          <label htmlFor={`${formId}-team`} className="block text-sm font-medium text-ink">
            Team name <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${formId}-team`}
            name="teamName"
            maxLength={TEAM_NAME_MAX}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className={input}
          />
        </div>
      ) : null}

      <div>
        <label htmlFor={`${formId}-name`} className="block text-sm font-medium text-ink">
          {isTeam ? "Captain’s full name" : "Full name"}
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          required
          autoComplete="name"
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? `${formId}-name-err` : undefined}
          className={input}
        />
        {fieldErrors.name ? (
          <p id={`${formId}-name-err`} className="mt-1.5 text-sm text-danger" role="alert">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor={`${formId}-email`} className="block text-sm font-medium text-ink">
          {isTeam ? "Captain’s email" : "Email"}
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? `${formId}-email-err` : undefined}
          className={input}
        />
        {fieldErrors.email ? (
          <p id={`${formId}-email-err`} className="mt-1.5 text-sm text-danger" role="alert">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor={`${formId}-phone`} className="block text-sm font-medium text-ink">
          Phone <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id={`${formId}-phone`}
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={PHONE_MAX}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={input}
        />
      </div>

      {isTeam
        ? playerNames.map((player, i) => {
            const key = `player${i + 2}`
            return (
              <div key={key}>
                <label
                  htmlFor={`${formId}-${key}`}
                  className="block text-sm font-medium text-ink"
                >
                  Player {i + 2} full name
                </label>
                <input
                  id={`${formId}-${key}`}
                  name={key}
                  required
                  maxLength={NAME_MAX}
                  value={player}
                  onChange={(e) => {
                    const next = [...playerNames]
                    next[i] = e.target.value
                    setPlayerNames(next)
                  }}
                  aria-invalid={Boolean(fieldErrors[key])}
                  aria-describedby={
                    fieldErrors[key] ? `${formId}-${key}-err` : undefined
                  }
                  className={input}
                />
                {fieldErrors[key] ? (
                  <p
                    id={`${formId}-${key}-err`}
                    className="mt-1.5 text-sm text-danger"
                    role="alert"
                  >
                    {fieldErrors[key]}
                  </p>
                ) : null}
              </div>
            )
          })
        : (
          <div>
            <label htmlFor={`${formId}-guests`} className="block text-sm font-medium text-ink">
              Party size (including you)
            </label>
            <input
              id={`${formId}-guests`}
              name="guests"
              type="number"
              min={1}
              max={20}
              required
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value) || 1)}
              aria-invalid={Boolean(fieldErrors.guests)}
              aria-describedby={fieldErrors.guests ? `${formId}-guests-err` : undefined}
              className={input}
            />
            {fieldErrors.guests ? (
              <p id={`${formId}-guests-err`} className="mt-1.5 text-sm text-danger" role="alert">
                {fieldErrors.guests}
              </p>
            ) : null}
          </div>
        )}

      <div>
        <label htmlFor={`${formId}-notes`} className="block text-sm font-medium text-ink">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`${formId}-notes`}
          name="notes"
          rows={3}
          maxLength={NOTES_MAX}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={input}
          placeholder={isTeam ? "Dietary needs, mulligans interest, etc." : undefined}
        />
        <p className="mt-1 text-sm text-muted">
          {notes.length}/{NOTES_MAX}
        </p>
      </div>
      {feeLabel && !isTeam ? (
        <p className="text-sm text-muted">
          Suggested contribution: <strong className="text-ink">{feeLabel}</strong>
          {paypalLink
            ? " — you\u2019ll get a PayPal link after registering."
            : null}
        </p>
      ) : null}
      {error ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm font-medium text-danger">{error}</p>
          <button
            type="button"
            className="inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline underline-offset-4"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="motion-press inline-flex min-h-11 w-full items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending
          ? "Submitting…"
          : requirePayment
            ? "Continue to payment"
            : isTeam
              ? "Register team"
              : "Register"}
      </button>
    </form>
  )
}
