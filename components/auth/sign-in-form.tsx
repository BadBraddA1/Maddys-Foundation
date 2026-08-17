"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth, useSignIn } from "@clerk/nextjs"
import { authConfig } from "@/lib/auth-config"
import { afterAuth, authErrorHasCode, globalAuthError } from "@/lib/after-auth"
import { AuthPending } from "./auth-pending"
import { SocialButtons } from "./social-buttons"

/**
 * Identifier-first sign-in, like Clerk's widget (Core 3 SignInFuture API):
 *
 * 1. email step — signIn.create({ identifier }) looks the account up
 * 2. password step — greets the matched user by name ("Welcome back, Adin")
 * 3. code step — Device Trust (`needs_client_trust`) or email-code MFA
 *
 * Forgot password lives at its own route (authConfig.forgotPasswordUrl).
 */
export function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)
  const [handoff, setHandoff] = useState(false)
  const busy = fetchStatus === "fetching"
  const globalErr = globalAuthError(errors)
  const finish = () => {
    setRedirecting(true)
    return signIn.finalize({ navigate: afterAuth(authConfig.afterSignInUrl) })
  }

  // Already signed in (or the session just activated): never show the form —
  // hard-navigate so the request carries the session cookie.
  useEffect(() => {
    if (isSignedIn) window.location.replace(authConfig.afterSignInUrl)
  }, [isSignedIn])

  // Hold the spinner until the browser actually leaves the page.
  if (redirecting || isSignedIn || signIn.status === "complete") {
    return <AuthPending label="Signing you in…" />
  }

  if (handoff) {
    return <AuthPending label="No account yet — let's create one…" />
  }

  async function handleEmail(formData: FormData) {
    const identifier = formData.get("email") as string
    // Looks up the account and populates signIn.userData for the greeting.
    const { error } = await signIn.create({ identifier })

    // Unknown email: don't show an error — take them to sign-up with the
    // email carried over so they're helped along instead of dead-ended.
    if (authErrorHasCode(error, "form_identifier_not_found")) {
      setHandoff(true)
      router.push(
        `${authConfig.signUpUrl}?email=${encodeURIComponent(identifier)}`
      )
    }
  }

  async function handlePassword(formData: FormData) {
    const password = formData.get("password") as string

    // No identifier param: continues the attempt created in handleEmail.
    const { error } = await signIn.password({ password })
    if (error) return

    if (signIn.status === "complete") {
      await finish()
    } else if (
      signIn.status === "needs_client_trust" ||
      signIn.status === "needs_second_factor"
    ) {
      // New device or MFA — email code is the default second-factor strategy.
      await signIn.mfa.sendEmailCode()
    }
  }

  async function handleCode(formData: FormData) {
    const code = formData.get("code") as string

    const { error } = await signIn.mfa.verifyEmailCode({ code })
    if (error) return

    if (signIn.status === "complete") await finish()
  }

  // Step 3: device-trust / MFA email code
  if (
    signIn.status === "needs_client_trust" ||
    signIn.status === "needs_second_factor"
  ) {
    return (
      <form action={handleCode} className="ba-form">
        <p className="ba-hint">
          We emailed you a code to confirm it&apos;s really you.
        </p>
        <div className="ba-field">
          <label htmlFor="code" className="ba-label">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            className="ba-input"
            aria-invalid={Boolean(errors.fields.code)}
          />
          {errors.fields.code && (
            <p className="ba-error">{errors.fields.code.message}</p>
          )}
        </div>
        {globalErr && (
          <p className="ba-error">{globalErr.longMessage ?? globalErr.message}</p>
        )}
        <button type="submit" className="ba-button" disabled={busy}>
          {busy ? "Verifying…" : "Verify"}
        </button>
        <button
          type="button"
          className="ba-link"
          onClick={() => signIn.mfa.sendEmailCode()}
        >
          Send a new code
        </button>
        <button type="button" className="ba-link" onClick={() => signIn.reset()}>
          Start over
        </button>
      </form>
    )
  }

  // Step 2: password, greeting the matched account by name
  if (signIn.status === "needs_first_factor") {
    const firstName = signIn.userData?.firstName

    return (
      <form action={handlePassword} className="ba-form">
        <p className="ba-greeting">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </p>
        <div className="ba-identity">
          {signIn.userData?.hasImage && signIn.userData?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar, unknown remote host
            <img
              src={signIn.userData.imageUrl}
              alt=""
              className="ba-avatar"
            />
          ) : null}
          <span className="ba-identity-email">{signIn.identifier}</span>
          <button
            type="button"
            className="ba-link"
            onClick={() => signIn.reset()}
          >
            Not you?
          </button>
        </div>
        <div className="ba-field">
          <div className="ba-label-row">
            <label htmlFor="password" className="ba-label">
              Password
            </label>
            <Link href={authConfig.forgotPasswordUrl} className="ba-link">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            className="ba-input"
            aria-invalid={Boolean(errors.fields.password)}
          />
          {errors.fields.password && (
            <p className="ba-error">{errors.fields.password.message}</p>
          )}
        </div>
        {globalErr && (
          <p className="ba-error">{globalErr.longMessage ?? globalErr.message}</p>
        )}
        <button type="submit" className="ba-button" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    )
  }

  // Step 1: email
  return (
    <>
      <SocialButtons />
      <form action={handleEmail} className="ba-form">
        <div className="ba-field">
          <label htmlFor="email" className="ba-label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="ba-input"
            aria-invalid={Boolean(errors.fields.identifier)}
          />
          {errors.fields.identifier && (
            <p className="ba-error">{errors.fields.identifier.message}</p>
          )}
        </div>
        {globalErr && (
          <p className="ba-error">{globalErr.longMessage ?? globalErr.message}</p>
        )}
        <button type="submit" className="ba-button" disabled={busy}>
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </>
  )
}
