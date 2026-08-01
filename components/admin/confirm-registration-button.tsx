"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  eventId: number
  registrationId: number
  alreadyConfirmed: boolean
}

export function ConfirmRegistrationButton({
  eventId,
  registrationId,
  alreadyConfirmed,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  if (alreadyConfirmed) return null

  async function confirm() {
    if (pending) return
    setPending(true)
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/registrations/${registrationId}/confirm`,
        { method: "POST" },
      )
      if (!res.ok) return
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={confirm}
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline underline-offset-4 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Mark paid / confirm"}
    </button>
  )
}
