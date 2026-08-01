"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function StaffLogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)
    try {
      await fetch("/api/admin/logout", { method: "POST" })
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4 hover:text-ink disabled:opacity-60"
    >
      {pending ? "…" : "Sign out"}
    </button>
  )
}
