import type { Metadata } from "next"
import { SponsorJoinForm } from "@/components/sponsor-join-form"

export const metadata: Metadata = {
  title: "Become a sponsor",
  description:
    "Choose a sponsorship level or custom amount, share your logo, and pay by card or Venmo.",
}

export default function SponsorPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Madalyn Robinson Foundation
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
          Become a sponsor
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted)] sm:text-base">
          Pick a level or enter a custom amount, upload your logo, and pay by credit card.
          Prefer Venmo? You’ll get that option on the payment page — your logo goes live after
          payment is confirmed.
        </p>
      </header>
      <SponsorJoinForm />
    </div>
  )
}
