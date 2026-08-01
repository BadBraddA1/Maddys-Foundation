"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { BrandMark, PrimaryNav } from "@/components/site-nav"

export type HeroHeaderMotion = "rise" | "morph" | "glass"

type Props = {
  motion: HeroHeaderMotion
}

/**
 * Home hero chrome: overlay scrolls away with the photo; after the hero
 * leaves the viewport a glass sticky bar portals to the document (so
 * `contain` on the hero can’t trap `position: fixed` over the image).
 */
export function HeroHeaderChrome({ motion }: Props) {
  const [ready, setReady] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const enter = window.requestAnimationFrame(() => setReady(true))
    const hero = document.querySelector("[data-home-hero]")
    if (!hero) {
      return () => window.cancelAnimationFrame(enter)
    }

    // Fire once the hero’s bottom edge has cleared the top of the viewport.
    const io = new IntersectionObserver(
      ([entry]) => {
        setPastHero(entry.boundingClientRect.bottom <= 0)
      },
      { threshold: [0, 1] },
    )
    io.observe(hero)

    return () => {
      window.cancelAnimationFrame(enter)
      io.disconnect()
    }
  }, [])

  const sticky = (
    <div
      className="hero-header-sticky fixed inset-x-0 top-0 z-[var(--z-sticky)] pt-[env(safe-area-inset-top)]"
      data-past={pastHero ? "true" : "false"}
      aria-hidden={!pastHero}
      // Keep it out of the tree for hit-testing while over the photo
      inert={!pastHero ? true : undefined}
    >
      <div className="hero-header-sticky-inner border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 md:px-8">
          <BrandMark tone="dark" />
          <PrimaryNav tone="dark" />
        </div>
      </div>
    </div>
  )

  return (
    <div
      className={`hero-header-chrome hero-header-chrome--${motion}`}
      data-ready={ready ? "true" : "false"}
      data-past={pastHero ? "true" : "false"}
    >
      <div
        className="hero-header-overlay bg-gradient-to-b from-deep/75 from-30% via-deep/35 to-transparent pb-8"
        aria-hidden={pastHero}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 md:px-8 md:py-4">
          <BrandMark tone="light" />
          <PrimaryNav tone="light" />
        </div>
      </div>

      {mounted ? createPortal(sticky, document.body) : null}
    </div>
  )
}
