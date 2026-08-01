import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeaderSolid />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-24 md:px-8">
        <h1 className="font-display">Page not found</h1>
        <p className="mt-4 text-lg text-muted">
          That link doesn&apos;t lead anywhere — let&apos;s get you back to the
          light.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 w-full max-w-xs items-center justify-center bg-deep px-6 text-sm font-medium text-on-deep"
        >
          Home
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
