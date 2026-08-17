import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { PoweredByBraddcorp } from "@/components/powered-by-braddcorp"
import { clerkConfigured } from "@/lib/auth"

export function StaffAuthShell({
  title,
  description,
  children,
  altHref,
  altLabel,
}: {
  title: string
  description: string
  children: ReactNode
  altHref: string
  altLabel: string
}) {
  if (!clerkConfigured()) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-3xl">Staff access</h1>
        <p className="mt-4 text-muted">Staff access is not configured yet.</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline underline-offset-4"
        >
          ← Home
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg px-5 py-12 text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8">
        <div className="text-center">
          <Link href="/" className="inline-flex">
            <Image
              src="/brand/logo-96.webp"
              alt="Madalyn Robinson Foundation"
              width={72}
              height={72}
              className="mx-auto size-[72px] rounded-full"
            />
          </Link>
          <p className="mt-5 text-sm font-medium uppercase tracking-wide text-muted">
            Madalyn Robinson Foundation
          </p>
          <h1 className="mt-2 text-balance font-display text-3xl text-ink">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
        </div>

        {children}

        <p className="text-center text-sm text-muted">
          <Link
            href={altHref}
            className="font-medium text-accent-ink underline-offset-4 hover:underline"
          >
            {altLabel}
          </Link>
        </p>

        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← Home
        </Link>

        <PoweredByBraddcorp />
      </div>
    </div>
  )
}
