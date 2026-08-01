"use client"

import { useState } from "react"
import Link from "next/link"

type Props = {
  eventSlug: string
  eventTitle: string
  feeLabel: string | null
  paypalLink: string | null
}

export function RegisterForm({
  eventSlug,
  eventTitle,
  feeLabel,
  paypalLink,
}: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [guests, setGuests] = useState(1)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug,
          name,
          email,
          phone,
          guests,
          notes,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.")
        return
      }
      setDone(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-sm border border-line bg-surface px-6 py-8">
        <h2 className="font-display text-2xl">You&apos;re registered</h2>
        <p className="mt-3 text-muted">
          Thanks, {name.split(" ")[0] || "friend"}. We&apos;ve saved your spot
          for <span className="text-ink">{eventTitle}</span>.
        </p>
        {feeLabel && paypalLink ? (
          <p className="mt-4 text-sm text-muted">
            Suggested contribution: {feeLabel}.{" "}
            <a
              href={paypalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent-ink underline decoration-accent underline-offset-4"
            >
              Pay via PayPal
            </a>
          </p>
        ) : null}
        <Link
          href={`/events/${eventSlug}`}
          className="mt-6 inline-block text-sm font-semibold text-ink underline underline-offset-4"
        >
          Back to event
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-ink">
          Full name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-accent focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-accent focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-ink">
          Phone <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1.5 w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-accent focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="guests" className="block text-sm font-medium text-ink">
          Party size (including you)
        </label>
        <input
          id="guests"
          type="number"
          min={1}
          max={20}
          required
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value) || 1)}
          className="mt-1.5 w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-accent focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1.5 w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-accent focus:ring-2"
        />
      </div>
      {feeLabel ? (
        <p className="text-sm text-muted">
          Suggested contribution: <strong className="text-ink">{feeLabel}</strong>
          {paypalLink ? " — you&apos;ll get a PayPal link after registering." : null}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-accent-ink transition hover:brightness-105 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Register"}
      </button>
    </form>
  )
}
