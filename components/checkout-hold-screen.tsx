"use client"

import { useEffect, useState } from "react"
import {
  CHECKOUT_HOLD_MINUTES,
  formatHoldCountdown,
} from "@/lib/registration-hold"

type Props = {
  checkoutUrl: string
  holdExpiresAt: number
  eventTitle: string
  isTeam: boolean
}

export function CheckoutHoldScreen({
  checkoutUrl,
  holdExpiresAt,
  eventTitle,
  isTeam,
}: Props) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, holdExpiresAt - Math.floor(Date.now() / 1000)),
  )
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, holdExpiresAt - Math.floor(Date.now() / 1000))
      setRemaining(left)
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [holdExpiresAt])

  useEffect(() => {
    // Brief beat so they see the timer, then Stripe Checkout.
    const t = window.setTimeout(() => {
      setRedirecting(true)
      window.location.assign(checkoutUrl)
    }, 1800)
    return () => window.clearTimeout(t)
  }, [checkoutUrl])

  const expired = remaining <= 0
  const spot = isTeam ? "team spot" : "spot"

  return (
    <div
      className="border border-line bg-surface px-6 py-8"
      role="status"
      aria-live="polite"
    >
      <h2 className="font-display text-2xl text-ink">
        {expired ? "Hold expired" : "Your spot is held"}
      </h2>
      <p className="mt-3 text-ink/75">
        {expired ? (
          <>
            Time ran out for{" "}
            <span className="font-medium text-ink">{eventTitle}</span>. Refresh
            and register again if a {spot} is still open.
          </>
        ) : (
          <>
            Complete payment for{" "}
            <span className="font-medium text-ink">{eventTitle}</span> before
            the timer hits zero — or your {spot} goes back in the pool (
            {CHECKOUT_HOLD_MINUTES} minute hold).
          </>
        )}
      </p>

      {!expired ? (
        <p
          className="mt-6 font-display text-5xl tabular-nums tracking-tight text-ink"
          aria-label={`${remaining} seconds remaining`}
        >
          {formatHoldCountdown(remaining)}
        </p>
      ) : null}

      {!expired ? (
        <a
          href={checkoutUrl}
          className="motion-press mt-8 inline-flex min-h-11 w-full items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink sm:w-auto"
          onClick={() => setRedirecting(true)}
        >
          {redirecting ? "Opening secure checkout…" : "Continue to payment"}
        </a>
      ) : null}

      <p className="mt-4 text-sm text-muted">
        Do not close this window until payment finishes. Leaving checkout early
        releases your {spot}.
      </p>
    </div>
  )
}
