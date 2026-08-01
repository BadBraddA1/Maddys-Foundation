import { redirect } from "next/navigation"
import { CheckInDashboard } from "@/components/admin/check-in-dashboard"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import { listAllEvents } from "@/lib/events"

export const dynamic = "force-dynamic"

export default async function CheckInDashboardPage() {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const events = await listAllEvents().catch(() => [])
  const teamEvents = events.filter((e) => e.team_size && e.team_size > 1)
  const event =
    teamEvents.find((e) => e.slug.includes("golf")) ||
    teamEvents[0] ||
    events[0]

  if (!event) {
    return (
      <div>
        <h1 className="font-display text-3xl">Check-in dashboard</h1>
        <p className="mt-4 text-muted">No events yet.</p>
      </div>
    )
  }

  return <CheckInDashboard eventId={event.id} eventTitle={event.title} />
}
