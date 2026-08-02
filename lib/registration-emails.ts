import {
  checkInPrefixFromSlug,
  ensurePlayerCheckInCode,
  ensureRegistrationCheckInCode,
} from "@/lib/check-in-code"
import { ensureEventPlayerTicketColumns } from "@/lib/check-in"
import { sql } from "@/lib/db"
import { formatEventDate, toEventIso } from "@/lib/events"
import { emailConfigured, sendEmail } from "@/lib/email"
import { publicSiteUrl } from "@/lib/stripe"
import { siteName } from "@/lib/site-metadata"
import { playerTicketUrlForCode } from "@/lib/ticket"

type RegEmailRow = {
  id: number
  name: string
  email: string
  team_name: string
  check_in_code: string | null
  confirmation_email_sent_at: string | null
  reminder_email_sent_at: string | null
  event_id: number
  event_title: string
  event_slug: string
  event_location: string
  event_starts_at: string
}

async function loadRegistrationForEmail(
  registrationId: number,
): Promise<RegEmailRow | null> {
  const rows = await sql`
    SELECT r.id, r.name, r.email, r.team_name, r.check_in_code,
      r.confirmation_email_sent_at, r.reminder_email_sent_at,
      r.event_id, e.title AS event_title, e.slug AS event_slug,
      e.location AS event_location, e.starts_at AS event_starts_at
    FROM registrations r
    INNER JOIN events e ON e.id = r.event_id
    WHERE r.id = ${registrationId}
      AND r.status = 'confirmed' AND r.paid = 1
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null
  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    team_name: String(row.team_name ?? "").trim() || String(row.name),
    check_in_code: row.check_in_code ? String(row.check_in_code) : null,
    confirmation_email_sent_at: row.confirmation_email_sent_at
      ? String(row.confirmation_email_sent_at)
      : null,
    reminder_email_sent_at: row.reminder_email_sent_at
      ? String(row.reminder_email_sent_at)
      : null,
    event_id: Number(row.event_id),
    event_title: String(row.event_title),
    event_slug: String(row.event_slug),
    event_location: String(row.event_location ?? ""),
    event_starts_at: String(row.event_starts_at),
  }
}

export function ticketUrlForCode(code: string): string {
  return `${publicSiteUrl()}/ticket/${encodeURIComponent(code)}`
}

async function ensureCode(reg: RegEmailRow): Promise<string> {
  if (reg.check_in_code?.trim()) return reg.check_in_code.trim()
  return ensureRegistrationCheckInCode(
    reg.id,
    checkInPrefixFromSlug(reg.event_slug),
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildBodies(opts: {
  kind: "confirmation" | "reminder"
  reg: RegEmailRow
  code: string
  ticketUrl: string
  qrImgSrc: string
}): { subject: string; html: string; text: string } {
  const when = formatEventDate(opts.reg.event_starts_at)
  const where = opts.reg.event_location || "See event page for location"
  const shareBlurb =
    "Open your team ticket link to enter each teammate’s email and send them a personal check-in QR. On event day, staff scan that QR to check each player in automatically."

  if (opts.kind === "confirmation") {
    const subject = `You're registered — ${opts.reg.event_title}`
    const text = [
      `Hi ${opts.reg.name},`,
      "",
      `You're confirmed for ${opts.reg.event_title}.`,
      `Team: ${opts.reg.team_name}`,
      `When: ${when}`,
      `Where: ${where}`,
      "",
      `Your check-in code: ${opts.code}`,
      `Team ticket (share this): ${opts.ticketUrl}`,
      "",
      shareBlurb,
      "",
      `Event details: ${publicSiteUrl()}/events/${opts.reg.event_slug}`,
      "",
      `— ${siteName}`,
    ].join("\n")

    const html = `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a2e24;line-height:1.5">
        <p>Hi ${escapeHtml(opts.reg.name)},</p>
        <p>You're confirmed for <strong>${escapeHtml(opts.reg.event_title)}</strong>.</p>
        <p>
          <strong>Team:</strong> ${escapeHtml(opts.reg.team_name)}<br/>
          <strong>When:</strong> ${escapeHtml(when)}<br/>
          <strong>Where:</strong> ${escapeHtml(where)}
        </p>
        <p style="font-size:1.25rem;letter-spacing:0.06em">
          <strong>Check-in code:</strong>
          <span style="font-family:ui-monospace,monospace">${escapeHtml(opts.code)}</span>
        </p>
        <p><img src="${escapeHtml(opts.qrImgSrc)}" alt="Check-in QR code" width="200" height="200" style="display:block;border:0"/></p>
        <p><a href="${escapeHtml(opts.ticketUrl)}">Open your team ticket</a> — print or save this page and share it with teammates.</p>
        <p>${escapeHtml(shareBlurb)}</p>
        <p><a href="${escapeHtml(`${publicSiteUrl()}/events/${opts.reg.event_slug}`)}">Event details</a></p>
        <p style="color:#5a6b60;font-size:0.9rem">— ${escapeHtml(siteName)}</p>
      </div>
    `.trim()
    return { subject, html, text }
  }

  const subject = `Share your check-in code — ${opts.reg.event_title} is in 7 days`
  const text = [
    `Hi ${opts.reg.name},`,
    "",
    `${opts.reg.event_title} is about a week away.`,
    `Team: ${opts.reg.team_name}`,
    `When: ${when}`,
    "",
    `Check-in code: ${opts.code}`,
    `Team ticket: ${opts.ticketUrl}`,
    "",
    shareBlurb,
    "",
    `— ${siteName}`,
  ].join("\n")

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a2e24;line-height:1.5">
      <p>Hi ${escapeHtml(opts.reg.name)},</p>
      <p><strong>${escapeHtml(opts.reg.event_title)}</strong> is about a week away.</p>
      <p>
        <strong>Team:</strong> ${escapeHtml(opts.reg.team_name)}<br/>
        <strong>When:</strong> ${escapeHtml(when)}
      </p>
      <p style="font-size:1.25rem;letter-spacing:0.06em">
        <strong>Check-in code:</strong>
        <span style="font-family:ui-monospace,monospace">${escapeHtml(opts.code)}</span>
      </p>
      <p><img src="${escapeHtml(opts.qrImgSrc)}" alt="Check-in QR code" width="200" height="200" style="display:block;border:0"/></p>
      <p><a href="${escapeHtml(opts.ticketUrl)}">Open your team ticket</a> and share it with every teammate before event day.</p>
      <p>${escapeHtml(shareBlurb)}</p>
      <p style="color:#5a6b60;font-size:0.9rem">— ${escapeHtml(siteName)}</p>
    </div>
  `.trim()
  return { subject, html, text }
}

async function sendRegEmail(
  kind: "confirmation" | "reminder",
  registrationId: number,
  opts?: { force?: boolean },
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const reg = await loadRegistrationForEmail(registrationId)
  if (!reg) return { ok: false, error: "Registration not found" }

  if (!opts?.force) {
    if (kind === "confirmation" && reg.confirmation_email_sent_at) {
      return { ok: true, skipped: true }
    }
    if (kind === "reminder" && reg.reminder_email_sent_at) {
      return { ok: true, skipped: true }
    }
  }

  const code = await ensureCode(reg)
  const ticketUrl = ticketUrlForCode(code)
  const qrImgSrc = `${ticketUrl}/qr`

  const bodies = buildBodies({ kind, reg, code, ticketUrl, qrImgSrc })
  const result = await sendEmail({
    to: reg.email,
    subject: bodies.subject,
    html: bodies.html,
    text: bodies.text,
  })

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  const now = new Date().toISOString()
  if (kind === "confirmation") {
    await sql.execute(
      `UPDATE registrations SET confirmation_email_sent_at = ? WHERE id = ?`,
      [now, registrationId],
    )
  } else {
    await sql.execute(
      `UPDATE registrations SET reminder_email_sent_at = ? WHERE id = ?`,
      [now, registrationId],
    )
  }

  return { ok: true }
}

export async function sendRegistrationConfirmation(
  registrationId: number,
  opts?: { force?: boolean },
) {
  return sendRegEmail("confirmation", registrationId, opts)
}

export async function sendTeammateCheckInReminder(
  registrationId: number,
  opts?: { force?: boolean },
) {
  return sendRegEmail("reminder", registrationId, opts)
}

/** Registrations for events starting ~7 days from now (America/Chicago calendar day). */
export async function listRegistrationsForSevenDayReminder(): Promise<
  number[]
> {
  const rows = await sql`
    SELECT r.id, e.starts_at
    FROM registrations r
    INNER JOIN events e ON e.id = r.event_id
    WHERE r.status = 'confirmed' AND r.paid = 1
      AND r.reminder_email_sent_at IS NULL
      AND e.is_published = 1
  `

  const ids: number[] = []
  const target = chicagoYmdOffsetDays(7)
  for (const row of rows) {
    const starts = String(row.starts_at ?? "")
    if (!starts) continue
    const ymd = chicagoYmdFromIso(toEventIso(starts))
    if (ymd === target) ids.push(Number(row.id))
  }
  return ids
}

function chicagoYmdOffsetDays(daysFromToday: number): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  // Walk calendar days in Chicago so DST doesn't shift the target YMD.
  const parts = fmt.formatToParts(new Date())
  const y = Number(parts.find((p) => p.type === "year")?.value)
  const m = Number(parts.find((p) => p.type === "month")?.value)
  const d = Number(parts.find((p) => p.type === "day")?.value)
  const noonUtc = Date.UTC(y, m - 1, d + daysFromToday, 17, 0, 0)
  return fmt.format(new Date(noonUtc))
}

function chicagoYmdFromIso(iso: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return fmt.format(new Date(iso))
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidPlayerEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/** Send a personal check-in ticket to one player (captain share or staff resend). */
export async function sendPlayerTicketEmail(
  playerId: number,
  opts?: { force?: boolean },
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  await ensureEventPlayerTicketColumns()
  const rows = await sql`
    SELECT p.id, p.display_name, p.email, p.check_in_code, p.ticket_email_sent_at,
      r.team_name, r.name AS captain_name, e.title AS event_title,
      e.slug AS event_slug, e.location AS event_location, e.starts_at AS event_starts_at
    FROM event_players p
    INNER JOIN registrations r ON r.id = p.registration_id
    INNER JOIN events e ON e.id = p.event_id
    WHERE p.id = ${playerId}
      AND r.status = 'confirmed' AND r.paid = 1
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return { ok: false, error: "Player not found" }

  const to = String(row.email ?? "").trim()
  if (!to || !isValidPlayerEmail(to)) {
    return { ok: false, error: "Player needs a valid email." }
  }

  if (!opts?.force && row.ticket_email_sent_at) {
    return { ok: true, skipped: true }
  }

  const prefix = checkInPrefixFromSlug(String(row.event_slug ?? "MF"))
  const existingCode = row.check_in_code
    ? String(row.check_in_code).trim()
    : ""
  const code: string =
    existingCode || (await ensurePlayerCheckInCode(playerId, prefix))
  const ticketUrl = playerTicketUrlForCode(code)
  const qrImgSrc = `${ticketUrl}/qr`
  const when = formatEventDate(String(row.event_starts_at))
  const where = String(row.event_location ?? "") || "See event page for location"
  const name = String(row.display_name)
  const team = String(row.team_name ?? "").trim() || String(row.captain_name)
  const eventTitle = String(row.event_title)

  const subject = `Your check-in ticket — ${eventTitle}`
  const text = [
    `Hi ${name},`,
    "",
    `You're on team ${team} for ${eventTitle}.`,
    `When: ${when}`,
    `Where: ${where}`,
    "",
    `Your personal check-in code: ${code}`,
    `Your ticket (show this QR at the desk): ${ticketUrl}`,
    "",
    "Staff will scan your QR to check you in automatically.",
    "",
    `— ${siteName}`,
  ].join("\n")

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a2e24;line-height:1.5">
      <p>Hi ${escapeHtml(name)},</p>
      <p>You're on team <strong>${escapeHtml(team)}</strong> for <strong>${escapeHtml(eventTitle)}</strong>.</p>
      <p>
        <strong>When:</strong> ${escapeHtml(when)}<br/>
        <strong>Where:</strong> ${escapeHtml(where)}
      </p>
      <p style="font-size:1.15rem;letter-spacing:0.04em">
        <strong>Your check-in code:</strong>
        <span style="font-family:ui-monospace,monospace">${escapeHtml(code)}</span>
      </p>
      <p><img src="${escapeHtml(qrImgSrc)}" alt="Check-in QR code" width="200" height="200" style="display:block;border:0"/></p>
      <p><a href="${escapeHtml(ticketUrl)}">Open your personal ticket</a> — show this screen at the check-in desk.</p>
      <p>Staff will scan your QR to check you in automatically.</p>
      <p style="color:#5a6b60;font-size:0.9rem">— ${escapeHtml(siteName)}</p>
    </div>
  `.trim()

  const result = await sendEmail({ to, subject, html, text })
  if (!result.ok) return { ok: false, error: result.error }

  await sql.execute(
    `UPDATE event_players SET ticket_email_sent_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [new Date().toISOString(), playerId],
  )
  return { ok: true }
}

