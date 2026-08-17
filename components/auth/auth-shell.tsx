import Link from "next/link"
import { authConfig } from "@/lib/auth-config"

/**
 * Page chrome shared by all auth screens: home link, title, subtitle,
 * the form card, an alternate-action line, and Powered by BraddCorp.
 */
export function AuthShell({
  title,
  subtitle,
  altHref,
  altLabel,
  altPrompt,
  children,
}: {
  title: string
  subtitle: string
  altHref?: string
  altLabel?: string
  altPrompt?: string
  children: React.ReactNode
}) {
  return (
    <div className="ba-page">
      <div className="ba-shell">
        <header className="ba-header">
          <Link href={authConfig.homeUrl} className="ba-home-link">
            {authConfig.siteName}
          </Link>
          <h1 className="ba-title">{title}</h1>
          <p className="ba-subtitle">{subtitle}</p>
        </header>

        <div className="ba-card">{children}</div>

        {altHref && altLabel ? (
          <p className="ba-hint">
            {altPrompt ? `${altPrompt} ` : null}
            <Link href={altHref} className="ba-link">
              {altLabel}
            </Link>
          </p>
        ) : null}

        <footer className="ba-footer">
          Powered by{" "}
          <a href="https://braddcorp.com" target="_blank" rel="noopener noreferrer">
            BraddCorp
          </a>
        </footer>
      </div>
    </div>
  )
}
