import Link from "next/link"
import { getAdminOrNull } from "@/lib/auth"
import { listAuditLogs } from "@/lib/audit"

export const dynamic = "force-dynamic"

function formatWhen(iso: string) {
  const d = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string }>
}) {
  const admin = await getAdminOrNull()
  if (!admin) return null

  const params = await searchParams
  const actorFilter = params.actor?.trim() || undefined

  let logs: Awaited<ReturnType<typeof listAuditLogs>> = []
  let loadError: string | null = null
  try {
    logs = await listAuditLogs({ limit: 200, actor: actorFilter })
  } catch (err) {
    console.error("[admin/audit]", err)
    loadError = "Could not load audit logs."
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Audit log</h1>
          <p className="mt-2 text-sm text-muted">
            Staff and system actions — who changed what, newest first.
          </p>
        </div>
        {actorFilter ? (
          <Link
            href="/admin/audit"
            className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
          >
            Clear filter
          </Link>
        ) : null}
      </div>

      {actorFilter ? (
        <p className="mb-6 text-sm text-muted">
          Showing actions by <span className="font-medium text-ink">{actorFilter}</span>
        </p>
      ) : null}

      {loadError ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {loadError}
        </p>
      ) : logs.length === 0 ? (
        <p className="text-muted">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-3 pr-4 font-medium">When</th>
                <th className="py-3 pr-4 font-medium">Who</th>
                <th className="py-3 pr-4 font-medium">Action</th>
                <th className="py-3 pr-4 font-medium">Target</th>
                <th className="py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 pr-4 whitespace-nowrap text-muted">
                    {formatWhen(log.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/audit?actor=${encodeURIComponent(log.actor)}`}
                      className="font-medium text-ink underline underline-offset-4"
                    >
                      {log.actor}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-medium text-ink">{log.action}</td>
                  <td className="py-3 pr-4 text-muted">
                    {log.entityType}
                    {log.entityId ? (
                      <>
                        {" · "}
                        <span className="text-ink">{log.entityId}</span>
                      </>
                    ) : null}
                  </td>
                  <td className="py-3 text-muted">{log.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
