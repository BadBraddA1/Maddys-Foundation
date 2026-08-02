import { sql } from "@/lib/db"
import { audit } from "@/lib/audit"
import {
  checkInPrefixFromSlug,
  ensurePlayerCheckInCode,
  ensureRegistrationCheckInCode,
} from "@/lib/check-in-code"
import {
  computeAddonTotalCents,
  type AddonKey,
  type AddonPrice,
  type EventPlayer,
} from "@/lib/check-in-shared"
import {
  extractTeamNameFromNotes,
  parseRegistrationRoster,
} from "@/lib/roster-parse"

export type { AddonKey, AddonPrice, EventPlayer } from "@/lib/check-in-shared"
export { computeAddonTotalCents, formatAddonMoney, isPlayerCheckedIn } from "@/lib/check-in-shared"

export type CheckInTeam = {
  registrationId: number
  eventId: number
  teamName: string
  captainName: string
  email: string
  phone: string
  notes: string
  /** Day-of QR / email code (e.g. OV-A3K9Q2). */
  checkInCode: string
  players: EventPlayer[]
  prices: AddonPrice[]
  teamAddonTotalCents: number
  checkedInCount: number
}

const DEFAULT_PRICES: AddonPrice[] = [
  { addon_key: "skins", label: "Skins", price_cents: 2000 },
  { addon_key: "golf_cannon", label: "Golf Cannon", price_cents: 1000 },
  { addon_key: "golf_pro", label: "Golf Pro", price_cents: 2500 },
]

export async function ensureAddonPrices(eventId: number): Promise<AddonPrice[]> {
  const existing = await sql`
    SELECT addon_key, label, price_cents FROM addon_prices
    WHERE event_id = ${eventId} OR event_id IS NULL
    ORDER BY CASE WHEN event_id IS NULL THEN 1 ELSE 0 END, addon_key
  `
  const byKey = new Map<string, AddonPrice>()
  for (const row of existing) {
    const key = String(row.addon_key) as AddonKey
    if (!byKey.has(key)) {
      byKey.set(key, {
        addon_key: key,
        label: String(row.label),
        price_cents: Number(row.price_cents),
      })
    }
  }
  for (const def of DEFAULT_PRICES) {
    if (!byKey.has(def.addon_key)) {
      await sql.execute(
        `INSERT INTO addon_prices (event_id, addon_key, label, price_cents)
         VALUES (?, ?, ?, ?)`,
        [eventId, def.addon_key, def.label, def.price_cents],
      )
      byKey.set(def.addon_key, def)
    }
  }
  return DEFAULT_PRICES.map((d) => byKey.get(d.addon_key) ?? d)
}

function mapPlayer(row: Record<string, unknown>): EventPlayer {
  return {
    id: Number(row.id),
    event_id: Number(row.event_id),
    registration_id: Number(row.registration_id),
    display_name: String(row.display_name),
    sort_order: Number(row.sort_order ?? 0),
    checked_in: Number(row.checked_in ?? 0),
    checked_in_at: row.checked_in_at == null ? null : String(row.checked_in_at),
    skins: Number(row.skins ?? 0),
    golf_cannon: Number(row.golf_cannon ?? 0),
    golf_pro: Number(row.golf_pro ?? 0),
    addon_total_cents: Number(row.addon_total_cents ?? 0),
    email: String(row.email ?? ""),
    check_in_code: row.check_in_code ? String(row.check_in_code) : null,
    ticket_email_sent_at: row.ticket_email_sent_at
      ? String(row.ticket_email_sent_at)
      : null,
    updated_at: String(row.updated_at ?? ""),
  }
}

/** Best-effort ALTERs for DBs created before per-player tickets. */
let playerColumnsReady: Promise<void> | null = null

