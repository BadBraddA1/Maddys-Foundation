"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import { authConfig } from "@/lib/auth-config"
import { afterAuth, globalAuthError } from "@/lib/after-auth"
import { AuthPending } from "./auth-pending"

/**
 * Three-step password reset (Clerk Core 3 resetPasswordEmailCode API):
 * 1. email → send reset code
 * 2. verify code
 * 3. set new password → signed in
 */
export function ForgotPasswordForm() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const [codeSent, setCodeSent] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const busy = fetchStatus === "fetching"
  const globalErr = globalAuthError(errors)

  async function sendCode(formData: FormData) {
    const identifier = formData.get("email") as string

    const { error: createError } = await signIn.create({ identifier })
    if (createError) return

    const { error } = await signIn.resetPasswordEmailCode.sendCode()
    if (error) return

    setCodeSent(true)
  }

  async function verifyCode(formData: FormData) {
    const code = formData.get("code") as string
    await signIn.resetPasswordEmailCode.verifyCode({ code })
  }

  async function submitNewPassword(formData: FormData) {
    const password = formData.get("password") as string

    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    })
    if (error) return

    if (signIn.status === "complete") {
      setRedirecting(true)
      await signIn.finalize({
        navigate: afterAuth(authConfig.afterSignInUrl),
      })
    }
  }

  // Hold the spinner until the browser actually leaves the page.
  if (redirecting || signIn.status === "complete") {
    return <AuthPending label="Password saved — signing you in…" />
  }

  if (signIn.status === "needs_new_password") {
    return (
      <form action={submitNewPassword} className="ba-form">
        <div className="ba-field">
          <label htmlFor="password" className="ba-label">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
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
          {busy ? "Saving…" : "Set new password"}
        </button>
      </form>
    )
  }

  if (codeSent) {
    return (
      <form action={verifyCode} className="ba-form">
        <p className="ba-hint">Enter the reset code from your email.</p>
        <div className="ba-field">
          <label htmlFor="code" className="ba-label">
            Reset code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
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
          {busy ? "Verifying…" : "Verify code"}
        </button>
        <button
          type="button"
          className="ba-link"
          onClick={() => signIn.resetPasswordEmailCode.sendCode()}
        >
          Send a new code
        </button>
      </form>
    )
  }

  return (
    <form action={sendCode} className="ba-form">
      <div className="ba-field">
        <label htmlFor="email" className="ba-label">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
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
        {busy ? "Sending…" : "Send reset code"}
      </button>
    </form>
  )
}
