import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"
import { listGalleryImages } from "@/lib/gallery"

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photos from Madalyn Robinson Foundation gatherings, golf scrambles, and community moments.",
}

export const revalidate = 60

export default async function GalleryPage() {
  const images = await listGalleryImages({ publishedOnly: true }).catch(() => [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeaderSolid />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <h1 className="font-display">Gallery</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Moments from our events and community — joy in Maddy&apos;s spirit.
        </p>

        {images.length === 0 ? (
          <p className="mt-12 text-muted">
            Photos coming soon.{" "}
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
                  {img.title || img.caption ? (
                    <figcaption className="mt-3">
                      {img.title ? (
                        <p className="font-medium text-ink">{img.title}</p>
                      ) : null}
                      {img.caption ? (
                        <p className="mt-1 text-sm text-muted">{img.caption}</p>
                      ) : null}
                    </figcaption>
                  ) : null}
                </figure>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