export function ensureEventPlayerTicketColumns(): Promise<void> {
  if (!playerColumnsReady) {
    playerColumnsReady = (async () => {
      const alters = [
        `ALTER TABLE event_players ADD COLUMN email TEXT NOT NULL DEFAULT ''`,
        `ALTER TABLE event_players ADD COLUMN check_in_code TEXT`,
        `ALTER TABLE event_players ADD COLUMN ticket_email_sent_at TEXT`,
      ]
      for (const q of alters) {
        try {
          await sql.execute(q, [])
        } catch {
          // column already exists
        }
      }
      try {
        await sql.execute(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_event_players_check_in_code
           ON event_players (check_in_code)`,
          [],
        )
      } catch {
        // index may fail if duplicate codes somehow exist
      }
    })()
  }
  return playerColumnsReady
}

async function ensurePlayerCodesForRegistration(
  registrationId: number,
  prefix: string,
): Promise<void> {
  await ensureEventPlayerTicketColumns()
  const players = await listPlayersForRegistration(registrationId)
  for (const p of players) {
    if (!p.check_in_code) {
      await ensurePlayerCheckInCode(p.id, prefix)
    }
  }
}

export async function listPlayersForRegistration(
  registrationId: number,
): Promise<EventPlayer[]> {
  const rows = await sql`
    SELECT * FROM event_players
    WHERE registration_id = ${registrationId}
    ORDER BY sort_order ASC, id ASC
  `
  return rows.map((r) => mapPlayer(r))
}

async function writeCheckInHistory(opts: {
  eventId: number
  registrationId: number
  playerId: number | null
  action: string
  actor: string
  detail?: string
}) {
  await sql.execute(
    `INSERT INTO check_in_history
      (event_id, registration_id, player_id, action, actor, detail)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      opts.eventId,
      opts.registrationId,
      opts.playerId,
      opts.action,
      opts.actor,
      opts.detail ?? "",
    ],
  )
}

/**
 * Create missing event_players from registration notes/name.
 * Does not overwrite checked-in or addon state for existing sort_order rows.
 */
export async function syncPlayersForRegistration(
  registrationId: number,
  actor = "system",
): Promise<number> {
  await ensureEventPlayerTicketColumns()
  const regs = await sql`
    SELECT id, event_id, name, email, notes, team_name, status, paid
    FROM registrations WHERE id = ${registrationId} LIMIT 1
  `
  const reg = regs[0]
  if (!reg) return 0
  if (Number(reg.paid) !== 1 && String(reg.status) !== "confirmed") return 0

  const eventId = Number(reg.event_id)
  const eventRows = await sql`
    SELECT slug FROM events WHERE id = ${eventId} LIMIT 1
  `
  const prefix = checkInPrefixFromSlug(String(eventRows[0]?.slug ?? "MF"))

  const parsed = parseRegistrationRoster(
    String(reg.notes ?? ""),
    String(reg.name ?? ""),
  )
  const teamName =
    String(reg.team_name ?? "").trim() ||
    parsed.teamName ||
    String(reg.name ?? "Team")

  if (!String(reg.team_name ?? "").trim() && teamName) {
    await sql.execute(`UPDATE registrations SET team_name = ? WHERE id = ?`, [
      teamName,
      registrationId,
    ])
  }

  await ensureAddonPrices(eventId)

  const existing = await listPlayersForRegistration(registrationId)
  const byOrder = new Map(existing.map((p) => [p.sort_order, p]))
  let created = 0

  const names =
    parsed.players.length > 0
      ? parsed.players
      : [String(reg.name ?? "Player").trim()].filter(Boolean)

  const captainEmail = String(reg.email ?? "").trim()

  for (let i = 0; i < names.length; i++) {
    if (byOrder.has(i)) continue
    await sql.execute(
      `INSERT INTO event_players
        (event_id, registration_id, display_name, sort_order, email)
       VALUES (?, ?, ?, ?, ?)`,
      [
        eventId,
        registrationId,
        names[i],
        i,
        i === 0 ? captainEmail : "",
      ],
    )
    created += 1
  }

  // Prefill captain email on player 0 when still empty
  if (captainEmail) {
    await sql.execute(
      `UPDATE event_players SET email = ?
       WHERE registration_id = ? AND sort_order = 0
         AND (email IS NULL OR email = '')`,
      [captainEmail, registrationId],
    )
  }

  await ensurePlayerCodesForRegistration(registrationId, prefix)

  if (created > 0) {
    await audit(
      actor,
      "sync_event_players",
      "registration",
      String(registrationId),
      `created:${created}`,
    ).catch(() => undefined)
  }
  return created
}

export async function syncPlayersForEvent(
  eventId: number,
  actor = "system",
): Promise<{ registrations: number; playersCreated: number }> {
  const regs = await sql`
    SELECT id FROM registrations
    WHERE event_id = ${eventId} AND status = 'confirmed' AND paid = 1
  `
  let playersCreated = 0
  for (const row of regs) {
    playersCreated += await syncPlayersForRegistration(Number(row.id), actor)
  }

  // Backfill team_name from notes where empty
  const needNames = await sql`
    SELECT id, notes, name FROM registrations
    WHERE event_id = ${eventId}
      AND (team_name IS NULL OR team_name = '')
      AND status = 'confirmed' AND paid = 1
  `
  for (const row of needNames) {
    const tn =
      extractTeamNameFromNotes(String(row.notes ?? "")) ||
      String(row.name ?? "")
    if (tn) {
      await sql.execute(`UPDATE registrations SET team_name = ? WHERE id = ?`, [
        tn,
        Number(row.id),
      ])
    }
  }

  await ensureAddonPrices(eventId)
  return { registrations: regs.length, playersCreated }
}

/** After payment confirmed — set team_name, check_in_code, and ensure player rows. */
export async function ensureCheckInRosterForRegistration(
  registrationId: number,
  opts?: { teamName?: string; playerNames?: string[] },
): Promise<void> {
  const regs = await sql`
    SELECT id, event_id, name, email, notes, team_name, paid, status
    FROM registrations WHERE id = ${registrationId} LIMIT 1
  `
  const reg = regs[0]
  if (!reg) return

  const eventId = Number(reg.event_id)
  const eventRows = await sql`
    SELECT slug FROM events WHERE id = ${eventId} LIMIT 1
  `
  const prefix = checkInPrefixFromSlug(String(eventRows[0]?.slug ?? "MF"))
  await ensureRegistrationCheckInCode(registrationId, prefix)

  const parsed = parseRegistrationRoster(
    String(reg.notes ?? ""),
    String(reg.name ?? ""),
  )
  const teamName =
    opts?.teamName?.trim() ||
    String(reg.team_name ?? "").trim() ||
    parsed.teamName ||
    String(reg.name ?? "")

  if (teamName) {
    await sql.execute(`UPDATE registrations SET team_name = ? WHERE id = ?`, [
      teamName,
      registrationId,
    ])
  }

  await ensureAddonPrices(eventId)
  await ensureEventPlayerTicketColumns()

  const names =
    opts?.playerNames && opts.playerNames.length > 0
      ? opts.playerNames
      : parsed.players.length > 0
        ? parsed.players
        : [String(reg.name ?? "Player")]

  const existing = await listPlayersForRegistration(registrationId)
  const captainEmail = String(reg.email ?? "").trim()
  if (existing.length === 0) {
    for (let i = 0; i < names.length; i++) {
      await sql.execute(
        `INSERT INTO event_players
          (event_id, registration_id, display_name, sort_order, email)
         VALUES (?, ?, ?, ?, ?)`,
        [eventId, registrationId, names[i], i, i === 0 ? captainEmail : ""],
      )
    }
  }

  await ensurePlayerCodesForRegistration(registrationId, prefix)
}

export async function searchTeams(opts: {
  eventId: number
  q?: string
  limit?: number
}): Promise<
  Array<{
    registrationId: number
    teamName: string
    captainName: string
    playerCount: number
    checkedInCount: number
  }>
> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20))
  const q = (opts.q ?? "").trim().toLowerCase()

  const rows = q
    ? await sql`
        SELECT r.id, r.team_name, r.name, r.notes, r.check_in_code,
          (SELECT COUNT(*) FROM event_players p WHERE p.registration_id = r.id) AS player_count,
          (SELECT COUNT(*) FROM event_players p
            WHERE p.registration_id = r.id AND p.checked_in = 1) AS checked_in_count
        FROM registrations r
        WHERE r.event_id = ${opts.eventId}
          AND r.status = 'confirmed' AND r.paid = 1
          AND (
            lower(r.team_name) LIKE ${`%${q}%`}
            OR lower(r.name) LIKE ${`%${q}%`}
            OR lower(r.notes) LIKE ${`%${q}%`}
            OR upper(COALESCE(r.check_in_code, '')) LIKE ${`%${q.toUpperCase()}%`}
          )
        ORDER BY r.team_name ASC, r.name ASC
        LIMIT ${limit}
      `
    : await sql`
        SELECT r.id, r.team_name, r.name, r.notes,
          (SELECT COUNT(*) FROM event_players p WHERE p.registration_id = r.id) AS player_count,
          (SELECT COUNT(*) FROM event_players p
            WHERE p.registration_id = r.id AND p.checked_in = 1) AS checked_in_count
        FROM registrations r
        WHERE r.event_id = ${opts.eventId}
          AND r.status = 'confirmed' AND r.paid = 1
        ORDER BY r.team_name ASC, r.name ASC
        LIMIT ${limit}
      `

  return rows.map((r) => ({
    registrationId: Number(r.id),
    teamName:
      String(r.team_name ?? "").trim() ||
      extractTeamNameFromNotes(String(r.notes ?? "")) ||
      String(r.name ?? ""),
    captainName: String(r.name ?? ""),
    playerCount: Number(r.player_count ?? 0),
    checkedInCount: Number(r.checked_in_count ?? 0),
  }))
}

