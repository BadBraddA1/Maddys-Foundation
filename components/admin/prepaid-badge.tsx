/** Shared prepaid badge for day-of check-in desk / team detail. */

export function PrepaidBadge({
  label = "Prepaid",
  className = "",
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex min-h-8 items-center bg-success px-3 text-xs font-semibold uppercase tracking-wide text-white ${className}`}
    >
      {label}
    </span>
  )
}

export function PrepaidTabs({
  skins,
  mulligans,
}: {
  skins: boolean
  mulligans: boolean
}) {
  if (!skins && !mulligans) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {skins ? <PrepaidBadge label="Skins prepaid" /> : null}
      {mulligans ? <PrepaidBadge label="Mulligans prepaid" /> : null}
    </div>
  )
}
