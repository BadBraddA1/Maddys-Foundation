"use client"

import { useMemo, useState } from "react"
import type { StaffInvitation, StaffMember } from "@/lib/staff-admin"

type Props = {
  initialUsers: StaffMember[]
  initialInvitations: StaffInvitation[]
  currentUserId: string
}

export function StaffAdminPanel({
  initialUsers,
  initialInvitations,
  currentUserId,
}: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)

  const admins = useMemo(
    () => users.filter((u) => u.role === "admin"),
    [users],
  )
  const others = useMemo(
    () => users.filter((u) => u.role !== "admin"),
    [users],
  )

  async function refresh() {
    const res = await fetch("/api/admin/staff")
    const data = (await res.json()) as {
      users?: StaffMember[]
      invitations?: StaffInvitation[]
      error?: string
    }
    if (!res.ok) throw new Error(data.error || "Refresh failed.")
    if (data.users) setUsers(data.users)
    if (data.invitations) setInvitations(data.invitations)
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    setLastInviteUrl(null)
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as {
        invitation?: StaffInvitation
        message?: string
        error?: string
      }
      if (!res.ok) throw new Error(data.error || "Invite failed.")
      setMessage(data.message || "Invite sent.")
      setLastInviteUrl(data.invitation?.url || null)
      setEmail("")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed.")
    } finally {
      setBusy(false)
    }
  }

  async function setRole(userId: string, role: "admin" | "") {
    if (busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/staff/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error || "Could not update role.")
      setMessage(data.message || "Updated.")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role.")
    } finally {
      setBusy(false)
    }
  }

  async function revokeInvite(id: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/staff/invitations/${id}`, {
        method: "DELETE",
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || "Could not revoke invite.")
      setMessage("Invitation revoked.")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke invite.")
    } finally {
      setBusy(false)
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setMessage("Invite link copied.")
    } catch {
      setError("Could not copy link — select it manually.")
    }
  }

  return (
    <div className="space-y-12">
      <section className="max-w-xl space-y-4">
        <h2 className="font-display text-2xl">Invite staff</h2>
        <p className="text-sm text-muted">
          Clerk emails them an invite. When they accept and sign up, they
          automatically get <code className="text-ink">role: admin</code>. You
          can also copy the invite link to share yourself.
        </p>
        <form onSubmit={onInvite} className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="invite-email">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="field-control min-h-11 flex-1"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="btn-deep inline-flex min-h-11 items-center justify-center px-5 text-sm font-medium disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </form>
        {lastInviteUrl ? (
          <div className="rounded-lg border border-line bg-surface p-4 text-sm">
            <p className="font-medium text-ink">Invite link</p>
            <p className="mt-2 break-all text-muted">{lastInviteUrl}</p>
            <button
              type="button"
              onClick={() => void copyUrl(lastInviteUrl)}
              className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Copy link
            </button>
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-medium text-accent-ink" role="status">
          {message}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Pending invites</h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted">No pending invites.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">{inv.email}</p>
                  <p className="text-sm text-muted">Pending · admin on accept</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm font-medium">
                  {inv.url ? (
                    <button
                      type="button"
                      onClick={() => void copyUrl(inv.url!)}
                      className="inline-flex min-h-11 items-center underline underline-offset-4"
                      disabled={busy}
                    >
                      Copy link
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void revokeInvite(inv.id)}
                    className="inline-flex min-h-11 items-center text-danger underline underline-offset-4"
                    disabled={busy}
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Admins</h2>
        <ul className="divide-y divide-line border-t border-line">
          {admins.map((user) => (
            <li
              key={user.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-ink">
                  {user.name}{" "}
                  {user.id === currentUserId ? (
                    <span className="text-sm font-normal text-muted">(you)</span>
                  ) : null}
                </p>
                <p className="text-sm text-muted">{user.email || user.id}</p>
              </div>
              {user.id === currentUserId ? (
                <span className="text-sm text-muted">Current admin</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void setRole(user.id, "")}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-danger underline underline-offset-4"
                  disabled={busy}
                >
                  Remove admin
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Signed-up users</h2>
        <p className="text-sm text-muted">
          People who already created a Clerk account — grant admin here without
          a new invite.
        </p>
        {others.length === 0 ? (
          <p className="text-sm text-muted">No other signed-up users yet.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {others.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">{user.name}</p>
                  <p className="text-sm text-muted">{user.email || user.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void setRole(user.id, "admin")}
                  className="btn-deep inline-flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-60"
                  disabled={busy}
                >
                  Make admin
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
