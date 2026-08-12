import Link from "next/link"
import { redirect } from "next/navigation"
import { SponsorsAdmin } from "@/components/admin/sponsors-admin"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import { r2Configured } from "@/lib/r2"
import { listPackageAvailability } from "@/lib/sponsor-hold"

export const dynamic = "force-dynamic"

export default async function AdminSponsorsPage() {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const { ensureSponsorPaymentColumns, listSponsors } = await import(
    "@/lib/sponsors"
  )
  const { ensureSponsorPackageConfigSchema } = await import(
    "@/lib/sponsor-packages"
  )
  await ensureSponsorPaymentColumns().catch(() => undefined)
  await ensureSponsorPackageConfigSchema().catch(() => undefined)
  const [sponsors, packages] = await Promise.all([
    listSponsors().catch(() => []),
    listPackageAvailability().catch(() => []),
  ])

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
          Edit package spot counts, add check-paid sponsors to claim inventory,
          or email Stripe pay links. Logos scroll above the site footer. Test
          emails at{" "}
          <Link href="/admin/email" className="underline underline-offset-4">
            /admin/email
          </Link>
          .
        </p>
      </div>
      <SponsorsAdmin
        initialSponsors={sponsors}
        initialPackages={packages}
        r2Ready={r2Configured()}
      />
    </div>
  )
}