export async function getCheckInTeam(
  registrationId: number,
): Promise<CheckInTeam | null> {
  const regs = await sql`
    SELECT * FROM registrations
    WHERE id = ${registrationId} AND status = 'confirmed' AND paid = 1
    LIMIT 1
  `
  const reg = regs[0]
  if (!reg) return null

  const eventRows = await sql`
    SELECT slug FROM events WHERE id = ${Number(reg.event_id)} LIMIT 1
  `
  const prefix = checkInPrefixFromSlug(String(eventRows[0]?.slug ?? "MF"))
  const checkInCode = await ensureRegistrationCheckInCode(registrationId, prefix)

  await syncPlayersForRegistration(registrationId)
  const players = await listPlayersForRegistration(registrationId)
  const prices = await ensureAddonPrices(Number(reg.event_id))
  const teamAddonTotalCents = players.reduce(
    (s, p) => s + p.addon_total_cents,
    0,
  )
  const teamName =
    String(reg.team_name ?? "").trim() ||
    extractTeamNameFromNotes(String(reg.notes ?? "")) ||
    String(reg.name ?? "")

  return {
    registrationId: Number(reg.id),
    eventId: Number(reg.event_id),
    teamName,
    captainName: String(reg.name),
    email: String(reg.email),
    phone: String(reg.phone ?? ""),
    notes: String(reg.notes ?? ""),
    checkInCode,
    players,
    prices,
    teamAddonTotalCents,
    checkedInCount: players.filter((p) => p.checked_in === 1).length,
  }
}

