"use client"

import Link from "next/link"
import { useId, useState } from "react"
import { formatUsdFromCents } from "@/lib/sponsor-levels"

type Props = {
  token: string
  name: string
  levelLabel: string
  amountCents: number
  contactEmail: string
  alreadyComplete: boolean
  paidFlag: boolean
  uploadReady: boolean
}

export function SponsorCompleteForm(props: Props) {
  const formId = useId()
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState(props.contactEmail)
  const [contactPhone, setContactPhone] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(props.alreadyComplete)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy || done) return
    setBusy(true)
    setError(null)

    const form = e.currentTarget
    const fileInput = form.elements.namedItem("logo") as HTMLInputElement
    const file = fileInput.files?.[0]
    if (!file) {
      setError("Please choose a logo file.")
      setBusy(false)
      return
    }

    const body = new FormData()
    body.set("token", props.token)
    body.set("contactName", contactName)
    body.set("contactEmail", contactEmail)
    body.set("contactPhone", contactPhone)
    body.set("websiteUrl", websiteUrl)
    body.set("logo", file)

    try {
      const res = await fetch("/api/sponsor/complete", {
        method: "POST",
        body,
      })
      const data = (await res.json()) as { error?: string; ok?: boolean }
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save your details.")
        return
      }
      setDone(true)
    } catch {
      setError("Could not save your details.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div
        className="border border-success/30 bg-success/5 px-6 py-8"
        role="status"
      >
        <h1 className="font-display text-3xl text-ink">You’re on the site</h1>
        <p className="mt-3 text-sm text-ink/75">
          Thank you, {props.name}. Your logo is publishing on the foundation
          site
          {props.levelLabel ? ` as ${props.levelLabel}` : ""}.
        </p>
        <Link
          href="/"
          className="motion-press mt-6 inline-flex min-h-11 items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink"
        >
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {props.paidFlag ? (
        <p
          className="border border-success/30 bg-success/5 px-5 py-4 text-sm text-ink/75"
          role="status"
        >
          Payment received
          {props.amountCents > 0
            ? ` (${formatUsdFromCents(props.amountCents)})`
            : ""}
          . Add your logo and contact so we can feature you.
        </p>
      ) : null}

      <div>
        <h1 className="font-display text-3xl text-ink">Finish your profile</h1>
        <p className="mt-2 text-sm text-muted">
          {props.name}
          {props.levelLabel ? ` · ${props.levelLabel}` : ""}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
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
            Contact email
          </label>
          <input
            id={`${formId}-email`}
            name="contactEmail"
            type="email"
            maxLength={200}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
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
          />
          <p className="mt-1.5 text-xs text-muted">
            JPEG, PNG, WebP, GIF, or SVG · under 8 MB
          </p>
        </div>

        <button
          type="submit"
          disabled={busy || !props.uploadReady}
          className="motion-press inline-flex min-h-11 w-full items-center justify-center bg-accent px-8 text-sm font-medium text-accent-ink disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Publishing…" : "Publish my sponsorship"}
        </button>
        {!props.uploadReady ? (
          <p className="text-sm text-muted">
            Logo upload is temporarily offline — please try again shortly.
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}
