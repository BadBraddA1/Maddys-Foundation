"use client"

import Link from "next/link"
import { useId, useRef, useState } from "react"
import { normalizeUsPhone } from "@/lib/phone"

type Props = {
  eventSlug: string
  eventTitle: string
  feeLabel: string | null
  paypalLink: string | null
  /** When > 1, collect a full team and require payment before confirmation. */
  teamSize: number | null
  requirePayment: boolean
}

type NameParts = { firstName: string; lastName: string }

const PART_MAX = 60
const PHONE_MAX = 40
const NOTES_MAX = 2000
const TEAM_NAME_MAX = 80

function emptyParts(): NameParts {
  return { firstName: "", lastName: "" }
}

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
  const [captain, setCaptain] = useState<NameParts>(emptyParts)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [teamName, setTeamName] = useState("")
  const [players, setPlayers] = useState<NameParts[]>(() =>
    Array.from({ length: Math.max(0, playersNeeded - 1) }, emptyParts),
  )
  const [guests, setGuests] = useState(1)
  const [mulligans, setMulligans] = useState(false)
  const [skins, setSkins] = useState(false)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)
  const [awaitingPayment, setAwaitingPayment] = useState(false)

  function setPlayer(index: number, patch: Partial<NameParts>) {
    setPlayers((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  function validateNameParts(
    parts: NameParts,
    prefix: string,
    label: string,
    next: Record<string, string>,
  ) {
    if (!parts.firstName.trim()) next[`${prefix}First`] = `Enter ${label} first name.`
    if (!parts.lastName.trim()) next[`${prefix}Last`] = `Enter ${label} last name.`
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    const trimmedEmail = email.trim()

    if (isTeam) {
      if (!teamName.trim()) next.teamName = "Enter a team name."
    }

    validateNameParts(
      captain,
      "captain",
      isTeam ? "the captain’s" : "your",
      next,
    )

    if (!trimmedEmail) {
      next.email = isTeam ? "Enter the captain’s email." : "Enter your email."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = "Enter a valid email address."
    }

    if (phone.trim()) {
      const normalized = normalizeUsPhone(phone)
      if (normalized === null) {
        next.phone = "Enter a 10-digit US phone, like (636) 208-0974."
      }
    }

    if (isTeam) {
      players.forEach((p, i) => {
        validateNameParts(p, `player${i + 2}`, `player ${i + 2}’s`, next)
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
      const normalizedPhone = phone.trim()
        ? normalizeUsPhone(phone) ?? phone.trim()
        : ""
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          eventSlug,
          firstName: captain.firstName.trim(),
          lastName: captain.lastName.trim(),
          email: email.trim(),
          phone: normalizedPhone,
          guests: isTeam ? playersNeeded : guests,
          teamName: isTeam ? teamName.trim() : undefined,
          teammates: isTeam
            ? players.map((p) => ({
                firstName: p.firstName.trim(),
                lastName: p.lastName.trim(),
              }))
            : undefined,
          mulligans: isTeam ? mulligans : undefined,
          skins: isTeam ? skins : undefined,
          notes: notes.trim(),
        }),
      })

      let data: {
        error?: string
        status?: string
        checkoutUrl?: string | null
        stripe?: boolean
      } = {}
      try {
        data = (await res.json()) as typeof data
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

      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl)
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
    const first = captain.firstName.trim() || "friend"

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

  function namePairFields(
    prefix: string,
    parts: NameParts,
    onChange: (patch: Partial<NameParts>) => void,
    opts: { firstLabel: string; lastLabel: string; autoComplete?: boolean },
  ) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${formId}-${prefix}-first`}
            className="block text-sm font-medium text-ink"
          >
            {opts.firstLabel}
          </label>
          <input
            id={`${formId}-${prefix}-first`}
            name={`${prefix}FirstName`}
            required
            autoComplete={opts.autoComplete ? "given-name" : "off"}
            maxLength={PART_MAX}
            value={parts.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            aria-invalid={Boolean(fieldErrors[`${prefix}First`])}
            aria-describedby={
              fieldErrors[`${prefix}First`]
                ? `${formId}-${prefix}-first-err`
                : undefined
            }
            className={input}
          />
          {fieldErrors[`${prefix}First`] ? (
            <p
              id={`${formId}-${prefix}-first-err`}
              className="mt-1.5 text-sm text-danger"
              role="alert"
            >
              {fieldErrors[`${prefix}First`]}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor={`${formId}-${prefix}-last`}
            className="block text-sm font-medium text-ink"
          >
            {opts.lastLabel}
          </label>
          <input
            id={`${formId}-${prefix}-last`}
            name={`${prefix}LastName`}
            required
            autoComplete={opts.autoComplete ? "family-name" : "off"}
            maxLength={PART_MAX}
            value={parts.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            aria-invalid={Boolean(fieldErrors[`${prefix}Last`])}
            aria-describedby={
              fieldErrors[`${prefix}Last`]
                ? `${formId}-${prefix}-last-err`
                : undefined
            }
            className={input}
          />
          {fieldErrors[`${prefix}Last`] ? (
            <p
              id={`${formId}-${prefix}-last-err`}
              className="mt-1.5 text-sm text-danger"
              role="alert"
            >
              {fieldErrors[`${prefix}Last`]}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

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
            Team name
          </label>
          <input
            id={`${formId}-team`}
            name="teamName"
            required
            maxLength={TEAM_NAME_MAX}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.teamName)}
            aria-describedby={
              fieldErrors.teamName ? `${formId}-team-err` : undefined
            }
            className={input}
          />
          {fieldErrors.teamName ? (
            <p id={`${formId}-team-err`} className="mt-1.5 text-sm text-danger" role="alert">
              {fieldErrors.teamName}
            </p>
          ) : null}
        </div>
      ) : null}

      {isTeam ? (
        <p className="text-sm font-medium text-ink">Captain</p>
      ) : null}

      {namePairFields(
        "captain",
        captain,
        (patch) => setCaptain((prev) => ({ ...prev, ...patch })),
        {
          firstLabel: isTeam ? "Captain’s first name" : "First name",
          lastLabel: isTeam ? "Captain’s last name" : "Last name",
          autoComplete: true,
        },
      )}

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
          inputMode="numeric"
          maxLength={PHONE_MAX}
          placeholder="(555) 555-5555"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => {
            const normalized = normalizeUsPhone(phone)
            if (normalized) setPhone(normalized)
          }}
          aria-invalid={Boolean(fieldErrors.phone)}
          aria-describedby={
            fieldErrors.phone ? `${formId}-phone-err` : undefined
          }
          className={input}
        />
        {fieldErrors.phone ? (
          <p id={`${formId}-phone-err`} className="mt-1.5 text-sm text-danger" role="alert">
            {fieldErrors.phone}
          </p>
        ) : null}
      </div>

      {isTeam
        ? players.map((player, i) => (
            <div key={`player-${i + 2}`} className="space-y-4 border-t border-line pt-5">
              <p className="text-sm font-medium text-ink">Player {i + 2}</p>
              {namePairFields(
                `player${i + 2}`,
                player,
                (patch) => setPlayer(i, patch),
                {
                  firstLabel: "First name",
                  lastLabel: "Last name",
                },
              )}
            </div>
          ))
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

      {isTeam ? (
        <fieldset className="space-y-3 border-t border-line pt-5">
          <legend className="text-sm font-medium text-ink">
            Team add-ons
          </legend>
          <p className="text-sm text-muted">
            Applies to the whole team.
          </p>
          <label
            htmlFor={`${formId}-mulligans`}
            className="flex min-h-11 items-center gap-3 text-sm text-ink"
          >
            <input
              id={`${formId}-mulligans`}
              name="mulligans"
              type="checkbox"
              checked={mulligans}
              onChange={(e) => setMulligans(e.target.checked)}
              className="size-4 shrink-0 accent-[var(--accent)]"
            />
            Mulligans
          </label>
          <label
            htmlFor={`${formId}-skins`}
            className="flex min-h-11 items-center gap-3 text-sm text-ink"
          >
            <input
              id={`${formId}-skins`}
              name="skins"
              type="checkbox"
              checked={skins}
              onChange={(e) => setSkins(e.target.checked)}
              className="size-4 shrink-0 accent-[var(--accent)]"
            />
            Skins
          </label>
        </fieldset>
      ) : null}

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
          placeholder={isTeam ? "Dietary needs, etc." : undefined}
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
