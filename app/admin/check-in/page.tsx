import { redirect } from "next/navigation"
import { CheckInDesk } from "@/components/admin/check-in-desk"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import { listAllEvents } from "@/lib/events"

export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<{ team?: string; eventId?: string; code?: string }>
}

export default async function CheckInPage({ searchParams }: Props) {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const query = await searchParams
  const events = await listAllEvents().catch(() => [])
  const teamEvents = events.filter((e) => e.team_size && e.team_size > 1)
  const preferredId = query.eventId ? Number(query.eventId) : NaN
  const event =
    (Number.isFinite(preferredId)
      ? teamEvents.find((e) => e.id === preferredId)
      : null) ||
    teamEvents.find((e) => e.slug.includes("golf")) ||
    teamEvents[0] ||
    events[0]

  if (!event) {
    return (
      <div>
        <h1 className="font-display text-3xl">Player check-in</h1>
        <p className="mt-4 text-muted">
          No events yet. Create a team event first, then return here.
        </p>
      </div>
    )
  }

  const initialTeamId = query.team ? Number(query.team) : null
  const initialCode = query.code?.trim() || null

  return (
    <CheckInDesk
      eventId={event.id}
      eventTitle={event.title}
      initialTeamId={
        initialTeamId && Number.isFinite(initialTeamId) ? initialTeamId : null
      }
      initialCode={initialCode}
    />
  )
}
