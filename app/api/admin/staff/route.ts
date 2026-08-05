import { NextResponse } from "next/server"
import { clerkConfigured, requireAdmin } from "@/lib/auth"
import {
  inviteStaffAdmin,
  listPendingInvitations,
  listStaffMembers,
} from "@/lib/staff-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!clerkConfigured()) {
    return NextResponse.json(
      { error: "Clerk is not configured." },
      { status: 503 },
    )
  }

  try {
    const [users, invitations] = await Promise.all([
      listStaffMembers(),
      listPendingInvitations(),
    ])
    return NextResponse.json({ users, invitations })
  } catch (err) {
    console.error("[admin staff GET]", err)
    return NextResponse.json(
      { error: "Could not load staff list." },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!clerkConfigured() || admin.viaPassword || admin.viaBypass) {
    return NextResponse.json(
      { error: "Sign in with Clerk as an admin to invite staff." },
      { status: 403 },
    )
  }

  let body: { email?: string }
  try {
    body = (await req.json()) as { email?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  try {
    const invitation = await inviteStaffAdmin(body.email ?? "")
    return NextResponse.json({
      invitation,
      message: `Invite sent to ${invitation.email}. They’ll get admin when they accept.`,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create invitation."
    console.error("[admin staff POST]", err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
