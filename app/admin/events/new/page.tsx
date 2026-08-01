import Link from "next/link"
import { redirect } from "next/navigation"
import { EventForm } from "@/components/admin/event-form"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"

export default async function NewEventPage() {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
      >
        ← Events
      </Link>
      <h1 className="mt-4 font-display text-3xl">New event</h1>
      <div className="mt-8 max-w-xl">
        <EventForm />
      </div>
    </div>
  )
}
