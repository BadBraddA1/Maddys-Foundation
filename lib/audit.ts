import { sql, type SqlRow } from "@/lib/db"

export type AuditLog = {
  id: number
  actor: string
  action: string
  entityType: string
  entityId: string
  detail: string
  createdAt: string
}

function mapAudit(row: SqlRow): AuditLog {
  return {
    id: Number(row.id),
    actor: String(row.actor ?? "system"),
    action: String(row.action ?? ""),
    entityType: String(row.entity_type ?? ""),
    entityId: String(row.entity_id ?? ""),
    detail: String(row.detail ?? ""),
    createdAt: String(row.created_at ?? ""),
  }
}

const ACTION_LABELS: Record<string, string> = {
  create_event: "Created an event",
  update_event: "Updated an event",
  delete_event: "Deleted an event",
  create_registration: "Added a registration",
  update_registration: "Updated a registration",
  delete_registration: "Deleted a registration",
  confirm_registration: "Marked a registration paid/confirmed",
  resend_confirmation: "Resent a registration confirmation email",
  test_email: "Sent a test email template",
  register: "Public registration submitted",
  invite_staff: "Invited a staff admin",
  revoke_invite: "Revoked a staff invite",
  grant_admin: "Granted admin role",
  revoke_admin: "Removed admin role",
  check_in: "Checked in a player",
  undo_check_in: "Undid a player check-in",
  release_hold: "Released a capacity hold",
  create_hold: "Created a capacity hold",
  expire_hold: "Capacity hold expired",
  stripe_checkout: "Started Stripe checkout",
  stripe_paid: "Stripe payment confirmed",
  stripe_expired: "Stripe checkout expired",
}

/** Plain-English summary for list + detail views. */
export function describeAudit(log: AuditLog): string {
  const label = ACTION_LABELS[log.action] || log.action.replace(/_/g, " ")
  const bits = [label]
  if (log.detail) bits.push(`— ${log.detail}`)
  else if (log.entityType && log.entityId) {
    bits.push(`— ${log.entityType} ${log.entityId}`)
  }
  return bits.join(" ")
}

/** Deep link into admin (or public) UI when we can resolve the target. */
export function auditTargetHref(log: AuditLog): string | null {
  const { action, entityType, entityId } = log
  if (!entityId) return null

  if (entityType === "event") {
    if (action === "register") return `/events` // public; id is event id
    return `/admin/events/${entityId}`
  }
  if (entityType === "registration") {
    // Often we only have registration id — roster lives under event; link check-in team if useful
    return `/admin/check-in/team/${entityId}`
  }
  if (entityType === "user" || entityType === "invitation") {
    return "/admin/staff"
  }
  return null
}

/** Write an audit row — kept separate so hold/release code doesn’t cycle through events.ts. */
export async function audit(
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  detail = "",
) {
  await sql.execute(
    `INSERT INTO audit_logs (actor, action, entity_type, entity_id, detail)
     VALUES (?, ?, ?, ?, ?)`,
    [actor, action, entityType, entityId, detail],
  )
}

export async function getAuditLog(id: number): Promise<AuditLog | null> {
  if (!Number.isFinite(id) || id <= 0) return null
  const rows = await sql.query(
    `SELECT id, actor, action, entity_type, entity_id, detail, created_at
     FROM audit_logs
     WHERE id = ?
     LIMIT 1`,
    [id],
  )
  return rows[0] ? mapAudit(rows[0]) : null
}

export async function listAuditLogs(opts?: {
  limit?: number
  offset?: number
  actor?: string
}): Promise<AuditLog[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500)
  const offset = Math.max(opts?.offset ?? 0, 0)
  const actor = opts?.actor?.trim()

  const result = actor
    ? await sql.query(
        `SELECT id, actor, action, entity_type, entity_id, detail, created_at
         FROM audit_logs
         WHERE actor = ?
         ORDER BY datetime(created_at) DESC, id DESC
         LIMIT ? OFFSET ?`,
        [actor, limit, offset],
      )
    : await sql.query(
        `SELECT id, actor, action, entity_type, entity_id, detail, created_at
         FROM audit_logs
         ORDER BY datetime(created_at) DESC, id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
      )

  return result.map(mapAudit)
}
