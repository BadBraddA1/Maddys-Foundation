"use client"

import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout"

type Props = {
  clientSecret: string
  label: string
  remainingSec: number
  onCancel: () => void
}

/** Sponsor-facing wrapper around shared Stripe Embedded Checkout. */
export function SponsorEmbeddedCheckout(props: Props) {
  return (
    <StripeEmbeddedCheckout
      {...props}
      expiredTitle="Time’s up — sponsorship released"
      cancelLabel="Cancel and pick another package"
    />
  )
}
