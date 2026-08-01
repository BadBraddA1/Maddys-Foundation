import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { EventForm } from "@/components/admin/event-form"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import { getEventById } from "@/lib/events"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export default async function EditEventPage({ params }: Props) {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const { id } = await params
  const event = await getEventById(Number(id)).catch(() => null)
  if (!event) notFound()

  return (
    <div>
      <Link href="/admin" className="text-sm text-muted hover:text-ink">
        ← Events
      </Link>
      <h1 className="mt-4 font-display text-3xl">Edit event</h1>
      <div className="mt-8 max-w-xl">
        <EventForm event={event} />
      </div>
    </div>
  )
}
