/** Keyboard skip — targets `#main` by default (override on home to land on hero copy). */
export function SkipLink({ href = "#main" }: { href?: string }) {
  return (
    <a href={href} className="skip-link">
      Skip to content
    </a>
  )
}
