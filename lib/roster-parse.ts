/** Parse team roster text stored in registration.notes. */

export type ParsedRoster = {
  teamName: string
  players: string[]
}

/**
 * Notes format from team register:
 * Team: Name
 * ...
 * Captain: First Last
 * Player 2: First Last
 */
export function parseRegistrationRoster(
  notes: string,
  captainFallback = "",
): ParsedRoster {
  const teamMatch = notes.match(/^\s*Team:\s*(.+)$/im)
  const teamName = (teamMatch?.[1] || "").trim()

  const players: string[] = []
  const captainMatch = notes.match(/^\s*Captain:\s*(.+)$/im)
  if (captainMatch?.[1]?.trim()) {
    players.push(captainMatch[1].trim())
  } else if (captainFallback.trim()) {
    players.push(captainFallback.trim())
  }

  const playerLine = /^\s*Player\s+(\d+):\s*(.+)$/gim
  const extras: { n: number; name: string }[] = []
  let m: RegExpExecArray | null
  while ((m = playerLine.exec(notes)) !== null) {
    extras.push({ n: Number(m[1]), name: m[2].trim() })
  }
  extras.sort((a, b) => a.n - b.n)
  for (const e of extras) {
    if (e.name) players.push(e.name)
  }

  return { teamName, players }
}

export function extractTeamNameFromNotes(notes: string): string {
  return parseRegistrationRoster(notes).teamName
}

/** Prepaid team add-ons from registration notes (written at checkout). */
export type PrepaidAddons = {
  mulligans: boolean
  skins: boolean
}

/**
 * Notes include lines like `Mulligans: yes (+$20)` / `Skins: no`.
 * Also accepts Stripe-style metadata echoes if present.
 */
export function parsePrepaidAddons(notes: string): PrepaidAddons {
  const text = notes ?? ""
  return {
    mulligans: /Mulligans:\s*yes\b/i.test(text),
    skins: /Skins:\s*yes\b/i.test(text),
  }
}
