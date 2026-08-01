"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = { eventId: number }

export function SyncPlayersButton({ eventId }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function sync() {
    if (pending) return
    setPending(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/sync-players`, {
        method: "POST",
      })
      const data = (await res.json()) as {
        error?: string
        registrations?: number
        playersCreated?: number
      }
      if (!res.ok) {
        setMessage(data.error || "Sync failed.")
        return
      }
      setMessage(
        `Synced ${data.registrations ?? 0} teams · created ${data.playersCreated ?? 0} players`,
      )
      router.refresh()
    } catch {
      setMessage("Network error.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pending}
        className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 disabled:opacity-60"
        onClick={() => void sync()}
      >
        {pending ? "Syncing…" : "Sync players from roster notes"}
      </button>
      {message ? (
        <p className="mt-1 text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
