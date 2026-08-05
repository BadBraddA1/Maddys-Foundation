"use client"

import { useRouter } from "next/navigation"
import { useId, useState } from "react"

export function StaffPasswordForm({
  redirectTo = "/admin",
}: {
  redirectTo?: string
}) {
  const formId = useId()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not sign in.")
        return
      }
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError("Network error. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-sm space-y-4">
      <div>
        <label htmlFor={formId} className="block text-sm font-medium text-ink">
          Staff password
        </label>
        <input
          id={formId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-control"
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="btn-deep inline-flex min-h-11 items-center px-6 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Checking…" : "Enter admin"}
      </button>
    </form>
  )
}
