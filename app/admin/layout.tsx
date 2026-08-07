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
            Staff access is not configured. Set Clerk keys (
            <code className="text-ink">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
            + <code className="text-ink">CLERK_SECRET_KEY</code>).
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
  const clerk = clerkConfigured()

  if (!admin) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24">
        <SkipLink />
        <main id="main">
          <h1 className="font-display text-3xl">Staff admin</h1>
          <p className="mt-4 text-muted">
            Sign in with Clerk, then make sure your user has{" "}
            <code className="text-ink">publicMetadata.role = &quot;admin&quot;</code>{" "}
            in the Clerk Dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-in?redirect_url=/admin"
              className="btn-deep inline-flex min-h-11 items-center px-6 text-sm font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex min-h-11 items-center border border-line bg-surface px-6 text-sm font-medium text-ink"
            >
              Sign up
            </Link>
          </div>
          <Link
            href="/"
            className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4 hover:text-ink"
          >
            ← Home
          </Link>
        </main>
      </div>
    )
  }

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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2 md:gap-4 md:px-5 md:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto md:gap-4">
            <Link href="/admin" className="shrink-0 font-display text-lg">
              Staff
            </Link>
            <Link
              href="/"
              className="hidden shrink-0 items-center text-sm text-muted hover:text-ink sm:inline-flex sm:min-h-11"
            >
              View site
            </Link>
            <Link
              href="/admin/check-in"
              className="inline-flex min-h-9 shrink-0 items-center text-sm font-medium text-ink md:min-h-11"
            >
              Check-in
            </Link>
            <Link
              href="/admin/sponsors"
              className="hidden shrink-0 items-center text-sm text-muted hover:text-ink md:inline-flex md:min-h-11"
            >
              Sponsors
            </Link>
            <Link
              href="/admin/gallery"
              className="hidden shrink-0 items-center text-sm text-muted hover:text-ink md:inline-flex md:min-h-11"
            >
              Gallery
            </Link>
            <Link
              href="/admin/email"
              className="hidden shrink-0 items-center text-sm text-muted hover:text-ink md:inline-flex md:min-h-11"
            >
              Email
            </Link>
            <Link
              href="/admin/staff"
              className="hidden shrink-0 items-center text-sm text-muted hover:text-ink md:inline-flex md:min-h-11"
            >
              Staff
            </Link>
            <Link
              href="/admin/audit"
              className="hidden shrink-0 items-center text-sm text-muted hover:text-ink md:inline-flex md:min-h-11"
            >
              Audit
            </Link>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-3">
            <span className="hidden truncate text-sm text-muted sm:inline">
              {admin.email}
            </span>
            {clerk && !bypass && !admin.viaPassword ? <UserButton /> : null}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-3 py-4 md:px-5 md:py-10">
        {children}
      </main>
    </div>
  )
}
