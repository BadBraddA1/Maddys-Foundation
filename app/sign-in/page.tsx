import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"
import { authConfig } from "@/lib/auth-config"
import { clerkConfigured } from "@/lib/auth"

export const metadata: Metadata = {
  title: `Sign In — ${authConfig.siteName}`,
  description: authConfig.copy.signInSubtitle,
}

export default function SignInPage() {
  return (
    <AuthShell
      title={authConfig.copy.signInTitle}
      subtitle={authConfig.copy.signInSubtitle}
      altPrompt="New here?"
      altHref={authConfig.signUpUrl}
      altLabel="Create an account"
    >
      {/* Keyless envs (local/CI without Clerk) render the shell without the form. */}
      {clerkConfigured() ? <SignInForm /> : null}
    </AuthShell>
  )
}
