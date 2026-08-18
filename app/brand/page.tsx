import type { Metadata } from "next"
import { SiteHeaderSolid } from "@/components/site-header"
import { logoVariants, type LogoVariant } from "@/lib/logo-downloads"
import { siteName } from "@/lib/site-metadata"

export const metadata: Metadata = {
  title: "Logos",
  description: `Download ${siteName} logos for print, web, and dark backgrounds.`,
}

function DownloadRow({ variant }: { variant: LogoVariant }) {
  return (
    <div className="flex flex-wrap gap-2">
      {variant.files.map((file) => (
        <a
          key={file.filename}
          href={file.href}
          download={file.filename}
          className={
            variant.plate === "deep"
              ? "motion-press inline-flex min-h-11 items-center justify-center border border-on-deep-border px-5 text-sm font-medium text-on-deep hover:bg-on-deep-hover"
              : "motion-press inline-flex min-h-11 items-center justify-center bg-accent px-5 text-sm font-medium text-accent-ink"
          }
        >
          Download {file.label}
        </a>
      ))}
    </div>
  )
}

function LogoPlate({ variant }: { variant: LogoVariant }) {
  const deep = variant.plate === "deep"

  return (
    <article
      className={
        deep
          ? "bg-deep px-6 py-10 text-on-deep sm:px-10 sm:py-14"
          : "border-t border-line bg-bg px-6 py-10 sm:px-10 sm:py-14"
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:items-center md:gap-14">
        <div
          className={`flex aspect-square w-full max-w-[16rem] items-center justify-center rounded-full p-6 ${
            deep ? "bg-deep-mid" : "bg-surface ring-1 ring-line"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={variant.preview}
            alt={`${siteName} logo — ${variant.title.toLowerCase()}`}
            width={1179}
            height={1089}
            className="h-auto w-full"
          />
        </div>
        <div className="min-w-0 flex-1 text-center md:text-left">
          <h2 className="font-display text-2xl tracking-tight md:text-3xl">
            {variant.title}
          </h2>
          <p
            className={`mt-3 max-w-prose text-base leading-relaxed ${
              deep ? "text-on-deep-muted" : "text-muted"
            }`}
          >
            {variant.blurb}
          </p>
          <div className="mt-6 flex justify-center md:justify-start">
            <DownloadRow variant={variant} />
          </div>
        </div>
      </div>
    </article>
  )
}

export default function BrandLogosPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSolid />
      <main id="main" className="flex-1">
        <header className="mx-auto w-full max-w-3xl px-5 py-16 md:px-8 md:py-24">
          <h1 className="font-display">Logos</h1>
          <p className="prose-measure mt-6 text-lg leading-relaxed text-muted">
            Use these files when you sponsor the scramble, print a program, or
            share Maddy&apos;s foundation online. Keep the circle. Don&apos;t
            recolor — black on light, white on dark.
          </p>
        </header>

        {logoVariants.map((variant) => (
          <LogoPlate key={variant.id} variant={variant} />
        ))}
      </main>
    </div>
  )
}
