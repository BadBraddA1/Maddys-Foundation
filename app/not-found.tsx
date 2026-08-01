import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeaderSolid />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-24 md:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          404
        </p>
        <h1 className="mt-3 font-display text-4xl">Page not found</h1>
        <p className="mt-4 text-lg text-muted">
          That link doesn&apos;t lead anywhere — let&apos;s get you back to the
          light.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex w-fit rounded-full bg-deep px-6 py-3 text-sm font-semibold text-white"
        >
          Home
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
