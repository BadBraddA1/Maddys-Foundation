import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { clerkConfigured, getAdminOrNull } from "@/lib/auth"
import { getEventById, listRegistrations } from "@/lib/events"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export default async function RegistrationsPage({ params }: Props) {
  if (!clerkConfigured()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const { id } = await params
  const event = await getEventById(Number(id)).catch(() => null)
  if (!event) notFound()

  const rows = await listRegistrations(event.id)

  return (
    <div>
      <Link href="/admin" className="text-sm text-muted hover:text-ink">
        ← Events
      </Link>
      <h1 className="mt-4 font-display text-3xl">{event.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {rows.length} registration{rows.length === 1 ? "" : "s"}
      </p>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">No registrations yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Guests</th>
                <th className="py-2 pr-4 font-medium">Paid</th>
                <th className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4 font-medium text-ink">{row.name}</td>
                  <td className="py-3 pr-4">{row.email}</td>
                  <td className="py-3 pr-4">{row.phone || "—"}</td>
                  <td className="py-3 pr-4">{row.guests}</td>
                  <td className="py-3 pr-4">{row.paid ? "Yes" : "No"}</td>
                  <td className="py-3 max-w-xs truncate">{row.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
