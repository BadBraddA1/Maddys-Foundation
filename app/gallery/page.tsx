import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SiteHeaderSolid } from "@/components/site-header"
import { listGalleryEventTags, listGalleryImages } from "@/lib/gallery"

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photos from Madalyn Robinson Foundation gatherings, golf scrambles, and community moments.",
}

export const revalidate = 60

type Props = {
  searchParams: Promise<{ event?: string }>
}

export default async function GalleryPage({ searchParams }: Props) {
  const query = await searchParams
  const eventSlug = query.event?.trim() || undefined

  const [images, eventTags] = await Promise.all([
    listGalleryImages({
      publishedOnly: true,
      eventSlug,
    }).catch(() => []),
    listGalleryEventTags().catch(() => []),
  ])

  const activeTag = eventSlug
    ? eventTags.find((t) => t.slug === eventSlug) ?? null
    : null

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSolid />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <h1 className="font-display">Gallery</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Moments from our events and community — joy in Maddy&apos;s spirit.
        </p>

        {eventTags.length > 0 ? (
          <nav
            className="mt-8 flex flex-wrap gap-2"
            aria-label="Filter gallery by event"
          >
            <Link
              href="/gallery"
              className={`inline-flex min-h-11 items-center border px-4 text-sm font-medium ${
                !eventSlug
                  ? "border-deep bg-deep text-on-deep"
                  : "border-line bg-surface text-ink hover:bg-bg"
              }`}
            >
              All
            </Link>
            {eventTags.map((tag) => {
              const active = eventSlug === tag.slug
              return (
                <Link
                  key={tag.id}
                  href={`/gallery?event=${encodeURIComponent(tag.slug)}`}
                  className={`inline-flex min-h-11 items-center border px-4 text-sm font-medium ${
                    active
                      ? "border-deep bg-deep text-on-deep"
                      : "border-line bg-surface text-ink hover:bg-bg"
                  }`}
                >
                  {tag.title}
                  <span className="ml-2 tabular-nums text-xs opacity-70">
                    {tag.photoCount}
                  </span>
                </Link>
              )
            })}
          </nav>
        ) : null}

        {activeTag ? (
          <p className="mt-6 text-sm text-muted">
            Showing photos tagged to{" "}
            <Link
              href={`/events/${activeTag.slug}`}
              className="font-medium text-accent-ink underline underline-offset-4"
            >
              {activeTag.title}
            </Link>
            .
          </p>
        ) : null}

        {images.length === 0 ? (
          <p className="mt-12 text-muted">
            {eventSlug
              ? "No published photos for that event yet."
              : "Photos coming soon."}{" "}
            <Link href="/events" className="underline underline-offset-4">
              See upcoming events
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <li key={img.id} className="group">
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden bg-line/40">
                    <Image
                      src={img.image_url}
                      alt={img.title || "Foundation gallery photo"}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                  <figcaption className="mt-3">
                    {img.event_title && img.event_slug ? (
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                        <Link
                          href={`/gallery?event=${encodeURIComponent(img.event_slug)}`}
                          className="hover:text-ink"
                        >
                          {img.event_title}
                        </Link>
                      </p>
                    ) : null}
                    {img.title ? (
                      <p className="mt-1 font-medium text-ink">{img.title}</p>
                    ) : null}
                    {img.caption ? (
                      <p className="mt-1 text-sm text-muted">{img.caption}</p>
                    ) : null}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
