"use client"

import { useState } from "react"

type Props = {
  eventId: number
  registrationId: number
}

export function ResendConfirmationButton({
  eventId,
  registrationId,
}: Props) {
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function resend() {
    if (pending) return
    setPending(true)
    setMsg(null)
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/registrations/${registrationId}/resend-confirmation`,
        { method: "POST" },
      )
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setMsg(data.error || "Send failed")
        return
      }
      setMsg("Sent")
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={resend}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline underline-offset-4 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Resend confirmation"}
      </button>
      {msg ? <span className="text-xs text-muted">{msg}</span> : null}
    </span>
  )
}
