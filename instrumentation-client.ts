import * as Sentry from "@sentry/nextjs"
import posthog from "posthog-js"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
  integrations: [Sentry.replayIntegration()],
})

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2026-05-30",
    capture_exceptions: false,
    capture_pageview: "history_change",
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    debug: process.env.NODE_ENV === "development",
  })
  posthog.register({ product: "maddys-foundation" })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