export async function checkInPlayer(
  playerId: number,
  actor: string,
): Promise<
  | { ok: true; player: EventPlayer }
  | { ok: false; status: number; error: string; player?: EventPlayer }
> {
  const rows = await sql`SELECT * FROM event_players WHERE id = ${playerId} LIMIT 1`
  const current = rows[0] ? mapPlayer(rows[0]) : null
  if (!current) {
    return { ok: false, status: 404, error: "Player not found." }
  }
  if (current.checked_in === 1) {
    return {
      ok: false,
      status: 409,
      error: `${current.display_name} is already checked in.`,
      player: current,
    }
  }

  const now = new Date().toISOString()
  const result = await sql.execute(
    `UPDATE event_players
     SET checked_in = 1, checked_in_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND checked_in = 0`,
    [now, playerId],
  )
  if (!result.rowsAffected) {
    const again = await sql`SELECT * FROM event_players WHERE id = ${playerId} LIMIT 1`
    const p = again[0] ? mapPlayer(again[0]) : current
    return {
      ok: false,
      status: 409,
      error: `${p.display_name} is already checked in.`,
      player: p,
    }
  }

  await writeCheckInHistory({
    eventId: current.event_id,
    registrationId: current.registration_id,
    playerId,
    action: "checked_in",
    actor,
    detail: current.display_name,
  })

  const updated = await sql`SELECT * FROM event_players WHERE id = ${playerId} LIMIT 1`
  return { ok: true, player: mapPlayer(updated[0]!) }
}

export async function undoCheckInPlayer(
  playerId: number,
  actor: string,
): Promise<
  | { ok: true; player: EventPlayer }
  | { ok: false; status: number; error: string; player?: EventPlayer }
> {
  const rows = await sql`SELECT * FROM event_players WHERE id = ${playerId} LIMIT 1`
  const current = rows[0] ? mapPlayer(rows[0]) : null
  if (!current) {
    return { ok: false, status: 404, error: "Player not found." }
  }
  if (current.checked_in !== 1) {
    return {
      ok: false,
      status: 409,
      error: `${current.display_name} is not checked in.`,
      player: current,
    }
  }

  const result = await sql.execute(
    `UPDATE event_players
     SET checked_in = 0, checked_in_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND checked_in = 1`,
    [playerId],
  )
  if (!result.rowsAffected) {
    const again = await sql`SELECT * FROM event_players WHERE id = ${playerId} LIMIT 1`
    const p = again[0] ? mapPlayer(again[0]) : current
    // Already cleared (race / retry) — treat as success so the desk UI can sync.
    if (p.checked_in !== 1) {
      return { ok: true, player: p }
    }
    return {
      ok: false,
      status: 409,
      error: `${p.display_name} is not checked in.`,
      player: p,
    }
  }

  try {
    await writeCheckInHistory({
      eventId: current.event_id,
      registrationId: current.registration_id,
      playerId,
      action: "check_in_undone",
      actor,
      detail: current.display_name,
    })
  } catch (err) {
    console.error("[undoCheckInPlayer] history", err)
  }

  const updated = await sql`SELECT * FROM event_players WHERE id = ${playerId} LIMIT 1`
  return { ok: true, player: mapPlayer(updated[0]!) }
}

