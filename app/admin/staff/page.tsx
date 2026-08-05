import Link from "next/link"
import { clerkConfigured, getAdminOrNull } from "@/lib/auth"
import {
  listPendingInvitations,
  listStaffMembers,
} from "@/lib/staff-admin"
import { StaffAdminPanel } from "@/components/admin/staff-admin-panel"

export const dynamic = "force-dynamic"

export default async function AdminStaffPage() {
  const admin = await getAdminOrNull()
  if (!admin) return null

  if (!clerkConfigured() || admin.viaPassword || admin.viaBypass) {
    return (
      <div>
        <h1 className="font-display text-3xl">Staff & invites</h1>
        <p className="mt-4 text-muted">
          Sign in with a Clerk admin account to invite people and manage roles.
        </p>
        <Link
          href="/sign-in?redirect_url=/admin/staff"
          className="btn-deep mt-8 inline-flex min-h-11 items-center px-6 text-sm font-medium"
        >
          Sign in with Clerk
        </Link>
      </div>
    )
  }

  let users: Awaited<ReturnType<typeof listStaffMembers>> = []
  let invitations: Awaited<ReturnType<typeof listPendingInvitations>> = []
  let loadError: string | null = null
  try {
    ;[users, invitations] = await Promise.all([
      listStaffMembers(),
      listPendingInvitations(),
    ])
  } catch (err) {
    console.error("[admin/staff]", err)
    loadError = "Could not load Clerk users. Check Clerk keys and try again."
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="font-display text-3xl">Staff & invites</h1>
        <p className="mt-2 text-sm text-muted">
          Invite new admins by email, copy shareable invite links, or promote
          people who already signed up.
        </p>
      </div>
      {loadError ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {loadError}
        </p>
      ) : (
        <StaffAdminPanel
          initialUsers={users}
          initialInvitations={invitations}
          currentUserId={admin.userId}
        />
      )}
    </div>
  )
}
