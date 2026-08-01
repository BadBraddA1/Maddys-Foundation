import Link from "next/link"
import { redirect } from "next/navigation"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import {
  capacityUnitLabel,
  formatEventDate,
  isTeamEvent,
  listAllEvents,
} from "@/lib/events"

export const dynamic = "force-dynamic"

export default async function AdminHomePage() {
  if (!adminAvailable()) {
    return null
  }

  const admin = await getAdminOrNull()
  if (!admin) {
    return (
      <div>
        <h1 className="font-display text-3xl">Access needed</h1>
        <p className="mt-3 text-muted">
          Your Clerk user needs{" "}
          <code className="text-ink">publicMetadata.role = &quot;admin&quot;</code>.
        </p>
      </div>
    )
  }

  let events: Awaited<ReturnType<typeof listAllEvents>> = []
  try {
    events = await listAllEvents()
  } catch {
    redirect("/")
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Events</h1>
          <p className="mt-1 text-sm text-muted">
            Create gatherings and open registration.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex min-h-11 items-center bg-deep px-5 text-sm font-medium text-on-deep"
        >
          New event
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-10 text-muted">No events yet. Create the first one.</p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-t border-line">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-ink">{event.title}</p>
                <p className="text-sm text-muted">
                  {formatEventDate(event.starts_at)} ·{" "}
                  {event.is_published ? "Published" : "Draft"} ·{" "}
                  {event.registration_open ? "Reg open" : "Reg closed"} ·{" "}
                  {event.confirmed_count ?? 0}
                  {event.capacity != null ? ` / ${event.capacity}` : ""}{" "}
                  {capacityUnitLabel(event)} paid
                  {isTeamEvent(event) &&
                  (event.registration_count ?? 0) >
                    (event.confirmed_count ?? 0)
                    ? ` · ${(event.registration_count ?? 0) - (event.confirmed_count ?? 0)} held`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm font-medium">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/events/${event.id}/registrations`}
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  Roster
                </Link>
                {event.is_published ? (
                  <Link
                    href={`/events/${event.slug}`}
                    className="inline-flex min-h-11 items-center text-muted underline underline-offset-4"
                  >
                    Public
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
