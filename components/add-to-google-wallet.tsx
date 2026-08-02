type Props = {
  href: string
  enabled: boolean
}

/** Link that redirects to Google’s signed “Add to Google Wallet” save URL. */
export function AddToGoogleWallet({ href, enabled }: Props) {
  if (!enabled) {
    return (
      <p className="mt-3 text-sm text-muted text-pretty">
        Google Wallet passes will be available once staff finish Google Wallet
        Issuer setup.
      </p>
    )
  }

  return (
    <p className="mt-3 print:hidden">
      <a
        href={href}
        className="inline-flex min-h-11 items-center justify-center border border-line px-5 text-sm font-medium text-ink hover:bg-surface"
      >
        Add to Google Wallet
      </a>
      <span className="mt-2 block text-sm text-muted text-pretty">
        On Android (or Wallet in a Google account), this saves an event ticket with
        the same check-in QR the desk scans.
      </span>
    </p>
  )
}