export async function saveTeamAddOns(
  registrationId: number,
  players: Array<{
    id: number
    skins: boolean
    golf_cannon: boolean
    golf_pro: boolean
  }>,
  actor: string,
): Promise<CheckInTeam | null> {
  const team = await getCheckInTeam(registrationId)
  if (!team) return null

  const priceList = team.prices
  for (const patch of players) {
    const total = computeAddonTotalCents(patch, priceList)
    await sql.execute(
      `UPDATE event_players
       SET skins = ?, golf_cannon = ?, golf_pro = ?, addon_total_cents = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND registration_id = ?`,
      [
        patch.skins ? 1 : 0,
        patch.golf_cannon ? 1 : 0,
        patch.golf_pro ? 1 : 0,
        total,
        patch.id,
        registrationId,
      ],
    )
  }

  await writeCheckInHistory({
    eventId: team.eventId,
    registrationId,
    playerId: null,
    action: "add_ons_updated",
    actor,
    detail: `${players.length} players`,
  })

  return getCheckInTeam(registrationId)
}

export async function getCheckInDashboard(eventId: number) {
  await syncPlayersForEvent(eventId)

  const teams = await sql`
    SELECT r.id, r.team_name, r.name, r.notes,
      (SELECT COUNT(*) FROM event_players p WHERE p.registration_id = r.id) AS player_count,
      (SELECT COUNT(*) FROM event_players p
        WHERE p.registration_id = r.id AND p.checked_in = 1) AS checked_in_count,
      (SELECT COALESCE(SUM(p.skins), 0) FROM event_players p
        WHERE p.registration_id = r.id) AS skins_count,
      (SELECT COALESCE(SUM(p.golf_cannon), 0) FROM event_players p
        WHERE p.registration_id = r.id) AS golf_cannon_count,
      (SELECT COALESCE(SUM(p.golf_pro), 0) FROM event_players p
        WHERE p.registration_id = r.id) AS golf_pro_count,
      (SELECT COALESCE(SUM(p.addon_total_cents), 0) FROM event_players p
        WHERE p.registration_id = r.id) AS addon_total_cents
    FROM registrations r
    WHERE r.event_id = ${eventId} AND r.status = 'confirmed' AND r.paid = 1
    ORDER BY r.team_name ASC, r.name ASC
  `

  const teamRows = teams.map((r) => ({
    registrationId: Number(r.id),
    teamName:
      String(r.team_name ?? "").trim() ||
      extractTeamNameFromNotes(String(r.notes ?? "")) ||
      String(r.name ?? ""),
    playerCount: Number(r.player_count ?? 0),
    checkedInCount: Number(r.checked_in_count ?? 0),
    skinsCount: Number(r.skins_count ?? 0),
    golfCannonCount: Number(r.golf_cannon_count ?? 0),
    golfProCount: Number(r.golf_pro_count ?? 0),
    addonTotalCents: Number(r.addon_total_cents ?? 0),
  }))

  const totals = {
    teams: teamRows.length,
    players: teamRows.reduce((s, t) => s + t.playerCount, 0),
    checkedIn: teamRows.reduce((s, t) => s + t.checkedInCount, 0),
    skins: teamRows.reduce((s, t) => s + t.skinsCount, 0),
    golfCannon: teamRows.reduce((s, t) => s + t.golfCannonCount, 0),
    golfPro: teamRows.reduce((s, t) => s + t.golfProCount, 0),
    addonTotalCents: teamRows.reduce((s, t) => s + t.addonTotalCents, 0),
  }

  return { totals, teams: teamRows }
}

export async function listCheckInHistory(registrationId: number, limit = 50) {
  const rows = await sql`
    SELECT * FROM check_in_history
    WHERE registration_id = ${registrationId}
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit}
  `
  return rows.map((r) => ({
    id: Number(r.id),
    eventId: Number(r.event_id),
    registrationId: Number(r.registration_id),
    playerId: r.player_id == null ? null : Number(r.player_id),
    action: String(r.action),
    actor: String(r.actor ?? ""),
    detail: String(r.detail ?? ""),
    createdAt: String(r.created_at ?? ""),
  }))
}
