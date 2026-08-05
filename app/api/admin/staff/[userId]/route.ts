import { NextResponse } from "next/server"
import { clerkConfigured, requireAdmin } from "@/lib/auth"
import { setStaffRole, type StaffRole } from "@/lib/staff-admin"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ userId: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!clerkConfigured() || admin.viaPassword || admin.viaBypass) {
    return NextResponse.json(
      { error: "Sign in with Clerk as an admin to manage roles." },
      { status: 403 },
    )
  }

  const { userId } = await ctx.params
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 })
  }

  let body: { role?: string }
  try {
    body = (await req.json()) as { role?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const role: StaffRole = body.role === "admin" ? "admin" : ""

  try {
    const user = await setStaffRole(userId, role, admin.userId, admin.email)
    return NextResponse.json({
      user,
      message:
        role === "admin"
          ? `${user.email || user.name} is now an admin.`
          : `Admin role removed for ${user.email || user.name}.`,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update role."
    console.error("[admin staff PATCH]", err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
