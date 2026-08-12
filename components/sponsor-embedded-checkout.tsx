"use client"

import { useMemo } from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { formatHoldCountdown } from "@/lib/sponsor-hold-shared"

const publishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? ""

type Props = {
  clientSecret: string
  label: string
  remainingSec: number
  onCancel: () => void
}

export function SponsorEmbeddedCheckout({
  clientSecret,
  label,
  remainingSec,
  onCancel,
}: Props) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [],
  )

  const expired = remainingSec <= 0

  if (!stripePromise) {
    return (
      <p className="text-sm text-danger" role="alert">
        Card checkout is temporarily offline.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div
        className={`border px-5 py-4 ${
          expired
            ? "border-danger/40 bg-danger/5"
            : "border-line bg-surface"
        }`}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-muted">
          {expired
            ? "Time’s up — sponsorship released"
            : `Paying for ${label}`}
        </p>
        {!expired ? (
          <p className="mt-1 font-display text-4xl tabular-nums tracking-tight text-ink">
            {formatHoldCountdown(remainingSec)}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted">
          {expired
            ? "Start over to reserve this package again."
            : "Finish payment below — you stay on this page."}
        </p>
      </div>

      {!expired ? (
        <div className="border border-line bg-surface p-2 sm:p-4">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onCancel}
        className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4 hover:text-ink"
      >
        Cancel and pick another package
      </button>
    </div>
  )
}
