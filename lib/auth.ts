import { auth, currentUser } from "@clerk/nextjs/server"

export type StaffUser = {
  userId: string
  email: string
  role: "admin"
  /** True when access comes from local/preview bypass, not Clerk. */
  viaBypass?: boolean
}

export function clerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  )
}

/**
 * Local / Preview admin without Clerk.
 * Requires `ADMIN_DEV_BYPASS=1` and never runs on Vercel Production.
 */
export function adminDevBypassEnabled(): boolean {
  if (process.env.ADMIN_DEV_BYPASS !== "1") return false
  if (process.env.VERCEL_ENV === "production") return false
  return (
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "preview"
  )
}

/** Clerk is ready, or safe dev bypass is on. */
export function adminAvailable(): boolean {
  return clerkConfigured() || adminDevBypassEnabled()
}

const bypassStaff: StaffUser = {
  userId: "dev-bypass",
  email: "dev-bypass@local",
  role: "admin",
  viaBypass: true,
}

export async function requireAdmin(): Promise<StaffUser> {
  if (adminDevBypassEnabled()) {
    return bypassStaff
  }

  if (!clerkConfigured()) {
    throw new Error("Clerk is not configured. Set Clerk keys to use admin.")
  }

  const session = await auth()
  if (!session.userId) {
    throw new Error("Unauthorized")
  }

  const user = await currentUser()
  const role = (user?.publicMetadata?.role as string | undefined) ?? ""
  if (role !== "admin") {
    throw new Error("Forbidden")
  }

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    session.userId

  return { userId: session.userId, email, role: "admin" }
}

export async function getAdminOrNull(): Promise<StaffUser | null> {
  try {
    return await requireAdmin()
  } catch {
    return null
  }
}
