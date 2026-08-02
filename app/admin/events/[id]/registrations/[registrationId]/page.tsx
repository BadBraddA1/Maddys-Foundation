import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { RegistrationForm } from "@/components/admin/registration-form"
import {
  extractExtraNotes,
  getAdminRegistrationDetail,
} from "@/lib/admin-registrations"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string; registrationId: string }> }

export default async function EditRegistrationPage({ params }: Props) {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const { id, registrationId } = await params
  const detail = await getAdminRegistrationDetail(
    Number(id),
    Number(registrationId),
  ).catch(() => null)
  if (!detail) notFound()

  const { event, registration, players } = detail

  return (
    <div>
      <Link
        href={`/admin/events/${event.id}/registrations`}
        className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
      >
        ← Roster
      </Link>
      <h1 className="mt-4 font-display text-3xl">Edit registration</h1>
      <p className="mt-1 text-sm text-muted">
        {event.title}
        {registration.check_in_code
          ? ` · ${registration.check_in_code}`
          : ""}
      </p>
      <div className="mt-8 max-w-2xl">
        <RegistrationForm
          eventId={event.id}
          teamSize={event.team_size}
          mode="edit"
          registrationId={registration.id}
          initial={{
            name: registration.name,
            email: registration.email,
            phone: registration.phone,
            team_name: registration.team_name,
            guests: registration.guests,
            notes: extractExtraNotes(registration.notes),
            players: players.map((p) => ({
              id: p.id,
              display_name: p.display_name,
              email: p.email,
              checked_in: p.checked_in,
              check_in_code: p.check_in_code,
            })),
          }}
        />
      </div>
    </div>
  )
}
