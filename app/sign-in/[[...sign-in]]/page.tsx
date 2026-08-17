import { SignIn } from "@clerk/nextjs"
import { StaffAuthShell } from "@/components/staff-auth-shell"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { clerkConfigured } from "@/lib/auth"

export default function SignInPage() {
  return (
    <StaffAuthShell
      title="Staff sign-in"
      description="Use your staff email and password to open the admin desk."
      altHref="/sign-up"
      altLabel="Need an account? Sign up"
    >
      {clerkConfigured() ? (
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/admin"
          fallbackRedirectUrl="/admin"
          appearance={clerkAppearance}
        />
      ) : null}
    </StaffAuthShell>
  )
}
