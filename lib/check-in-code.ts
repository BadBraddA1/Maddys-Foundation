import { sql } from "@/lib/db"

/** Alphabet without ambiguous 0/O/1/I for verbal/email use. */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

export function generateCheckInCode(prefix = "MF"): string {
  let body = ""
  for (let i = 0; i < 6; i++) {
    body += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!
  }
  return `${prefix}-${body}`
}

/** Event-specific prefix from slug (e.g. oak-valley → OV). */
export function checkInPrefixFromSlug(slug: string): string {
  const parts = slug
    .split("-")
    .map((p) => p.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return (parts[0]?.slice(0, 2) || "MF").toUpperCase()
}

export async function ensureRegistrationCheckInCode(
  registrationId: number,
  prefix = "MF",
): Promise<string> {
  const rows = await sql`
    SELECT check_in_code FROM registrations WHERE id = ${registrationId} LIMIT 1
  `
  const existing = rows[0]?.check_in_code
  if (existing && String(existing).trim()) return String(existing).trim()

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateCheckInCode(prefix)
    try {
      const result = await sql.execute(
        `UPDATE registrations SET check_in_code = ?
         WHERE id = ? AND (check_in_code IS NULL OR check_in_code = '')`,
        [code, registrationId],
      )
      if (result.rowsAffected > 0) return code
      const again = await sql`
        SELECT check_in_code FROM registrations WHERE id = ${registrationId} LIMIT 1
      `
      if (again[0]?.check_in_code) return String(again[0].check_in_code)
    } catch {
      // unique collision — retry
    }
  }
  throw new Error("Could not allocate check_in_code")
}

export async function findRegistrationIdByCheckInCode(
  code: string,
  eventId?: number,
): Promise<number | null> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null
  const rows = eventId
    ? await sql`
        SELECT id FROM registrations
        WHERE upper(check_in_code) = ${normalized}
          AND event_id = ${eventId}
          AND status = 'confirmed' AND paid = 1
        LIMIT 1
      `
    : await sql`
        SELECT id FROM registrations
        WHERE upper(check_in_code) = ${normalized}
          AND status = 'confirmed' AND paid = 1
        LIMIT 1
      `
  return rows[0] ? Number(rows[0].id) : null
}

/** Player codes use `{prefix}-P-{body}` so desk can tell them apart from team codes. */
export function generatePlayerCheckInCode(prefix = "MF"): string {
  let body = ""
  for (let i = 0; i < 6; i++) {
    body += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!
  }
  return `${prefix}-P-${body}`
}

export function isPlayerCheckInCode(code: string): boolean {
  return /^[A-Z0-9]{1,4}-P-[A-Z0-9]{4,10}$/i.test(code.trim())
}

export async function ensurePlayerCheckInCode(
  playerId: number,
  prefix = "MF",
): Promise<string> {
  const rows = await sql`
    SELECT check_in_code FROM event_players WHERE id = ${playerId} LIMIT 1
  `
  const existing = rows[0]?.check_in_code
  if (existing && String(existing).trim()) return String(existing).trim()

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generatePlayerCheckInCode(prefix)
    try {
      const result = await sql.execute(
        `UPDATE event_players SET check_in_code = ?
         WHERE id = ? AND (check_in_code IS NULL OR check_in_code = '')`,
        [code, playerId],
      )
      if (result.rowsAffected > 0) return code
      const again = await sql`
        SELECT check_in_code FROM event_players WHERE id = ${playerId} LIMIT 1
      `
      if (again[0]?.check_in_code) return String(again[0].check_in_code)
    } catch {
      // unique collision — retry
    }
  }
  throw new Error("Could not allocate player check_in_code")
}

export async function findPlayerIdByCheckInCode(
  code: string,
  eventId?: number,
): Promise<number | null> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null
  const rows = eventId
    ? await sql`
        SELECT p.id FROM event_players p
        INNER JOIN registrations r ON r.id = p.registration_id
        WHERE upper(p.check_in_code) = ${normalized}
          AND p.event_id = ${eventId}
          AND r.status = 'confirmed' AND r.paid = 1
        LIMIT 1
      `
    : await sql`
        SELECT p.id FROM event_players p
        INNER JOIN registrations r ON r.id = p.registration_id
        WHERE upper(p.check_in_code) = ${normalized}
          AND r.status = 'confirmed' AND r.paid = 1
        LIMIT 1
      `
  return rows[0] ? Number(rows[0].id) : null
}
