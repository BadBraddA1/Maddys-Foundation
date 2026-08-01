import Link from "next/link"
import { redirect } from "next/navigation"
import { SponsorsAdmin } from "@/components/admin/sponsors-admin"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import { r2Configured } from "@/lib/r2"
import { listSponsors } from "@/lib/sponsors"

export const dynamic = "force-dynamic"

export default async function AdminSponsorsPage() {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const sponsors = await listSponsors().catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-4"
        >
          ← Events
        </Link>
        <h1 className="mt-4 font-display text-3xl">Sponsors</h1>
        <p className="mt-1 text-sm text-muted">
          Logos scroll above the site footer. Collect a point of contact and
          email for later outreach — contacts stay staff-only.
        </p>
      </div>
      <SponsorsAdmin initialSponsors={sponsors} r2Ready={r2Configured()} />
    </div>
  )
}
