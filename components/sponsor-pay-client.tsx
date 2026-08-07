"use client"

import { useState } from "react"
import { formatUsdFromCents } from "@/lib/sponsor-levels"

type Props = {
  token: string
  name: string
  amountCents: number
  alreadyPaid: boolean
  paidFlag: boolean
  canceledFlag: boolean
  stripeReady: boolean
}

export function SponsorPayClient(props: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const amount = formatUsdFromCents(props.amountCents)

  async function payCard() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/sponsor/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: props.token }),
      })
      const data = (await res.json()) as { error?: string; url?: string }
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout.")
        return
      }
      window.location.href = data.url
    } catch {
      setError("Could not start checkout.")
    } finally {
      setBusy(false)
    }
  }

  if (props.alreadyPaid || props.paidFlag) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Thank you!</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {props.name}’s sponsorship is paid
          {props.paidFlag ? " (confirming now)" : ""}. Your logo publishes on the
          site automatically once Stripe confirms payment.
        </p>
        <a href="/" className="mt-6 inline-block text-sm font-semibold text-[var(--deep)]">
          Back to home →
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Amount due
      </p>
      <h1 className="mt-1 text-3xl font-semibold text-[var(--ink)]">{amount}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Sponsor · {props.name}
      </p>
      {props.canceledFlag ? (
        <p className="mt-4 text-sm text-amber-800">Checkout canceled — you can try again below.</p>
      ) : null}

      <div className="mt-8 space-y-3">
        <button
          type="button"
          disabled={busy || !props.stripeReady}
          onClick={payCard}
          className="w-full rounded-full bg-[var(--deep)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Opening Stripe…" : `Pay ${amount} with card`}
        </button>
        {!props.stripeReady ? (
          <p className="text-center text-xs text-[var(--muted)]">
            Card checkout is temporarily offline.
          </p>
        ) : (
          <p className="text-center text-xs text-[var(--muted)]">
            Secure Stripe checkout. Your logo goes live automatically after payment.
          </p>
        )}
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
