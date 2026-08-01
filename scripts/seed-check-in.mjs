#!/usr/bin/env node
/**
 * Seed paid test teams + players + check_in_codes for Oak Valley check-in desk.
 *
 * Usage (from repo root, with .env.local loaded):
 *   set -a && source .env.local && set +a && node scripts/seed-check-in.mjs
 *
 * Safe to re-run: deletes prior seed rows (email *@checkin-seed.test) first.
 */
import { createClient } from "@libsql/client"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local")
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvLocal()

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

function genCode(prefix) {
  let body = ""
  for (let i = 0; i < 6; i++) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `${prefix}-${body}`
}

const TEAMS = [
  {
    team: "Birdie Bunch",
    captain: "Alex Rivera",
    players: ["Alex Rivera", "Sam Patel", "Jordan Lee", "Casey Nguyen"],
  },
  {
    team: "Fairway Friends",
    captain: "Taylor Brooks",
    players: ["Taylor Brooks", "Morgan Diaz", "Riley Chen", "Avery Kim"],
  },
  {
    team: "Par Then Bar",
    captain: "Jamie Ortiz",
    players: ["Jamie Ortiz", "Quinn Walsh", "Drew Harper", "Skyler Moss"],
  },
  {
    team: "Eagle Eye",
    captain: "Cameron Blake",
    players: ["Cameron Blake", "Reese Ford", "Parker Hayes", "Dakota Lane"],
  },
  {
    team: "Mulligan Crew",
    captain: "Harper Cole",
    players: ["Harper Cole", "Emery Scott", "Finley Shaw", "Rowan Wells"],
  },
]

