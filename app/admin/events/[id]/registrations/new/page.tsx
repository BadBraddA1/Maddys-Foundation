import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { RegistrationForm } from "@/components/admin/registration-form"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import { getEventById } from "@/lib/events"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export default async function NewRegistrationPage({ params }: Props) {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const { id } = await params
  const event = await getEventById(Number(id)).catch(() => null)
  if (!event) notFound()

  return (
    <div>
      <Link
        href={`/admin/events/${event.id}/registrations`}
        className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
      >
        ← Roster
      </Link>
      <h1 className="mt-4 font-display text-3xl">Add registration</h1>
      <p className="mt-1 text-sm text-muted">{event.title}</p>
      <div className="mt-8 max-w-2xl">
        <RegistrationForm
          eventId={event.id}
          teamSize={event.team_size}
          mode="create"
        />
      </div>
    </div>
  )
}
