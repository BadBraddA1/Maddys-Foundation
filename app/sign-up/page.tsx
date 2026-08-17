import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { authConfig } from "@/lib/auth-config"
import { clerkConfigured } from "@/lib/auth"

export const metadata: Metadata = {
  title: `Sign Up — ${authConfig.siteName}`,
  description: authConfig.copy.signUpSubtitle,
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  // Sign-in hands off unknown emails here as ?email=… so the form is prefilled.
  const { email } = await searchParams

  return (
    <AuthShell
      title={authConfig.copy.signUpTitle}
      subtitle={authConfig.copy.signUpSubtitle}
      altPrompt="Already have an account?"
      altHref={authConfig.signInUrl}
      altLabel="Sign in"
    >
      {/* Keyless envs (local/CI without Clerk) render the shell without the form. */}
      {clerkConfigured() ? <SignUpForm prefillEmail={email} /> : null}
    </AuthShell>
  )
}
