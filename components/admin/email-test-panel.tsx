"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  EMAIL_TEMPLATE_OPTIONS,
  type EmailTemplateKind,
} from "@/lib/email-templates"
import { SAMPLE_PLAYER_CODE, SAMPLE_TEAM_CODE } from "@/lib/sample-ticket-codes"
import { SAMPLE_SPONSOR_PAY_TOKEN } from "@/lib/sponsor-emails"

type Props = {
  configured: boolean
  defaultTo: string
  fromLabel: string
}

export function EmailTestPanel({ configured, defaultTo, fromLabel }: Props) {
  const [kind, setKind] = useState<EmailTemplateKind>("confirmation")
  const [to, setTo] = useState(defaultTo)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const selected = useMemo(
    () => EMAIL_TEMPLATE_OPTIONS.find((o) => o.kind === kind),
    [kind],
  )

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, to }),
      })
      const data = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) {
        setError(data.error || "Could not send test email.")
        return
      }
      setMessage(data.message || "Test email sent.")
    } catch {
      setError("Network error — try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Email templates</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Send a sample of each transactional email to yourself (registration +
          sponsor). Subjects are prefixed with{" "}
          <span className="font-medium text-ink">[TEST]</span> and do not touch
          real records.
        </p>
        <p className="mt-2 text-sm text-muted">
          From:{" "}
          <span className="font-medium text-ink">
            {fromLabel || "not configured"}
          </span>
          {!configured ? (
            <>
              {" "}
              · set <code className="text-ink">SENDKIT_API_KEY</code> and{" "}
              <code className="text-ink">EMAIL_FROM</code>
            </>
          ) : null}
        </p>
      </div>

      <section className="max-w-xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl text-ink">Preview ticket pages</h2>
        <p className="mt-2 text-sm text-muted">
          Same sample codes used in test emails — open these to see what captains
          and players get.
        </p>
        <ul className="mt-4 space-y-2 text-sm font-medium">
          <li>
            <Link
              href={`/ticket/${SAMPLE_TEAM_CODE}`}
              className="text-accent-ink underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Team ticket ({SAMPLE_TEAM_CODE})
            </Link>
          </li>
          <li>
            <Link
              href={`/ticket/p/${SAMPLE_PLAYER_CODE}`}
              className="text-accent-ink underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Player ticket ({SAMPLE_PLAYER_CODE})
            </Link>
          </li>
          <li>
            <Link
              href={`/sponsor/pay/${SAMPLE_SPONSOR_PAY_TOKEN}`}
              className="text-accent-ink underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sponsor pay page (preview)
            </Link>
          </li>
        </ul>
      </section>

      <form
        onSubmit={(e) => void onSend(e)}
        className="max-w-xl space-y-5 border border-line bg-surface p-5"
      >
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">Template</legend>
          {EMAIL_TEMPLATE_OPTIONS.map((opt) => (
            <label
              key={opt.kind}
              className="flex min-h-11 cursor-pointer items-start gap-3"
            >
              <input
                type="radio"
                name="kind"
                className="mt-1 size-4"
                checked={kind === opt.kind}
                onChange={() => setKind(opt.kind)}
                disabled={busy}
              />
              <span>
                <span className="block font-medium text-ink">{opt.label}</span>
                <span className="block text-sm text-muted">{opt.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {selected ? (
          <p className="text-sm text-muted">
            Sample content uses placeholder names, codes, and event details.
          </p>
        ) : null}

        <div>
          <label htmlFor="email-test-to" className="block text-sm font-medium text-ink">
            Send to
          </label>
          <input
            id="email-test-to"
            type="email"
            required
            className="field-control mt-1.5 min-h-11 w-full"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={busy}
            autoComplete="email"
          />
        </div>

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
          disabled={busy || !configured}
          className="btn-deep inline-flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send test email"}
        </button>
      </form>
    </div>
  )
}
