import { SignIn } from "@clerk/nextjs"
import { clerkConfigured } from "@/lib/auth"

export default function SignInPage() {
  if (!clerkConfigured()) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-3xl">Sign in</h1>
        <p className="mt-4 text-muted">
          Configure Clerk keys to enable staff sign-in.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <SignIn />
    </div>
  )
}
