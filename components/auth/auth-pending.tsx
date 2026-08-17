/**
 * Spinner card shown between "auth succeeded" and the browser finishing the
 * hard navigation, so users never see the form flash back.
 */
export function AuthPending({ label }: { label: string }) {
  return (
    <div className="ba-pending" role="status" aria-live="polite">
      <div className="ba-spinner" aria-hidden />
      <p className="ba-hint">{label}</p>
    </div>
  )
}
