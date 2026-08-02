"use client"

import { useMemo, useState } from "react"
import type { PublicTicketPlayer } from "@/lib/ticket"

type Props = {
  teamCode: string
  players: PublicTicketPlayer[]
  captainEmail: string
}

export function TicketCaptainShare({
  teamCode,
  players: initial,
  captainEmail,
}: Props) {
  const [emails, setEmails] = useState<Record<number, string>>(() => {
    const next: Record<number, string> = {}
    for (const p of initial) {
      next[p.id] =
        p.email ||
        (p.sortOrder === 0 && captainEmail ? captainEmail : "")
    }
    return next
  })
  const [pending, setPending] = useState(false)
  const [forceResend, setForceResend] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sentAt, setSentAt] = useState<Record<number, string | null>>(() => {
    const next: Record<number, string | null> = {}
    for (const p of initial) next[p.id] = p.ticketEmailSentAt
    return next
  })

  const filled = useMemo(
    () => Object.values(emails).filter((e) => e.trim()).length,
    [emails],
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(
        `/api/ticket/${encodeURIComponent(teamCode)}/players`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forceResend,
            players: initial.map((p) => ({
              id: p.id,
              email: emails[p.id] ?? "",
            })),
          }),
        },
      )
      const data = (await res.json()) as {
        error?: string
        sent?: number
        skipped?: number
        failed?: Array<{ id: number; error: string }>
      }
      if (!res.ok) {
        setError(data.error || "Could not send tickets.")
        return
      }
      const parts = [
        data.sent ? `Sent ${data.sent}` : null,
        data.skipped ? `already sent ${data.skipped}` : null,
      ].filter(Boolean)
      setMessage(
        parts.length
          ? `${parts.join(", ")}.`
          : "Saved emails.",
      )
      if (data.failed?.length) {
        setError(data.failed.map((f) => f.error).join(" · "))
      }
      if ((data.sent ?? 0) > 0 || forceResend) {
        const now = new Date().toISOString()
        setSentAt((prev) => {
          const next = { ...prev }
          for (const p of initial) {
            if ((emails[p.id] ?? "").trim()) next[p.id] = now
          }
          return next
        })
      }
    } catch {
      setError("Network error. Try again.")
    } finally {
      setPending(false)
    }
  }

  if (initial.length === 0) return null

  return (
    <section className="mt-10 border-t border-line pt-8 print:hidden">
      <h2 className="font-display text-xl text-ink">Send teammate tickets</h2>
      <p className="mt-2 text-sm text-muted text-pretty">
        Enter each player’s email and we’ll send them a personal check-in QR.
        Staff scan that QR to check them in automatically on event day.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {initial.map((p) => (
          <div key={p.id}>
            <label
              htmlFor={`player-email-${p.id}`}
              className="block text-sm font-medium text-ink"
            >
              {p.displayName}
              {sentAt[p.id] ? (
                <span className="ml-2 font-normal text-muted">· sent</span>
              ) : null}
            </label>
            <input
              id={`player-email-${p.id}`}
              type="email"
              inputMode="email"
              autoComplete="email"
              className="field-control mt-1.5"
              placeholder="name@example.com"
              value={emails[p.id] ?? ""}
              onChange={(e) =>
                setEmails((prev) => ({ ...prev, [p.id]: e.target.value }))
              }
            />
          </div>
        ))}
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={forceResend}
            onChange={(e) => setForceResend(e.target.checked)}
          />
          Resend even if already sent
        </label>
        {error ? (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm font-medium text-success" role="status">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || filled === 0}
          aria-busy={pending}
          className="btn-deep inline-flex min-h-11 items-center px-6 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sending…" : "Save & send tickets"}
        </button>
      </form>
    </section>
  )
}