/**
 * Save teammate emails for a paid registration and send personal tickets.
 * Auth is the team check-in code (captain ticket).
 */
export async function saveAndSendPlayerTickets(opts: {
  teamCode: string
  players: Array<{ id: number; email: string }>
  forceResend?: boolean
}): Promise<{
  ok: boolean
  error?: string
  sent: number
  skipped: number
  failed: Array<{ id: number; error: string }>
}> {
  await ensureEventPlayerTicketColumns()
  const ticket = await (
    await import("@/lib/ticket")
  ).getPublicTicketByCode(opts.teamCode)
  if (!ticket) {
    return {
      ok: false,
      error: "Team ticket not found.",
      sent: 0,
      skipped: 0,
      failed: [],
    }
  }

  const byId = new Map(ticket.playerDetails.map((p) => [p.id, p]))
  let sent = 0
  let skipped = 0
  const failed: Array<{ id: number; error: string }> = []

  for (const row of opts.players) {
    const player = byId.get(row.id)
    if (!player) {
      failed.push({ id: row.id, error: "Player not on this team." })
      continue
    }
    const email = row.email.trim().toLowerCase()
    if (!email) {
      await sql.execute(
        `UPDATE event_players SET email = '', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND registration_id = ?`,
        [row.id, ticket.registrationId],
      )
      continue
    }
    if (!isValidPlayerEmail(email)) {
      failed.push({ id: row.id, error: "Invalid email." })
      continue
    }
    await sql.execute(
      `UPDATE event_players SET email = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND registration_id = ?`,
      [email, row.id, ticket.registrationId],
    )

    const mail = await sendPlayerTicketEmail(row.id, {
      force: Boolean(opts.forceResend),
    })
    if (mail.ok && mail.skipped) skipped += 1
    else if (mail.ok) sent += 1
    else failed.push({ id: row.id, error: mail.error || "Send failed." })
  }

  return {
    ok: failed.length === 0,
    sent,
    skipped,
    failed,
    error:
      failed.length > 0
        ? `Some tickets could not be sent (${failed.length}).`
        : undefined,
  }
}

export { emailConfigured }
