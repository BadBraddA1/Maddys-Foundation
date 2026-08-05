import Link from "next/link"
import { notFound } from "next/navigation"
import { getAdminOrNull } from "@/lib/auth"
import {
  auditTargetHref,
  describeAudit,
  getAuditLog,
} from "@/lib/audit"

export const dynamic = "force-dynamic"

function formatWhen(iso: string) {
  const d = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "full",
    timeStyle: "long",
  })
}

type Ctx = { params: Promise<{ id: string }> }

export default async function AdminAuditDetailPage({ params }: Ctx) {
  const admin = await getAdminOrNull()
  if (!admin) return null

  const { id: raw } = await params
  const id = Number(raw)
  const log = Number.isFinite(id) ? await getAuditLog(id) : null
  if (!log) notFound()

  const targetHref = auditTargetHref(log)
  const summary = describeAudit(log)

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/audit"
        className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4 hover:text-ink"
      >
        ← Audit log
      </Link>

      <h1 className="mt-6 font-display text-3xl">Audit entry #{log.id}</h1>
      <p className="mt-3 text-lg text-ink">{summary}</p>

      <dl className="mt-10 divide-y divide-line border-t border-b border-line">
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
          <dt className="w-36 shrink-0 text-sm font-medium text-muted">When</dt>
          <dd className="text-ink">{formatWhen(log.createdAt)}</dd>
        </div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
          <dt className="w-36 shrink-0 text-sm font-medium text-muted">Who</dt>
          <dd>
            <Link
              href={`/admin/audit?actor=${encodeURIComponent(log.actor)}`}
              className="font-medium text-ink underline underline-offset-4"
            >
              {log.actor}
            </Link>
          </dd>
        </div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
          <dt className="w-36 shrink-0 text-sm font-medium text-muted">Action</dt>
          <dd className="font-medium text-ink">
            <code className="text-sm">{log.action}</code>
          </dd>
        </div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
          <dt className="w-36 shrink-0 text-sm font-medium text-muted">Target type</dt>
          <dd className="text-ink">{log.entityType || "—"}</dd>
        </div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
          <dt className="w-36 shrink-0 text-sm font-medium text-muted">Target id</dt>
          <dd className="text-ink break-all">{log.entityId || "—"}</dd>
        </div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
          <dt className="w-36 shrink-0 text-sm font-medium text-muted">Detail</dt>
          <dd className="whitespace-pre-wrap text-ink">{log.detail || "—"}</dd>
        </div>
      </dl>

      {targetHref ? (
        <Link
          href={targetHref}
          className="btn-deep mt-8 inline-flex min-h-11 items-center px-5 text-sm font-medium"
        >
          Open related page
        </Link>
      ) : null}
    </div>
  )
}
