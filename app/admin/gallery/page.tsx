import Link from "next/link"
import { redirect } from "next/navigation"
import { GalleryAdmin } from "@/components/admin/gallery-admin"
import { adminAvailable, getAdminOrNull } from "@/lib/auth"
import { listAllEvents } from "@/lib/events"
import { listGalleryImages } from "@/lib/gallery"
import { r2Configured } from "@/lib/r2"

export const dynamic = "force-dynamic"

export default async function AdminGalleryPage() {
  if (!adminAvailable()) return null
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const [images, events] = await Promise.all([
    listGalleryImages().catch(() => []),
    listAllEvents().catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-4"
        >
          ← Events
        </Link>
        <h1 className="mt-4 font-display text-3xl">Gallery</h1>
        <p className="mt-1 text-sm text-muted">
          Photos appear on the public{" "}
          <Link href="/gallery" className="underline underline-offset-4">
            /gallery
          </Link>{" "}
          page. Tag a photo to an event to filter it there.
        </p>
      </div>
      <GalleryAdmin
        initialImages={images}
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
        }))}
        r2Ready={r2Configured()}
      />
    </div>
  )
}
