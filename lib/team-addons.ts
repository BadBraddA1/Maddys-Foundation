/** Mulligans / skins — flat fee per team (cents). Safe for client + server. */
export const TEAM_ADDON_CENTS = 2000

export function teamAddonTotalCents(opts: {
  mulligans?: boolean
  skins?: boolean
}): number {
  let total = 0
  if (opts.mulligans) total += TEAM_ADDON_CENTS
  if (opts.skins) total += TEAM_ADDON_CENTS
  return total
}
