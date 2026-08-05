import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { StaffLogoutButton } from "@/components/admin/staff-logout-button"
import { StaffPasswordForm } from "@/components/admin/staff-password-form"
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
    // With Clerk enabled, middleware normally sends you to /sign-in first.
    // This UI covers "signed in but not admin" and the no-Clerk password path.
    return (
      <div className="mx-auto max-w-xl px-5 py-24">
        <SkipLink />
        <main id="main">
          <h1 className="font-display text-3xl">Staff admin</h1>
          {clerk ? (
            <>
              <p className="mt-4 text-muted">
                Sign in with Clerk, then make sure your user has{" "}
                <code className="text-ink">publicMetadata.role = &quot;admin&quot;</code>{" "}
                in the Clerk Dashboard.
              </p>
              <Link
                href="/sign-in?redirect_url=/admin"
                className="btn-deep mt-8 inline-flex min-h-11 items-center px-6 text-sm font-medium"
              >
                Sign in with Clerk
              </Link>
              <details className="mt-10">
                <summary className="cursor-pointer text-sm text-muted">
                  Emergency staff password
                </summary>
                <StaffPasswordForm redirectTo="/admin" />
              </details>
            </>
          ) : (
            <>
              <p className="mt-4 text-muted">
                Enter the staff password to manage events.
              </p>
              <StaffPasswordForm redirectTo="/admin" />
            </>
          )}
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
      {admin.viaPassword ? (
        <div
          className="border-b border-accent bg-accent-soft px-5 py-2 text-center text-sm text-accent-ink"
          role="status"
        >
          Signed in with staff password — prefer Clerk for day-to-day staff access.
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
            <Link
              href="/admin/check-in"
              className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
            >
              Check-in
            </Link>
            <Link
              href="/admin/sponsors"
              className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
            >
              Sponsors
            </Link>
            <Link
              href="/admin/gallery"
              className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
            >
              Gallery
            </Link>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-sm text-muted">{admin.email}</span>
            {admin.viaPassword ? <StaffLogoutButton /> : null}
            {clerk && !bypass && !admin.viaPassword ? <UserButton /> : null}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-5 py-10">
        {children}
      </main>
    </div>
  )
}
