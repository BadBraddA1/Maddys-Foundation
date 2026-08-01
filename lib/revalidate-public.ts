import { revalidatePath } from "next/cache"

/** Bust ISR caches for public marketing + event surfaces after writes. */
export function revalidatePublicEvents(slug?: string | null) {
  revalidatePath("/")
  revalidatePath("/events")
  if (slug) {
    revalidatePath(`/events/${slug}`)
    revalidatePath(`/events/${slug}/register`)
  }
}