async function main() {
  const url =
    process.env.TURSO_DATABASE_URL ||
    process.env.TURSO_URL ||
    process.env.LIBSQL_URL
  const authToken =
    process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN
  if (!url) {
    console.error("Missing TURSO_DATABASE_URL")
    process.exit(1)
  }

  const db = createClient({ url, authToken })
  const eventRes = await db.execute(
    `SELECT id, slug FROM events WHERE slug = 'oak-valley-golf-scramble-2026' LIMIT 1`,
  )
  const event = eventRes.rows[0]
  if (!event) {
    console.error("Oak Valley event not found")
    process.exit(1)
  }
  const eventId = Number(event.id)
  const prefix = "OV"

  // Ensure column exists (noop if already migrated)
  try {
    await db.execute(`ALTER TABLE registrations ADD COLUMN check_in_code TEXT`)
  } catch {
    // already exists
  }
  try {
    await db.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_check_in_code ON registrations (check_in_code)`,
    )
  } catch {
    // ignore
  }

  // Remove prior seed rows
  const prior = await db.execute(
    `SELECT id FROM registrations WHERE event_id = ? AND email LIKE '%@checkin-seed.test'`,
    [eventId],
  )
  for (const row of prior.rows) {
    const id = Number(row.id)
    await db.execute(`DELETE FROM check_in_history WHERE registration_id = ?`, [
      id,
    ])
    await db.execute(`DELETE FROM event_players WHERE registration_id = ?`, [
      id,
    ])
    await db.execute(`DELETE FROM registrations WHERE id = ?`, [id])
  }

  // Default addon prices
  for (const [key, label, cents] of [
    ["skins", "Skins", 2000],
    ["golf_cannon", "Golf Cannon", 1000],
    ["golf_pro", "Golf Pro", 2500],
  ]) {
    await db.execute(
      `INSERT OR IGNORE INTO addon_prices (event_id, addon_key, label, price_cents)
       VALUES (?, ?, ?, ?)`,
      [eventId, key, label, cents],
    )
  }

  const seeded = []
  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i]
    const email = `team${i + 1}@checkin-seed.test`
    const notes = [
      `Team: ${t.team}`,
      `Captain: ${t.captain}`,
      ...t.players.slice(1).map((p, idx) => `Player ${idx + 2}: ${p}`),
    ].join("\n")

    let code = genCode(prefix)
    let registrationId = 0
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const ins = await db.execute(
          `INSERT INTO registrations
            (event_id, name, email, phone, guests, notes, status, paid, team_name, check_in_code)
           VALUES (?, ?, ?, ?, 4, ?, 'confirmed', 1, ?, ?)`,
          [
            eventId,
            t.captain,
            email,
            "555-010" + String(i + 1),
            notes,
            t.team,
            code,
          ],
        )
        registrationId = Number(ins.lastInsertRowid)
        break
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("UNIQUE") || msg.includes("unique")) {
          code = genCode(prefix)
          continue
        }
        throw err
      }
    }
    if (!registrationId) throw new Error(`Failed to insert ${t.team}`)

    // Varied day-of add-ons for desk testing ($20 skins / $10 cannon / $25 pro).
    const addonPlans = [
      // Birdie Bunch — mix + one checked in
      [
        { skins: 1, golf_cannon: 0, golf_pro: 0, checked: 1 },
        { skins: 0, golf_cannon: 1, golf_pro: 0, checked: 0 },
        { skins: 0, golf_cannon: 0, golf_pro: 1, checked: 0 },
        { skins: 1, golf_cannon: 1, golf_pro: 0, checked: 0 },
      ],
      // Fairway Friends — all clear (control team)
      [
        { skins: 0, golf_cannon: 0, golf_pro: 0, checked: 0 },
        { skins: 0, golf_cannon: 0, golf_pro: 0, checked: 0 },
        { skins: 0, golf_cannon: 0, golf_pro: 0, checked: 0 },
        { skins: 0, golf_cannon: 0, golf_pro: 0, checked: 0 },
      ],
      // Par Then Bar — heavy add-ons + two checked in
      [
        { skins: 1, golf_cannon: 1, golf_pro: 1, checked: 1 },
        { skins: 1, golf_cannon: 0, golf_pro: 0, checked: 1 },
        { skins: 0, golf_cannon: 1, golf_pro: 1, checked: 0 },
        { skins: 0, golf_cannon: 0, golf_pro: 0, checked: 0 },
      ],
      // Eagle Eye — cannon only
      [
        { skins: 0, golf_cannon: 1, golf_pro: 0, checked: 0 },
        { skins: 0, golf_cannon: 1, golf_pro: 0, checked: 0 },
        { skins: 0, golf_cannon: 1, golf_pro: 0, checked: 0 },
        { skins: 0, golf_cannon: 0, golf_pro: 0, checked: 0 },
      ],
      // Mulligan Crew — pro + skins
      [
        { skins: 1, golf_cannon: 0, golf_pro: 1, checked: 1 },
        { skins: 0, golf_cannon: 0, golf_pro: 1, checked: 0 },
        { skins: 1, golf_cannon: 0, golf_pro: 0, checked: 0 },
        { skins: 0, golf_cannon: 0, golf_pro: 0, checked: 0 },
      ],
    ][i]

    for (let p = 0; p < t.players.length; p++) {
      const plan = addonPlans[p] || {
        skins: 0,
        golf_cannon: 0,
        golf_pro: 0,
        checked: 0,
      }
      const total =
        plan.skins * 2000 + plan.golf_cannon * 1000 + plan.golf_pro * 2500
      const checkedInAt = plan.checked
        ? new Date().toISOString()
        : null
      await db.execute(
        `INSERT INTO event_players
          (event_id, registration_id, display_name, sort_order,
           checked_in, checked_in_at, skins, golf_cannon, golf_pro, addon_total_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          registrationId,
          t.players[p],
          p,
          plan.checked,
          checkedInAt,
          plan.skins,
          plan.golf_cannon,
          plan.golf_pro,
          total,
        ],
      )
    }

    seeded.push({
      team: t.team,
      code,
      registrationId,
      email,
    })
  }

  console.log(`Seeded ${seeded.length} paid teams for event ${eventId}:\n`)
  for (const s of seeded) {
    console.log(
      `  ${s.code.padEnd(12)}  ${s.team}  (reg #${s.registrationId})`,
    )
  }
  console.log(
    `\nDesk: /admin/check-in?code=${seeded[0].code}\nTicket: /ticket/${seeded[0].code}\nScan QR or type code on phone.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
