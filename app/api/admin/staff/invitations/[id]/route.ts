import { NextResponse } from "next/server"
import { clerkConfigured, requireAdmin } from "@/lib/auth"
import { revokeStaffInvitation } from "@/lib/staff-admin"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!clerkConfigured() || admin.viaPassword || admin.viaBypass) {
    return NextResponse.json(
      { error: "Sign in with Clerk as an admin to revoke invites." },
      { status: 403 },
    )
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: "Missing invitation id." }, { status: 400 })
  }

  try {
    await revokeStaffInvitation(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin staff invitation DELETE]", err)
    return NextResponse.json(
      { error: "Could not revoke invitation." },
      { status: 400 },
    )
  }
}
