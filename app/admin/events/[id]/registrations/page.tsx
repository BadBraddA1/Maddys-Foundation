import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ConfirmRegistrationButton } from "@/components/admin/confirm-registration-button"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import {
  capacityUnitLabel,
  getEventById,
  isTeamEvent,
  listRegistrations,
} from "@/lib/events"
import { formatPhoneDisplay, phoneTelHref } from "@/lib/phone"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export default async function RegistrationsPage({ params }: Props) {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const { id } = await params
  const event = await getEventById(Number(id)).catch(() => null)
  if (!event) notFound()

  const rows = await listRegistrations(event.id)

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
      >
        ← Events
      </Link>
      <h1 className="mt-4 break-words font-display text-3xl">{event.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {rows.length} paid {capacityUnitLabel(event, rows.length)}
        {event.capacity != null
          ? ` · capacity ${event.capacity} ${capacityUnitLabel(event)}`
          : ""}
        {isTeamEvent(event) ? ` · ${event.team_size}-person teams` : ""}
      </p>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">
          No paid {capacityUnitLabel(event)} yet.
        </p>
      ) : (
        <>
          {/* Phone: stacked records — table is awkward under ~640px */}
          <ul className="mt-8 space-y-4 md:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                className="border border-line bg-surface px-4 py-4"
              >
                <p className="break-words font-medium text-ink">{row.name}</p>
                <a
                  href={`mailto:${row.email}`}
                  className="mt-1 inline-flex min-h-11 max-w-full items-center break-all text-sm text-accent-ink underline underline-offset-4"
                >
                  {row.email}
                </a>
                {row.phone ? (
                  <a
                    href={phoneTelHref(row.phone) ?? undefined}
                    className="mt-1 flex min-h-11 items-center text-sm text-muted underline underline-offset-4"
                  >
                    {formatPhoneDisplay(row.phone)}
                  </a>
                ) : null}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-muted">Guests</dt>
                    <dd className="font-medium tabular-nums text-ink">{row.guests}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Status</dt>
                    <dd className="font-medium text-ink capitalize">{row.status}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Paid</dt>
                    <dd className="font-medium text-ink">{row.paid ? "Yes" : "No"}</dd>
                  </div>
                </dl>
                {row.notes ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted text-pretty">
                    {row.notes}
                  </p>
                ) : null}
                <div className="mt-3">
                  <ConfirmRegistrationButton
                    eventId={event.id}
                    registrationId={row.id}
                    alreadyConfirmed={row.status === "confirmed" && row.paid === 1}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Phone</th>
                  <th className="py-2 pr-4 font-medium">Guests</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Paid</th>
                  <th className="py-2 pr-4 font-medium">Notes</th>
                  <th className="py-2 font-medium"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-4 font-medium text-ink">{row.name}</td>
                    <td className="py-3 pr-4">{row.email}</td>
                    <td className="py-3 pr-4">
                      {row.phone ? formatPhoneDisplay(row.phone) : "—"}
                    </td>
                    <td className="py-3 pr-4">{row.guests}</td>
                    <td className="py-3 pr-4 capitalize">{row.status}</td>
                    <td className="py-3 pr-4">{row.paid ? "Yes" : "No"}</td>
                    <td className="max-w-xs whitespace-pre-wrap py-3 pr-4 text-sm">
                      {row.notes || "—"}
                    </td>
                    <td className="py-3">
                      <ConfirmRegistrationButton
                        eventId={event.id}
                        registrationId={row.id}
                        alreadyConfirmed={
                          row.status === "confirmed" && row.paid === 1
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
