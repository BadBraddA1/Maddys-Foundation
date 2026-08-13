"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { PublicPackageAvailability } from "@/lib/sponsor-packages"
import { formatUsdFromCents } from "@/lib/sponsor-levels"
import type { Sponsor } from "@/lib/sponsors"

type Props = {
  initialSponsors: Sponsor[]
  initialPackages: PublicPackageAvailability[]
  r2Ready: boolean
}

const emptyForm = {
  name: "",
  websiteUrl: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactNotes: "",
  packageKey: "",
  paymentMethod: "waived" as "waived" | "card" | "check",
}

/** Editable dollars string for admin price inputs (e.g. 850 or 850.50). */
function dollarsInputFromCents(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return ""
  const dollars = cents / 100
  return dollars % 1 === 0 ? String(dollars) : dollars.toFixed(2)
}

export function SponsorsAdmin({
  initialSponsors,
  initialPackages,
  r2Ready,
}: Props) {
  const router = useRouter()
  const [sponsors, setSponsors] = useState(initialSponsors)
  const [packages, setPackages] = useState(initialPackages)
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialPackages.map((p) => [
        p.key,
        p.quantity == null ? "" : String(p.quantity),
      ]),
    ),
  )
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialPackages.map((p) => [p.key, dollarsInputFromCents(p.amountCents)]),
    ),
  )
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState(emptyForm)
  const [amountDrafts, setAmountDrafts] = useState<Record<number, string>>({})
  const [checkPackageDrafts, setCheckPackageDrafts] = useState<
    Record<number, string>
  >({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function refresh() {
    const [sponsorsRes, packagesRes] = await Promise.all([
      fetch("/api/admin/sponsors"),
      fetch("/api/admin/sponsor-packages"),
    ])
    const sponsorsData = (await sponsorsRes.json()) as { sponsors?: Sponsor[] }
    const packagesData = (await packagesRes.json()) as {
      packages?: PublicPackageAvailability[]
    }
    if (sponsorsData.sponsors) setSponsors(sponsorsData.sponsors)
    if (packagesData.packages) {
      setPackages(packagesData.packages)
      setQtyDrafts((prev) => {
        const next = { ...prev }
        for (const p of packagesData.packages!) {
          if (next[p.key] === undefined) {
            next[p.key] = p.quantity == null ? "" : String(p.quantity)
          }
        }
        return next
      })
      setPriceDrafts((prev) => {
        const next = { ...prev }
        for (const p of packagesData.packages!) {
          if (next[p.key] === undefined) {
            next[p.key] = dollarsInputFromCents(p.amountCents)
          }
        }
        return next
      })
    }
    router.refresh()
  }

  async function savePackage(packageKey: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const rawQty = (qtyDrafts[packageKey] ?? "").trim()
      const rawPrice = (priceDrafts[packageKey] ?? "").trim()
      if (!rawPrice) {
        setError("Enter a dollar price for this package.")
        return
      }
      const res = await fetch("/api/admin/sponsor-packages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageKey,
          quantity: rawQty === "" ? null : rawQty,
          amountUsd: rawPrice,
        }),
      })
      const data = (await res.json()) as {
        error?: string
        packages?: PublicPackageAvailability[]
      }
      if (!res.ok) {
        setError(data.error || "Could not update package.")
        return
      }
      if (data.packages) {
        setPackages(data.packages)
        setQtyDrafts(
          Object.fromEntries(
            data.packages.map((p) => [
              p.key,
              p.quantity == null ? "" : String(p.quantity),
            ]),
          ),
        )
        setPriceDrafts(
          Object.fromEntries(
            data.packages.map((p) => [
              p.key,
              dollarsInputFromCents(p.amountCents),
            ]),
          ),
        )
      }
      setMessage("Package updated.")
      router.refresh()
    } catch {
      setError("Could not update package.")
    } finally {
      setBusy(false)
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!file || busy) return
    if (
      (form.paymentMethod === "check" || form.paymentMethod === "card") &&
      !form.packageKey
    ) {
      setError("Choose which sponsorship package they took.")
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const body = new FormData()
      body.set("name", form.name)
      body.set("websiteUrl", form.websiteUrl)
      body.set("contactName", form.contactName)
      body.set("contactEmail", form.contactEmail)
      body.set("contactPhone", form.contactPhone)
      body.set("contactNotes", form.contactNotes)
      body.set("packageKey", form.packageKey)
      body.set("paymentMethod", form.paymentMethod)
      body.set("logo", file)
      const res = await fetch("/api/admin/sponsors", { method: "POST", body })
      const data = (await res.json()) as { error?: string; sponsor?: { id: number } }
      if (!res.ok) {
        setError(data.error || "Could not add sponsor.")
        return
      }
      setForm(emptyForm)
      setFile(null)
      setMessage(
        form.paymentMethod === "check"
          ? "Sponsor added — package claimed as paid by check."
          : form.paymentMethod === "card"
            ? "Sponsor added as unpaid draft — email the Stripe pay link when ready."
            : "Sponsor added.",
      )
      await refresh()
    } catch {
      setError("Could not add sponsor.")
    } finally {
      setBusy(false)
    }
  }

  function startEdit(sponsor: Sponsor) {
    setEditingId(sponsor.id)
    setEditDraft({
      name: sponsor.name,
      websiteUrl: sponsor.website_url,
      contactName: sponsor.contact_name,
      contactEmail: sponsor.contact_email,
      contactPhone: sponsor.contact_phone,
      contactNotes: sponsor.contact_notes,
      packageKey: sponsor.level_key,
      paymentMethod: "waived",
    })
    setError(null)
    setMessage(null)
  }

  async function saveEdit(sponsorId: number) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.set("id", String(sponsorId))
      body.set("name", editDraft.name)
      body.set("websiteUrl", editDraft.websiteUrl)
      body.set("contactName", editDraft.contactName)
      body.set("contactEmail", editDraft.contactEmail)
      body.set("contactPhone", editDraft.contactPhone)
      body.set("contactNotes", editDraft.contactNotes)
      body.set("packageKey", editDraft.packageKey)
      const res = await fetch("/api/admin/sponsors", { method: "PATCH", body })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not save contacts.")
        return
      }
      setEditingId(null)
      setMessage("Sponsor saved.")
      await refresh()
    } catch {
      setError("Could not save contacts.")
    } finally {
      setBusy(false)
    }
  }

  async function togglePublished(sponsor: Sponsor) {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.set("id", String(sponsor.id))
      body.set("isPublished", sponsor.is_published ? "0" : "1")
      const res = await fetch("/api/admin/sponsors", { method: "PATCH", body })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not update.")
        return
      }
      await refresh()
    } catch {
      setError("Could not update.")
    } finally {
      setBusy(false)
    }
  }

  async function move(sponsor: Sponsor, direction: -1 | 1) {
    const idx = sponsors.findIndex((s) => s.id === sponsor.id)
    const swap = sponsors[idx + direction]
    if (!swap) return
    setBusy(true)
    try {
      const a = new FormData()
      a.set("id", String(sponsor.id))
      a.set("sortOrder", String(swap.sort_order))
      const b = new FormData()
      b.set("id", String(swap.id))
      b.set("sortOrder", String(sponsor.sort_order))
      await Promise.all([
        fetch("/api/admin/sponsors", { method: "PATCH", body: a }),
        fetch("/api/admin/sponsors", { method: "PATCH", body: b }),
      ])
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function payAction(
    sponsorId: number,
    action: "set_amount" | "send_invite" | "mark_paid" | "mark_paid_check",
    amountUsd?: string,
    packageKey?: string,
  ) {
    if (busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/sponsors/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sponsorId, amountUsd, packageKey }),
      })
      const data = (await res.json()) as {
        error?: string
        payUrl?: string
        ok?: boolean
      }
      if (!res.ok) {
        setError(data.error || "Payment action failed.")
        return
      }
      if (action === "send_invite") {
        setMessage(
          data.payUrl
            ? `Pay email sent. Link: ${data.payUrl}`
            : "Pay email sent.",
        )
      } else if (action === "set_amount") {
        setMessage(
          data.payUrl
            ? `Amount saved. Pay link: ${data.payUrl}`
            : "Amount saved.",
        )
      } else if (action === "mark_paid_check") {
        setMessage("Marked paid by check — package claimed, logo published.")
      } else {
        setMessage("Marked paid — logo published.")
      }
      await refresh()
    } catch {
      setError("Payment action failed.")
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(sponsor: Sponsor) {
    if (!window.confirm(`Remove ${sponsor.name}?`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/sponsors?id=${sponsor.id}`, {
        method: "DELETE",
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not delete.")
        return
      }
      setMessage("Sponsor removed.")
      await refresh()
    } catch {
      setError("Could not delete.")
    } finally {
      setBusy(false)
    }
  }

  const packageOptions = packages.map((p) => {
    const spots =
      p.quantity == null
        ? "unlimited"
        : p.soldOut
          ? "sold out"
          : p.salePending
            ? `sale pending · ${p.claimed} claimed`
            : `${p.remaining ?? 0} left of ${p.quantity}`
    return {
      key: p.key,
      label: `${p.label} · ${formatUsdFromCents(p.amountCents)} · ${spots}`,
      soldOut: p.soldOut,
    }
  })

  return (
    <div className="space-y-10">
      {!r2Ready ? (
        <p className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          R2 is not configured. Set{" "}
          <code className="text-ink">R2_UPLOAD_WORKER_URL</code>,{" "}
          <code className="text-ink">R2_UPLOAD_SECRET</code>, and{" "}
          <code className="text-ink">R2_PUBLIC_URL</code>.
        </p>
      ) : null}
      {error ? (
        <p className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="border border-success/25 bg-success-soft px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <section className="border border-line bg-surface p-5">
        <h2 className="font-display text-xl">Package inventory</h2>
        <p className="mt-1 text-sm text-muted">
          Price and spots control the public /sponsor page. Leave spots blank for
          unlimited. Claimed = paid or check/admin. Pending = someone is in the
          10-minute checkout hold (shows as “Sale pending” publicly, not sold
          out).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 pr-3 font-medium">Package</th>
                <th className="py-2 pr-3 font-medium">Price ($)</th>
                <th className="py-2 pr-3 font-medium">Claimed</th>
                <th className="py-2 pr-3 font-medium">Pending</th>
                <th className="py-2 pr-3 font-medium">Spots</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.key} className="border-b border-line/70">
                  <td className="py-2.5 pr-3 align-middle font-medium text-ink">
                    {p.label}
                    {p.soldOut ? (
                      <span className="ml-2 text-xs font-normal text-danger">
                        Sold out
                      </span>
                    ) : p.salePending ? (
                      <span className="ml-2 text-xs font-normal text-amber-800">
                        Sale pending
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3 align-middle">
                    <input
                      className="field-control min-h-10 w-24 tabular-nums"
                      inputMode="decimal"
                      placeholder={dollarsInputFromCents(p.amountCents)}
                      aria-label={`Price for ${p.label}`}
                      value={priceDrafts[p.key] ?? ""}
                      onChange={(e) =>
                        setPriceDrafts((d) => ({
                          ...d,
                          [p.key]: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="py-2.5 pr-3 align-middle tabular-nums text-muted">
                    {p.claimed}
                    {p.quantity != null ? ` / ${p.quantity}` : ""}
                  </td>
                  <td className="py-2.5 pr-3 align-middle tabular-nums text-muted">
                    {p.pending}
                  </td>
                  <td className="py-2.5 pr-3 align-middle">
                    <input
                      className="field-control min-h-10 w-24"
                      inputMode="numeric"
                      placeholder="∞"
                      aria-label={`Spots for ${p.label}`}
                      value={qtyDrafts[p.key] ?? ""}
                      onChange={(e) =>
                        setQtyDrafts((d) => ({
                          ...d,
                          [p.key]: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="py-2.5 align-middle">
                    <button
                      type="button"
                      disabled={busy}
                      className="inline-flex min-h-10 items-center border border-line px-3 text-sm disabled:opacity-60"
                      onClick={() => void savePackage(p.key)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form onSubmit={(e) => void onCreate(e)} className="border border-line bg-surface p-5 space-y-4">
        <h2 className="font-display text-xl">Add sponsor</h2>
        <p className="text-sm text-muted">
          For check payments, pick the package they took — it claims that
          inventory spot and publishes the logo. Card drafts stay hidden until
          Stripe confirms.
        </p>
        <div>
          <label htmlFor="sponsor-name" className="block text-sm font-medium">
            Organization name
          </label>
          <input
            id="sponsor-name"
            className="field-control mt-1.5 min-h-11 w-full"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            maxLength={120}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sponsor-package" className="block text-sm font-medium">
              Sponsorship package
            </label>
            <select
              id="sponsor-package"
              className="field-control mt-1.5 min-h-11 w-full"
              value={form.packageKey}
              onChange={(e) =>
                setForm((f) => ({ ...f, packageKey: e.target.value }))
              }
              required={
                form.paymentMethod === "check" || form.paymentMethod === "card"
              }
            >
              <option value="">— None / complimentary —</option>
              {packageOptions.map((o) => (
                <option key={o.key} value={o.key} disabled={o.soldOut}>
                  {o.label}
                  {o.soldOut ? " (sold out)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sponsor-pay-method" className="block text-sm font-medium">
              Payment
            </label>
            <select
              id="sponsor-pay-method"
              className="field-control mt-1.5 min-h-11 w-full"
              value={form.paymentMethod}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  paymentMethod: e.target.value as
                    | "waived"
                    | "card"
                    | "check",
                }))
              }
            >
              <option value="waived">Complimentary / publish now</option>
              <option value="check">Paid by check (claim package)</option>
              <option value="card">Card — unpaid Stripe link</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="sponsor-url" className="block text-sm font-medium">
            Website (optional)
          </label>
          <input
            id="sponsor-url"
            type="url"
            className="field-control mt-1.5 min-h-11 w-full"
            value={form.websiteUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, websiteUrl: e.target.value }))
            }
            placeholder="https://"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sponsor-contact" className="block text-sm font-medium">
              Point of contact
            </label>
            <input
              id="sponsor-contact"
              className="field-control mt-1.5 min-h-11 w-full"
              value={form.contactName}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactName: e.target.value }))
              }
              maxLength={120}
            />
          </div>
          <div>
            <label htmlFor="sponsor-email" className="block text-sm font-medium">
              Contact email
            </label>
            <input
              id="sponsor-email"
              type="email"
              className="field-control mt-1.5 min-h-11 w-full"
              value={form.contactEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactEmail: e.target.value }))
              }
              maxLength={200}
            />
          </div>
          <div>
            <label htmlFor="sponsor-phone" className="block text-sm font-medium">
              Contact phone
            </label>
            <input
              id="sponsor-phone"
              type="tel"
              className="field-control mt-1.5 min-h-11 w-full"
              value={form.contactPhone}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactPhone: e.target.value }))
              }
              maxLength={40}
            />
          </div>
          <div>
            <label htmlFor="sponsor-logo" className="block text-sm font-medium">
              Logo
            </label>
            <input
              id="sponsor-logo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="mt-1.5 block w-full text-sm"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="sponsor-notes" className="block text-sm font-medium">
            Staff notes
          </label>
          <textarea
            id="sponsor-notes"
            className="field-control mt-1.5 min-h-24 w-full"
            value={form.contactNotes}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactNotes: e.target.value }))
            }
            maxLength={1000}
            placeholder="Check #, follow-up reminders…"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !r2Ready}
          className="btn-deep inline-flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Saving…" : "Add sponsor"}
        </button>
      </form>

      <div>
        <h2 className="font-display text-xl">Sponsors</h2>
        {sponsors.length === 0 ? (
          <p className="mt-4 text-muted">No sponsors yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line">
            {sponsors.map((s, i) => (
              <li key={s.id} className="space-y-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.logo_url}
                        alt=""
                        className="h-12 w-24 shrink-0 object-contain bg-bg"
                      />
                    ) : (
                      <span className="inline-flex h-12 w-24 shrink-0 items-center justify-center bg-bg text-xs text-muted">
                        No logo
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{s.name}</p>
                      <p className="text-sm text-muted">
                        {s.level_label ? `${s.level_label} · ` : ""}
                        {s.is_published ? "Published" : "Hidden"}
                        {s.payment_status
                          ? ` · ${s.payment_status}${
                              s.source === "admin_check" ? " (check)" : ""
                            }${
                              s.amount_cents
                                ? ` · $${(s.amount_cents / 100).toFixed(
                                    s.amount_cents % 100 === 0 ? 0 : 2,
                                  )}`
                                : ""
                            }`
                          : ""}
                        {s.website_url ? ` · ${s.website_url}` : ""}
                      </p>
                      {editingId !== s.id ? (
                        <p className="mt-2 text-sm text-muted">
                          {s.contact_name || s.contact_email ? (
                            <>
                              {s.contact_name || "Contact"}
                              {s.contact_email ? (
                                <>
                                  {" · "}
                                  <a
                                    href={`mailto:${s.contact_email}`}
                                    className="text-accent-ink underline underline-offset-4"
                                  >
                                    {s.contact_email}
                                  </a>
                                </>
                              ) : null}
                              {s.contact_phone ? ` · ${s.contact_phone}` : ""}
                            </>
                          ) : (
                            "No contact on file"
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <button
                      type="button"
                      disabled={busy || i === 0}
                      className="inline-flex min-h-11 items-center border border-line px-3 disabled:opacity-40"
                      onClick={() => void move(s, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={busy || i === sponsors.length - 1}
                      className="inline-flex min-h-11 items-center border border-line px-3 disabled:opacity-40"
                      onClick={() => void move(s, 1)}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="inline-flex min-h-11 items-center border border-line px-3"
                      onClick={() =>
                        editingId === s.id
                          ? setEditingId(null)
                          : startEdit(s)
                      }
                    >
                      {editingId === s.id ? "Cancel" : "Edit"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="inline-flex min-h-11 items-center border border-line px-3"
                      onClick={() => void togglePublished(s)}
                    >
                      {s.is_published ? "Hide" : "Publish"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="inline-flex min-h-11 items-center border border-danger/40 px-3 text-danger"
                      onClick={() => void onDelete(s)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingId === s.id ? (
                  <div className="grid gap-3 border border-line bg-bg p-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium">
                        Organization name
                      </label>
                      <input
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.name}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        maxLength={120}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium">
                        Sponsorship package
                      </label>
                      <select
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.packageKey}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            packageKey: e.target.value,
                          }))
                        }
                      >
                        <option value="">— None —</option>
                        {packageOptions.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Point of contact
                      </label>
                      <input
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.contactName}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            contactName: e.target.value,
                          }))
                        }
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Contact email
                      </label>
                      <input
                        type="email"
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.contactEmail}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            contactEmail: e.target.value,
                          }))
                        }
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Contact phone
                      </label>
                      <input
                        type="tel"
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.contactPhone}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            contactPhone: e.target.value,
                          }))
                        }
                        maxLength={40}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Website
                      </label>
                      <input
                        type="url"
                        className="field-control mt-1.5 min-h-11 w-full"
                        value={editDraft.websiteUrl}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            websiteUrl: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium">
                        Staff notes
                      </label>
                      <textarea
                        className="field-control mt-1.5 min-h-24 w-full"
                        value={editDraft.contactNotes}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            contactNotes: e.target.value,
                          }))
                        }
                        maxLength={1000}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="btn-deep inline-flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-60"
                        onClick={() => void saveEdit(s.id)}
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : s.contact_notes ? (
                  <p className="text-sm text-muted whitespace-pre-wrap">
                    {s.contact_notes}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-end gap-2 border border-line bg-bg p-3">
                  <div>
                    <label className="block text-xs font-medium text-muted">
                      Amount owed ($)
                    </label>
                    <input
                      className="field-control mt-1 min-h-10 w-28"
                      inputMode="decimal"
                      placeholder={
                        s.amount_cents ? String(s.amount_cents / 100) : "250"
                      }
                      value={amountDrafts[s.id] ?? ""}
                      onChange={(e) =>
                        setAmountDrafts((d) => ({
                          ...d,
                          [s.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex min-h-10 items-center border border-line px-3 text-sm"
                    onClick={() =>
                      void payAction(
                        s.id,
                        "set_amount",
                        amountDrafts[s.id] ||
                          String(s.amount_cents / 100 || ""),
                        s.level_key || undefined,
                      )
                    }
                  >
                    Save amount / hide until paid
                  </button>
                  <button
                    type="button"
                    disabled={busy || !s.contact_email}
                    className="inline-flex min-h-10 items-center border border-line px-3 text-sm disabled:opacity-40"
                    onClick={() => void payAction(s.id, "send_invite")}
                    title={
                      !s.contact_email ? "Add contact email first" : undefined
                    }
                  >
                    Email pay link
                  </button>
                  {s.payment_status === "unpaid" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex min-h-10 items-center border border-line px-3 text-sm"
                        onClick={() => void payAction(s.id, "mark_paid")}
                      >
                        Mark paid (manual)
                      </button>
                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="block text-xs font-medium text-muted">
                            Package for check
                          </label>
                          <select
                            className="field-control mt-1 min-h-10 max-w-[14rem]"
                            value={
                              checkPackageDrafts[s.id] ?? s.level_key ?? ""
                            }
                            onChange={(e) =>
                              setCheckPackageDrafts((d) => ({
                                ...d,
                                [s.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">— Select package —</option>
                            {packageOptions.map((o) => (
                              <option key={o.key} value={o.key}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          className="btn-deep inline-flex min-h-10 items-center px-3 text-sm"
                          onClick={() =>
                            void payAction(
                              s.id,
                              "mark_paid_check",
                              undefined,
                              checkPackageDrafts[s.id] ||
                                s.level_key ||
                                undefined,
                            )
                          }
                        >
                          Mark paid by check
                        </button>
                      </div>
                    </>
                  ) : null}
                  {s.pay_token ? (
                    <a
                      href={`/sponsor/pay/${s.pay_token}`}
                      className="inline-flex min-h-10 items-center text-sm text-accent-ink underline underline-offset-4"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open pay page
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
