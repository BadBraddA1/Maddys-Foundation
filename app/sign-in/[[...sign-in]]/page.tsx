import { SignIn } from "@clerk/nextjs"
import Link from "next/link"
import { StaffPasswordForm } from "@/components/admin/staff-password-form"
import { clerkConfigured } from "@/lib/auth"
import { staffPasswordConfigured } from "@/lib/staff-password"

export default function SignInPage() {
  const clerk = clerkConfigured()
  const password = staffPasswordConfigured()

  if (!clerk && !password) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-3xl">Sign in</h1>
        <p className="mt-4 text-muted">Staff access is not configured yet.</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline underline-offset-4"
        >
          ← Home
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-5 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Madalyn Robinson Foundation
        </p>
        <h1 className="mt-2 font-display text-3xl">Staff sign-in</h1>
        <p className="mt-3 text-sm text-muted">
          Sign in with your Clerk account to open the admin desk.
        </p>
      </div>

      {clerk ? (
        <SignIn
          routing="path"
          path="/sign-in"
          forceRedirectUrl="/admin"
          fallbackRedirectUrl="/admin"
        />
      ) : null}

      {password ? (
        <div className="w-full max-w-sm border-t border-line pt-8">
          <p className="text-center text-sm text-muted">
            Emergency fallback — staff password
          </p>
          <StaffPasswordForm redirectTo="/admin" />
        </div>
      ) : null}

      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4 hover:text-ink"
      >
        ← Home
      </Link>
    </div>
  )
}
