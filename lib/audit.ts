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
