import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { SkipLink } from "@/components/skip-link"
import {
  adminAvailable,
  adminDevBypassEnabled,
  clerkConfigured,
  getAdminOrNull,
} from "@/lib/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!adminAvailable()) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24">
        <SkipLink />
        <main id="main">
          <h1 className="font-display text-3xl">Staff admin</h1>
          <p className="mt-4 text-muted">
            Clerk is not configured yet. Create a Clerk application, set{" "}
            <code className="text-ink">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
            <code className="text-ink">CLERK_SECRET_KEY</code> in Vercel /{" "}
            <code className="text-ink">.env.local</code>, then set{" "}
            <code className="text-ink">publicMetadata.role = &quot;admin&quot;</code>{" "}
            on your user.
          </p>
          <p className="mt-4 text-sm text-muted">
            For local testing without Clerk, set{" "}
            <code className="text-ink">ADMIN_DEV_BYPASS=1</code> in{" "}
            <code className="text-ink">.env.local</code> and restart{" "}
            <code className="text-ink">pnpm dev</code>.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline underline-offset-4"
          >
            ← Home
          </Link>
        </main>
      </div>
    )
  }

  const bypass = adminDevBypassEnabled()
  const admin = await getAdminOrNull()

  return (
    <div className="min-h-screen bg-bg">
      <SkipLink />
      {bypass ? (
        <div
          className="border-b border-accent bg-accent-soft px-5 py-2 text-center text-sm text-accent-ink"
          role="status"
        >
          Admin dev bypass is on — not for production. Remove{" "}
          <code className="font-medium">ADMIN_DEV_BYPASS</code> when done testing.
        </div>
      ) : null}
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-display text-lg">
              Staff
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
            >
              View site
            </Link>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {admin ? (
              <span className="truncate text-sm text-muted">{admin.email}</span>
            ) : (
              <span className="text-sm text-danger">
                Signed in, but role is not admin
              </span>
            )}
            {clerkConfigured() && !bypass ? <UserButton /> : null}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-5 py-10">
        {children}
      </main>
    </div>
  )
}
