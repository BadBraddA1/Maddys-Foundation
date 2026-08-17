/**
 * `errors.global` changed shape across @clerk/nextjs v7 minors
 * (array of ClerkError → single ClerkError | null). Normalize to one-or-null.
 */
export function globalAuthError(errors: {
  global: unknown
}): { message: string; longMessage?: string } | null {
  const g = errors.global as
    | { message: string; longMessage?: string }
    | { message: string; longMessage?: string }[]
    | null
    | undefined
  if (!g) return null
  return Array.isArray(g) ? (g[0] ?? null) : g
}

/**
 * True when a Clerk error (single error or API response with an errors
 * array) carries the given machine-stable code, e.g.
 * "form_identifier_not_found" for an unknown sign-in email.
 */
export function authErrorHasCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== "object") return false
  if ((error as { code?: string }).code === code) return true
  const nested = (error as { errors?: { code?: string }[] }).errors
  return Array.isArray(nested) && nested.some((e) => e?.code === code)
}

/**
 * Shared `finalize({ navigate })` handler for Clerk Core 3 flows.
 * Session tasks pause navigation (Clerk renders its own task UI).
 *
 * Always a FULL navigation, never router.push(): the next request must
 * carry the just-written session cookie. A client-side push can race the
 * cookie write, so protected-route middleware sees a signed-out request
 * and bounces the user back to /sign-in even though sign-in succeeded.
 */
export function afterAuth(destination: string) {
  return async ({
    session,
    decorateUrl,
  }: {
    session: { currentTask?: unknown } | null | undefined
    decorateUrl: (url: string) => string
  }) => {
    if (session?.currentTask) return
    window.location.assign(decorateUrl(destination))
  }
}
