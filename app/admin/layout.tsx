import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { clerkConfigured, getAdminOrNull } from "@/lib/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!clerkConfigured()) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24">
        <h1 className="font-display text-3xl">Staff admin</h1>
        <p className="mt-4 text-muted">
          Clerk is not configured yet. Create a Clerk application, set{" "}
          <code className="text-ink">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
          <code className="text-ink">CLERK_SECRET_KEY</code> in Vercel /{" "}
          <code className="text-ink">.env.local</code>, then set{" "}
          <code className="text-ink">publicMetadata.role = &quot;admin&quot;</code>{" "}
          on your user.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-semibold underline">
          ← Home
        </Link>
      </div>
    )
  }

  const admin = await getAdminOrNull()

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-display text-lg">
              Staff
            </Link>
            <Link href="/" className="text-sm text-muted hover:text-ink">
              View site
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {admin ? (
              <span className="text-xs text-muted">{admin.email}</span>
            ) : (
              <span className="text-xs text-red-700">
                Signed in, but role is not admin
              </span>
            )}
            <UserButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-10">{children}</div>
    </div>
  )
}
