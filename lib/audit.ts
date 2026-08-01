import { sql } from "@/lib/db"

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
