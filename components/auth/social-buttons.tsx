"use client"

import { useSignIn } from "@clerk/nextjs"
import { authConfig, type SocialProvider } from "@/lib/auth-config"

const LABELS: Record<SocialProvider, string> = {
  oauth_google: "Continue with Google",
  oauth_apple: "Continue with Apple",
}

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "oauth_google") {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="currentColor">
        <path d="M8.32 7.28v2.187h5.227c-.16 1.226-.57 2.124-1.192 2.755-.764.765-1.955 1.6-4.035 1.6-3.218 0-5.733-2.595-5.733-5.813 0-3.218 2.515-5.814 5.733-5.814 1.733 0 3.005.685 3.938 1.565l1.538-1.538C12.498.96 10.756 0 8.32 0 3.91 0 .205 3.591.205 8s3.706 8 8.115 8c2.382 0 4.178-.782 5.582-2.24 1.44-1.44 1.893-3.475 1.893-5.111 0-.507-.035-.978-.115-1.369H8.32Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="currentColor">
      <path d="M12.152 8.502c-.008-1.446.646-2.536 1.968-3.34-.74-1.059-1.858-1.641-3.334-1.754-1.397-.11-2.925.814-3.484.814-.591 0-1.945-.776-3.009-.776C2.096 3.48 0 5.199 0 8.697c0 1.034.189 2.102.567 3.203.505 1.447 2.325 4.993 4.224 4.936 .993-.024 1.695-.705 2.987-.705 1.253 0 1.903.705 3.01.705 1.916-.028 3.562-3.251 4.042-4.702-2.57-1.211-2.678-3.549-2.678-3.632ZM9.923 2.037C10.998.762 10.9-.4 10.868-.818c-.949.055-2.047.646-2.672 1.373-.689.78-1.094 1.744-1.007 2.831 1.026.079 1.962-.449 2.734-1.35Z" />
    </svg>
  )
}

/**
 * OAuth buttons + divider. Renders nothing when no providers are configured.
 * The same buttons also sign UP new users — Clerk transfers the attempt
 * in the /sso-callback route.
 */
export function SocialButtons() {
  const { signIn } = useSignIn()

  if (authConfig.socialProviders.length === 0) return null

  async function startSso(strategy: SocialProvider) {
    await signIn.sso({
      strategy,
      redirectCallbackUrl: authConfig.ssoCallbackUrl,
      redirectUrl: authConfig.afterSignInUrl,
    })
  }

  return (
    <>
      <div className="ba-social">
        {authConfig.socialProviders.map((provider) => (
          <button
            key={provider}
            type="button"
            className="ba-social-button"
            onClick={() => startSso(provider)}
          >
            <ProviderIcon provider={provider} />
            {LABELS[provider]}
          </button>
        ))}
      </div>
      <div className="ba-divider">or</div>
    </>
  )
}
