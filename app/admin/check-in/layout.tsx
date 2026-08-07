import Link from "next/link"

/**
 * Tighter chrome for day-of check-in on phones (less scroll to reach camera + roster).
 */
export default function CheckInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="-mx-2 -my-4 space-y-0 px-0 sm:mx-0 sm:my-0 sm:space-y-0 md:-mx-0 md:px-0">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-line px-1 pb-2 sm:mb-4 sm:px-0 md:hidden">
        <p className="text-xs font-medium text-muted">Check-in desk</p>
        <Link
          href="/admin/check-in/dashboard"
          className="inline-flex min-h-9 items-center text-xs underline underline-offset-4"
        >
          Dashboard
        </Link>
      </div>
      {children}
    </div>
  )
}
