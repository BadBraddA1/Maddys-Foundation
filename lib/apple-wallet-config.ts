function envPem(name: string): string | null {
  const raw = process.env[name]?.trim()
  if (!raw) return null
  // Support base64-encoded PEMs (handy for Vercel) or literal PEM with \n escapes.
  if (!raw.includes("BEGIN")) {
    try {
      return Buffer.from(raw, "base64").toString("utf8")
    } catch {
      return null
    }
  }
  return raw.replace(/\\n/g, "\n")
}

/** Safe to import from ticket pages — no native modules. */
export function appleWalletConfigured(): boolean {
  return Boolean(
    process.env.APPLE_WALLET_PASS_TYPE_ID?.trim() &&
      process.env.APPLE_WALLET_TEAM_ID?.trim() &&
      envPem("APPLE_WALLET_WWDR") &&
      envPem("APPLE_WALLET_SIGNER_CERT") &&
      envPem("APPLE_WALLET_SIGNER_KEY"),
  )
}

export function appleWalletEnvPems() {
  return {
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID!.trim(),
    teamIdentifier: process.env.APPLE_WALLET_TEAM_ID!.trim(),
    wwdr: envPem("APPLE_WALLET_WWDR")!,
    signerCert: envPem("APPLE_WALLET_SIGNER_CERT")!,
    signerKey: envPem("APPLE_WALLET_SIGNER_KEY")!,
    signerKeyPassphrase:
      process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE?.trim() || undefined,
  }
}
