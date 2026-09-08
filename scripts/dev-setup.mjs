#!/usr/bin/env node
/**
 * Local Cloud Agent dev setup — no external Turso/Clerk required.
 *
 * Idempotent. Applies scripts/schema-turso.sql to the local libSQL file DB
 * (TURSO_DATABASE_URL, e.g. file:./data/local.db) and seeds one published
 * Oak Valley event so the public site and admin have content to render.
 *
 * Usage: node scripts/dev-setup.mjs
 */
import { createClient } from "@libsql/client"
import { readFileSync, existsSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"

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

const url =
  process.env.TURSO_DATABASE_URL ||
  process.env.TURSO_URL ||
  process.env.LIBSQL_URL
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN

if (!url) {
  console.error("Missing TURSO_DATABASE_URL (set it in .env.local)")
  process.exit(1)
}

// Ensure the parent directory exists for local file DBs (file:./data/local.db).
if (url.startsWith("file:")) {
  const filePath = url.slice("file:".length)
  const abs = resolve(process.cwd(), filePath)
  mkdirSync(dirname(abs), { recursive: true })
}

async function main() {
  const db = createClient({ url, authToken })

  const schema = readFileSync(
    resolve(process.cwd(), "scripts/schema-turso.sql"),
    "utf8",
  )
  await db.executeMultiple(schema)
  console.log("Applied schema-turso.sql")

  const slug = "oak-valley-golf-scramble-2026"
  const existing = await db.execute(
    "SELECT id FROM events WHERE slug = ? LIMIT 1",
    [slug],
  )

  if (existing.rows.length === 0) {
    await db.execute(
      `INSERT INTO events
        (slug, title, summary, description, location, starts_at, ends_at,
         capacity, is_published, registration_open, fee_cents, team_size,
         venue_latitude, venue_longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, 4, 38.292404, -90.391714)`,
      [
        slug,
        "Oak Valley Golf Scramble 2026",
        "4-person scramble to fund scholarships for graduating seniors.",
        "Join us for a day on the green at Oak Valley! Shotgun start 8:00 AM. " +
          "4-person teams, contests on course, lunch included. All proceeds " +
          "support the Madalyn Robinson Foundation scholarship fund.",
        "Oak Valley Golf Club, Pevely, MO",
        "2026-09-25 08:00:00",
        "2026-09-25 14:00:00",
        31,
        50000,
      ],
    )
    console.log(`Seeded published event: ${slug}`)
  } else {
    console.log(`Event already present: ${slug}`)
  }

  const count = await db.execute("SELECT COUNT(*) AS n FROM events")
  console.log(`events table rows: ${count.rows[0].n}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
