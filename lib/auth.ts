import { auth, currentUser } from "@clerk/nextjs/server"

export type StaffUser = {
  userId: string
  email: string
  role: "admin"
}

export function clerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  )
}

export async function requireAdmin(): Promise<StaffUser> {
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
