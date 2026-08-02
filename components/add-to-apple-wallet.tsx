type Props = {
  href: string
  enabled: boolean
}

/** Link that downloads a .pkpass (iPhone opens “Add to Apple Wallet”). */
export function AddToAppleWallet({ href, enabled }: Props) {
  if (!enabled) {
    return (
      <p className="mt-4 text-sm text-muted text-pretty">
        Apple Wallet passes will be available once staff finish Apple Developer
        setup.
      </p>
    )
  }

  return (
    <p className="mt-4 print:hidden">
      <a
        href={href}
        className="btn-deep inline-flex min-h-11 items-center justify-center px-5 text-sm font-medium"
      >
        Add to Apple Wallet
      </a>
      <span className="mt-2 block text-sm text-muted text-pretty">
        On iPhone, this opens Wallet. Near the golf course on event day, the pass
        can appear on your lock screen for quick check-in.
      </span>
    </p>
  )
}
