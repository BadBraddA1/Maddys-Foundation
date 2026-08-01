import Link from "next/link"

export function LoadError({
  title = "Something went wrong",
  message = "We couldn’t load this right now. Please refresh and try again.",
}: {
  title?: string
  message?: string
}) {
  return (
    <div
      className="mt-10 border border-danger/30 bg-danger/5 px-5 py-5"
      role="alert"
    >
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <Link
        href="/"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline underline-offset-4"
      >
        Back home
      </Link>
    </div>
  )
}

export function EmptyEvents() {
  return (
    <div className="mt-12 max-w-lg">
      <p className="text-muted">
        No published events yet. Check back soon — or reach out if you&apos;re
        planning a gathering with the foundation.
      </p>
      <Link
        href="/story"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline underline-offset-4"
      >
        Read Maddy&apos;s story
      </Link>
    </div>
  )
}
