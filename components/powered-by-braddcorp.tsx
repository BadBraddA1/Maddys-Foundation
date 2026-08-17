export function PoweredByBraddcorp({
  onDark = false,
}: {
  onDark?: boolean
}) {
  return (
    <p
      className={
        onDark
          ? "text-center text-sm text-on-deep-muted"
          : "text-center text-sm text-muted"
      }
    >
      Powered by{" "}
      <a
        href="https://braddcorp.com"
        target="_blank"
        rel="noopener noreferrer"
        className={
          onDark
            ? "font-semibold text-on-deep underline-offset-2 transition-colors hover:underline"
            : "font-semibold text-accent-ink underline-offset-2 transition-colors hover:underline"
        }
      >
        BraddCorp
      </a>
    </p>
  )
}
