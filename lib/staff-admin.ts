import { clerkClient } from "@clerk/nextjs/server"
import { audit } from "@/lib/audit"
import { siteUrl } from "@/lib/site-metadata"

export type StaffRole = "admin" | ""

export type StaffMember = {
  id: string
  email: string
  name: string
  role: StaffRole
  createdAt: number
}

export type StaffInvitation = {
  id: string
  email: string
  status: string
  url: string | null
  createdAt: number
}

function primaryEmail(user: {
  primaryEmailAddress?: { emailAddress: string } | null
  emailAddresses?: { emailAddress: string }[]
}): string {
  return (
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    ""
  )
}

function displayName(user: {
  firstName?: string | null
  lastName?: string | null
  username?: string | null
}): string {
  const parts = [user.firstName, user.lastName].filter(Boolean)
  if (parts.length) return parts.join(" ")
  return user.username || "—"
}

function roleFromMeta(meta: Record<string, unknown> | undefined): StaffRole {
  return meta?.role === "admin" ? "admin" : ""
}

export async function listStaffMembers(): Promise<StaffMember[]> {
  const client = await clerkClient()
  const result = await client.users.getUserList({
    limit: 100,
    orderBy: "-created_at",
  })

  return result.data.map((user) => ({
    id: user.id,
    email: primaryEmail(user),
    name: displayName(user),
    role: roleFromMeta(user.publicMetadata as Record<string, unknown>),
    createdAt: user.createdAt,
  }))
}

export async function listPendingInvitations(): Promise<StaffInvitation[]> {
  const client = await clerkClient()
  const result = await client.invitations.getInvitationList({
    status: "pending",
    limit: 100,
  })

  return result.data.map((inv) => ({
    id: inv.id,
    email: inv.emailAddress,
    status: inv.status,
    url: inv.url ?? null,
    createdAt: inv.createdAt,
  }))
}

export async function inviteStaffAdmin(
  emailAddress: string,
  actorEmail: string,
): Promise<StaffInvitation> {
  const email = emailAddress.trim().toLowerCase()
  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.")
  }

  const client = await clerkClient()
  const invitation = await client.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${siteUrl}/sign-up`,
    publicMetadata: { role: "admin" },
    notify: true,
    ignoreExisting: false,
  })

  await audit(actorEmail, "invite_staff", "invitation", invitation.id, email)

  return {
    id: invitation.id,
    email: invitation.emailAddress,
    status: invitation.status,
    url: invitation.url ?? null,
    createdAt: invitation.createdAt,
  }
}

export async function revokeStaffInvitation(
  invitationId: string,
  actorEmail: string,
): Promise<void> {
  const client = await clerkClient()
  await client.invitations.revokeInvitation(invitationId)
  await audit(actorEmail, "revoke_invite", "invitation", invitationId, "")
}

export async function setStaffRole(
  userId: string,
  role: StaffRole,
  actorUserId: string,
  actorEmail: string,
): Promise<StaffMember> {
  if (userId === actorUserId && role !== "admin") {
    throw new Error("You can’t remove your own admin role.")
  }

  const client = await clerkClient()
  const existing = await client.users.getUser(userId)
  const nextMeta = {
    ...(existing.publicMetadata as Record<string, unknown>),
  }
  if (role === "admin") {
    nextMeta.role = "admin"
  } else {
    delete nextMeta.role
  }

  const updated = await client.users.updateUser(userId, {
    publicMetadata: nextMeta,
  })

  const member: StaffMember = {
    id: updated.id,
    email: primaryEmail(updated),
    name: displayName(updated),
    role: roleFromMeta(updated.publicMetadata as Record<string, unknown>),
    createdAt: updated.createdAt,
  }

  await audit(
    actorEmail,
    role === "admin" ? "grant_admin" : "revoke_admin",
    "user",
    userId,
    member.email || member.name,
  )

  return member
}
