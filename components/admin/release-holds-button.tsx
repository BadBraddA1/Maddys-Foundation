"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  eventId: number
  heldCount: number
}

export function ReleaseHoldsButton({ eventId, heldCount }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (heldCount <= 0) return null

  async function release() {
    if (pending) return
    const ok = window.confirm(
      `Release ${heldCount} unpaid hold${heldCount === 1 ? "" : "s"}?\n\n` +
        "This clears open registration timers and pending checkouts so those spots return to the pool. Paid teams are not affected.",
    )
    if (!ok) return

    setPending(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/release-holds`, {
        method: "POST",
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        total?: number
        formHolds?: number
        pendingCheckouts?: number
      }
      if (!res.ok) {
        setMessage(data.error || "Could not release holds.")
        return
      }
      setMessage(
        `Released ${data.total ?? 0} hold${(data.total ?? 0) === 1 ? "" : "s"}` +
          (data.formHolds || data.pendingCheckouts
            ? ` (${data.formHolds ?? 0} form · ${data.pendingCheckouts ?? 0} checkout)`
            : ""),
      )
      router.refresh()
    } catch {
      setMessage("Network error. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => void release()}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-11 items-center border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-bg disabled:opacity-60"
      >
        {pending
          ? "Releasing…"
          : `Release ${heldCount} unpaid hold${heldCount === 1 ? "" : "s"}`}
      </button>
      {message ? (
        <p className="mt-2 text-sm text-muted" role="status">
          {message}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Clears form timers and unpaid checkouts. Paid registrations stay.
        </p>
      )}
    </div>
  )
}
