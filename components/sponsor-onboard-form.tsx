"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { CheckoutHoldScreen } from "@/components/checkout-hold-screen"
import {
  CHECKOUT_HOLD_MINUTES,
  clearStoredSponsorHold,
  formatHoldCountdown,
  readStoredSponsorHold,
  writeStoredSponsorHold,
} from "@/lib/sponsor-hold-shared"
import {
  formatUsdFromCents,
  packageQuantityLabel,
  type PublicPackageAvailability,
} from "@/lib/sponsor-packages"

type Props = {
  packages: PublicPackageAvailability[]
  stripeReady: boolean
  canceled?: boolean
}

type CheckoutState = {
  checkoutUrl: string
  holdExpiresAt: number
  label: string
}

export function SponsorOnboardForm({
  packages: initialPackages,
  stripeReady,
  canceled,
}: Props) {
  const formId = useId()
  const [packages, setPackages] = useState(initialPackages)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [holdToken, setHoldToken] = useState<string | null>(null)
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null)
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  const [holdLoading, setHoldLoading] = useState(false)
  const [holdError, setHoldError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<CheckoutState | null>(null)

  const selected = packages.find((p) => p.key === selectedKey) ?? null
  const remainingSec =
    holdExpiresAt == null ? null : Math.max(0, holdExpiresAt - nowSec)
  const holdExpired =
    remainingSec != null && remainingSec <= 0 && Boolean(holdToken)

  const refreshPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/sponsor/packages", { cache: "no-store" })
      const data = (await res.json()) as {
        packages?: PublicPackageAvailability[]
      }
      if (data.packages) setPackages(data.packages)
    } catch {
      // ignore — keep last known list
    }
  }, [])

  const releaseHold = useCallback(async (token: string, packageKey: string) => {
    clearStoredSponsorHold(packageKey)
    try {
      await fetch(
        `/api/sponsor/hold?token=${encodeURIComponent(token)}`,
        { method: "DELETE" },
      )
    } catch {
      // ignore
    }
    await refreshPackages()
  }, [refreshPackages])

  const startHold = useCallback(
    async (packageKey: string, forceNew = false) => {
      setHoldLoading(true)
      setHoldError(null)
      setFormError(null)
      try {
        const prev = forceNew ? null : readStoredSponsorHold(packageKey)
        const res = await fetch("/api/sponsor/hold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageKey,
            token: prev?.token,
          }),
        })
        const data = (await res.json()) as {
          error?: string
          token?: string
          holdExpiresAt?: number
          remaining?: number | null
        }
        if (!res.ok || !data.token || !data.holdExpiresAt) {
          setHoldError(data.error || "Could not reserve this sponsorship.")
          setHoldToken(null)
          setHoldExpiresAt(null)
          clearStoredSponsorHold(packageKey)
          await refreshPackages()
          return
        }
        writeStoredSponsorHold({
          token: data.token,
          holdExpiresAt: data.holdExpiresAt,
          packageKey,
        })
        setHoldToken(data.token)
        setHoldExpiresAt(data.holdExpiresAt)
        await refreshPackages()
      } catch {
        setHoldError("Could not reserve this sponsorship.")
      } finally {
        setHoldLoading(false)
      }
    },
    [refreshPackages],
  )

  async function selectPackage(pkg: PublicPackageAvailability) {
    const mine = selectedKey === pkg.key && Boolean(holdToken)
    if (pkg.soldOut || (pkg.salePending && !mine)) return
    if (selectedKey && holdToken && selectedKey !== pkg.key) {
      await releaseHold(holdToken, selectedKey)
      setHoldToken(null)
      setHoldExpiresAt(null)
    }
    setSelectedKey(pkg.key)
    await startHold(pkg.key)
  }

  useEffect(() => {
    const tick = () => setNowSec(Math.floor(Date.now() / 1000))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!holdExpired || !holdToken || !selectedKey) return
    const token = holdToken
    const key = selectedKey
    void (async () => {
      await releaseHold(token, key)
      setHoldToken(null)
      setHoldExpiresAt(null)
    })()
  }, [holdExpired, holdToken, selectedKey, releaseHold])

  // Refresh when any public pending countdown hits zero, and poll while pending.
  useEffect(() => {
    const hasPending = packages.some((p) => p.salePending)
    if (!hasPending) return

    const soonest = packages
      .map((p) => p.pendingExpiresAt)
      .filter((n): n is number => n != null && n > 0)
      .sort((a, b) => a - b)[0]

    const timers: number[] = []
    if (soonest != null) {
      const delay = Math.max(500, (soonest - Math.floor(Date.now() / 1000)) * 1000 + 400)
      timers.push(window.setTimeout(() => void refreshPackages(), delay))
    }
    timers.push(window.setInterval(() => void refreshPackages(), 12_000))
    return () => {
      for (const t of timers) window.clearTimeout(t)
      // clearInterval and clearTimeout share ids in browsers; clear both styles
      for (const t of timers) {
        window.clearInterval(t)
        window.clearTimeout(t)
      }
    }
  }, [packages, refreshPackages])

  function packageStatusLabel(pkg: PublicPackageAvailability): string {
    const mine = selectedKey === pkg.key && Boolean(holdToken) && !holdExpired
    if (pkg.quantity == null) return "Unlimited"
    if (pkg.soldOut) return "Sold out"
    if (mine) return "Reserved for you"
    if (pkg.salePending) {
      const left =
        pkg.pendingExpiresAt != null
          ? Math.max(0, pkg.pendingExpiresAt - nowSec)
          : null
      return left != null
        ? `Sale pending · ${formatHoldCountdown(left)}`
        : "Sale pending"
    }
    if (pkg.pending > 0 && pkg.remaining != null) {
      return `${pkg.remaining} left · ${pkg.pending} sale pending`
    }
    if (pkg.remaining != null) {
      return `${pkg.remaining} left · ${packageQuantityLabel(pkg)}`
    }
    return packageQuantityLabel(pkg)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !selected || !holdToken || holdExpired) return
    if (!logoFile) {
      setFormError("Please choose a logo file.")
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      const body = new FormData()
      body.set("packageKey", selected.key)
      body.set("holdToken", holdToken)
      if (holdExpiresAt != null) body.set("holdExpiresAt", String(holdExpiresAt))
      body.set("name", name)
      body.set("email", email)
      body.set("contactName", contactName)
      body.set("contactPhone", contactPhone)
      body.set("websiteUrl", websiteUrl)
      body.set("logo", logoFile)
      const res = await fetch("/api/sponsor/register", {
        method: "POST",
        body,
      })
      const data = (await res.json()) as {
        error?: string
        checkoutUrl?: string
        holdExpiresAt?: number
      }
      if (!res.ok || !data.checkoutUrl || !data.holdExpiresAt) {
        setFormError(data.error || "Could not start checkout.")
        if (res.status === 409) {
          clearStoredSponsorHold(selected.key)
          setHoldToken(null)
          setHoldExpiresAt(null)
        }
        return
      }
      clearStoredSponsorHold(selected.key)
      setCheckout({
        checkoutUrl: data.checkoutUrl,
        holdExpiresAt: data.holdExpiresAt,
        label: selected.label,
      })
    } catch {
      setFormError("Could not start checkout.")
    } finally {
      setBusy(false)
    }
  }

  if (checkout) {
    return (
      <CheckoutHoldScreen
        checkoutUrl={checkout.checkoutUrl}
        holdExpiresAt={checkout.holdExpiresAt}
        eventTitle={checkout.label}
        isTeam={false}
        spotLabel="sponsorship"
      />
    )
  }

  return (
    <div className="space-y-10">
      {canceled ? (
        <p
          className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950"
          role="status"
        >
          Checkout was canceled and your hold was released. Pick a package again
          to start a new {CHECKOUT_HOLD_MINUTES}-minute timer.
        </p>
      ) : null}

      <section aria-labelledby={`${formId}-packages`}>
        <h2 id={`${formId}-packages`} className="font-display text-2xl text-ink">
          Choose a sponsorship
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Selecting a package holds it for {CHECKOUT_HOLD_MINUTES} minutes while
          you pay. If someone else is checking out, you’ll see{" "}
          <span className="font-medium text-ink">Sale pending</span> with a
          countdown — it only shows sold out after payment clears.
        </p>

        <ul className="mt-6 divide-y divide-line border-y border-line">
          {packages.map((pkg) => {
            const active = selectedKey === pkg.key
            const mine = active && Boolean(holdToken) && !holdExpired
            const blocked = pkg.soldOut || (pkg.salePending && !mine)
            const price = formatUsdFromCents(pkg.amountCents)
            const qty = packageStatusLabel(pkg)
            return (
              <li key={pkg.key}>
                <button
                  type="button"
                  disabled={blocked || holdLoading}
                  onClick={() => void selectPackage(pkg)}
                  className={`motion-press flex w-full flex-col gap-1 px-1 py-5 text-left transition disabled:opacity-50 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 ${
                    active ? "bg-accent-soft/60" : "hover:bg-surface"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-display text-xl text-ink">
                      {pkg.label}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {pkg.blurb}
                    </span>
                    <span
                      className={`mt-1 block text-xs font-medium ${
                        pkg.soldOut
                          ? "text-muted"
                          : pkg.salePending && !mine
                            ? "text-amber-800"
                            : "text-muted"
                      }`}
                    >
                      {qty}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-2xl tabular-nums text-ink">
                    {price}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {selected ? (
        <section aria-labelledby={`${formId}-checkout`}>
          <h2 id={`${formId}-checkout`} className="font-display text-2xl text-ink">
            Reserve &amp; pay
          </h2>
          <p className="mt-2 text-sm text-muted">
            {selected.label} · {formatUsdFromCents(selected.amountCents)}
          </p>

          {holdLoading ? (
            <p className="mt-4 text-sm text-muted">Reserving your sponsorship…</p>
          ) : null}

          {holdError ? (
            <div
              className="mt-4 border border-danger/40 bg-danger/5 px-5 py-4"
              role="alert"
            >
              <p className="text-sm font-medium text-danger">{holdError}</p>
              <button
                type="button"
                className="motion-press mt-3 inline-flex min-h-11 items-center justify-center bg-accent px-6 text-sm font-medium text-accent-ink"
                onClick={() => void startHold(selected.key, true)}
              >
                Try again
              </button>
            </div>
          ) : null}

          {remainingSec != null && !holdError ? (
            <div
              className={`mt-4 border px-5 py-4 ${
                holdExpired
                  ? "border-danger/40 bg-danger/5"
                  : "border-line bg-surface"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-muted">
                {holdExpired
                  ? "Time’s up — sponsorship released"
                  : "Sponsorship reserved for you"}
              </p>
              <p
                className="mt-1 font-display text-4xl tabular-nums tracking-tight text-ink"
                aria-label={`${remainingSec} seconds remaining`}
              >
                {formatHoldCountdown(remainingSec)}
              </p>
              {holdExpired ? (
                <>
                  <p className="mt-2 text-sm text-muted">
                    Your hold went back in the pool. Start over for a new{" "}
                    {CHECKOUT_HOLD_MINUTES}-minute reservation.
                  </p>
                  <button
                    type="button"
                    className="motion-press mt-4 inline-flex min-h-11 items-center justify-center bg-accent px-6 text-sm font-medium text-accent-ink"
                    onClick={() => void startHold(selected.key, true)}
                  >
                    Reserve again ({CHECKOUT_HOLD_MINUTES} min)
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {!holdExpired && !holdError && holdToken ? (
            <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
              <div>
                <label
                  htmlFor={`${formId}-name`}
                  className="block text-sm font-medium text-ink"
                >
                  Business or sponsor name
                </label>
                <input
                  id={`${formId}-name`}
                  name="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-control mt-1.5 w-full"
                  autoComplete="organization"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-contact`}
                  className="block text-sm font-medium text-ink"
                >
                  Point of contact
                </label>
                <input
                  id={`${formId}-contact`}
                  name="contactName"
                  required
                  maxLength={120}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="field-control mt-1.5 w-full"
                  autoComplete="name"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-email`}
                  className="block text-sm font-medium text-ink"
                >
                  Email for receipt
                </label>
                <input
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-control mt-1.5 w-full"
                  autoComplete="email"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-phone`}
                  className="block text-sm font-medium text-ink"
                >
                  Phone{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id={`${formId}-phone`}
                  name="contactPhone"
                  type="tel"
                  maxLength={40}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="field-control mt-1.5 w-full"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-web`}
                  className="block text-sm font-medium text-ink"
                >
                  Website{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id={`${formId}-web`}
                  name="websiteUrl"
                  type="url"
                  maxLength={500}
                  placeholder="https://"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="field-control mt-1.5 w-full"
                  autoComplete="url"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-logo`}
                  className="block text-sm font-medium text-ink"
                >
                  Logo
                </label>
                <input
                  id={`${formId}-logo`}
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  required
                  className="mt-1.5 block w-full text-sm text-ink file:mr-4 file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-ink"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1.5 text-xs text-muted">
                  JPEG, PNG, WebP, GIF, or SVG · under 8 MB. Goes live on the
                  site after payment.
                </p>
              </div>

              <button
                type="submit"
                disabled={busy || !stripeReady || holdLoading}
                className="motion-press inline-flex min-h-11 w-full items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink disabled:opacity-60 sm:w-auto"
              >
                {busy
                  ? "Opening checkout…"
                  : `Pay ${formatUsdFromCents(selected.amountCents)}`}
              </button>
              {!stripeReady ? (
                <p className="text-sm text-muted">
                  Card checkout is temporarily offline.
                </p>
              ) : null}
              {formError ? (
                <p className="text-sm text-danger" role="alert">
                  {formError}
                </p>
              ) : null}
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
