import { BrandMark, PrimaryNav } from "@/components/site-nav"
import { SkipLink } from "@/components/skip-link"
import { HeroHeaderChrome } from "@/components/hero-header-chrome"

type HomeHeaderProps = {
  /** Skip past chrome to the hero headline (inside `<main>`). */
  skipHref?: string
}

/** Overlay header for the photo hero — one fixed bar (scrim → solid after scroll). */
export function SiteHeader({ skipHref = "#hero-copy" }: HomeHeaderProps = {}) {
  return (
    <>
      <SkipLink href={skipHref} />
      <header className="absolute inset-x-0 top-0 z-[var(--z-sticky)] pt-[env(safe-area-inset-top)]">
        <HeroHeaderChrome />
      </header>
    </>
  )
}

/** Solid header for interior pages — brand + nav only (countdown lives on the home page). */
export function SiteHeaderSolid() {
  return (
    <>
      <SkipLink />
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 md:px-8">
          <BrandMark tone="dark" />
          <PrimaryNav tone="dark" />
        </div>
      </header>
    </>
  )
}
