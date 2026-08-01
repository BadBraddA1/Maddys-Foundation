import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { CheckInTeamDetail } from "@/components/admin/check-in-team-detail"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import { getCheckInTeam, listCheckInHistory } from "@/lib/check-in"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ registrationId: string }> }

export default async function CheckInTeamPage({ params }: Props) {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const { registrationId: idParam } = await params
  const registrationId = Number(idParam)
  if (!Number.isFinite(registrationId)) notFound()

  const team = await getCheckInTeam(registrationId)
  if (!team) notFound()
  const history = await listCheckInHistory(registrationId)

  return (
    <div className="space-y-6">
      <Link
        href="/admin/check-in"
        className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-4"
      >
        ← Check-in desk
      </Link>
      <CheckInTeamDetail team={team} history={history} />
    </div>
  )
}
