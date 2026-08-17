import { SignUp } from "@clerk/nextjs"
import { StaffAuthShell } from "@/components/staff-auth-shell"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { clerkConfigured } from "@/lib/auth"

export default function SignUpPage() {
  return (
    <StaffAuthShell
      title="Create staff account"
      description="Prefer an invite from an existing admin — that grants access automatically. Use this only if you already have an invite, or someone will promote you afterward."
      altHref="/sign-in"
      altLabel="Already have an account? Sign in"
    >
      {clerkConfigured() ? (
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/admin"
          fallbackRedirectUrl="/admin"
          appearance={clerkAppearance}
        />
      ) : null}
    </StaffAuthShell>
  )
}
