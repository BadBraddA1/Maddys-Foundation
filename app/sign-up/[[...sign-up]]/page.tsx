import { SignUp } from "@clerk/nextjs"
import Link from "next/link"
import { clerkConfigured } from "@/lib/auth"

export default function SignUpPage() {
  if (!clerkConfigured()) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-3xl">Sign up</h1>
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
        <h1 className="mt-2 font-display text-3xl">Create staff account</h1>
        <p className="mt-3 text-sm text-muted">
          Prefer an invite from an existing admin — that grants access
          automatically. Open sign-up only if you already have an invite email
          or someone will promote you afterward.
        </p>
      </div>

      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/admin"
        fallbackRedirectUrl="/admin"
      />

      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4 hover:text-ink"
      >
        ← Home
      </Link>
    </div>
  )
}
