"use client"

import { useMemo, useState } from "react"
import {
  SPONSOR_LEVELS,
  formatUsdFromCents,
  type SponsorLevel,
} from "@/lib/sponsor-levels"

export function SponsorJoinForm() {
  const [levelKey, setLevelKey] = useState("silver")
  const [customAmount, setCustomAmount] = useState("")
  const [name, setName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const level: SponsorLevel =
    SPONSOR_LEVELS.find((l) => l.key === levelKey) || SPONSOR_LEVELS[SPONSOR_LEVELS.length - 1]!

  const amountLabel = useMemo(() => {
    if (level.amountCents != null) return formatUsdFromCents(level.amountCents)
    return customAmount.trim() ? `$${customAmount.trim()}` : "Custom"
  }, [level, customAmount])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || busy) return
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.set("name", name)
      body.set("websiteUrl", websiteUrl)
      body.set("contactName", contactName)
      body.set("contactEmail", contactEmail)
      body.set("contactPhone", contactPhone)
      body.set("levelKey", level.key)
      body.set("customAmount", customAmount)
      body.set("logo", file)
      const res = await fetch("/api/sponsor/join", { method: "POST", body })
      const data = (await res.json()) as {
        error?: string
        checkoutUrl?: string | null
        payPath?: string
      }
      if (!res.ok) {
        setError(data.error || "Could not start sponsorship.")
        return
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      if (data.payPath) {
        window.location.href = data.payPath
        return
      }
      setError("Could not open checkout.")
    } catch {
      setError("Could not start sponsorship.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {SPONSOR_LEVELS.map((l) => {
          const selected = l.key === levelKey
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => setLevelKey(l.key)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-[var(--deep)] bg-[var(--deep)]/10"
                  : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--deep)]/50"
              }`}
            >
              <p className="font-semibold text-[var(--ink)]">{l.label}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{l.blurb}</p>
              <p className="mt-2 text-sm font-medium text-[var(--deep)]">
                {l.amountCents != null ? formatUsdFromCents(l.amountCents) : "You choose"}
              </p>
            </button>
          )
        })}
      </div>

      {level.amountCents == null ? (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Amount (USD)</span>
          <input
            required
            inputMode="decimal"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="250"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
          />
        </label>
      ) : null}

      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Business / sponsor name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Website (optional)</span>
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://"
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Your name</span>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            required
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Phone (optional)</span>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Logo</span>
          <input
            required
            type="file"
            accept="image/*,.svg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={busy || !file}
        className="w-full rounded-full bg-[var(--deep)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : `Continue to pay ${amountLabel}`}
      </button>
      <p className="text-center text-xs text-[var(--muted)]">
        Card via Stripe. Venmo instructions are on the next step if you prefer.
      </p>
    </form>
  )
}
