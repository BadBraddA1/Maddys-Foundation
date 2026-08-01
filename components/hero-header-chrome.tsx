"use client"

import { useEffect, useState } from "react"
import { BrandMark, PrimaryNav } from "@/components/site-nav"

export type HeroHeaderMotion = "rise" | "morph" | "glass"

type Props = {
  motion: HeroHeaderMotion
}

/**
 * Home hero chrome: overlay animates in over the photo; after the hero
 * leaves the viewport a solid sticky bar appears.
 */
export function HeroHeaderChrome({ motion }: Props) {
  const [ready, setReady] = useState(false)
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    const enter = window.requestAnimationFrame(() => setReady(true))
    const hero = document.querySelector("[data-home-hero]")
    if (!hero) {
      return () => window.cancelAnimationFrame(enter)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        setPastHero(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: "0px" },
    )
    io.observe(hero)

    return () => {
      window.cancelAnimationFrame(enter)
      io.disconnect()
    }
  }, [])

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

      <div
        className="hero-header-sticky fixed inset-x-0 top-0 z-[var(--z-sticky)] pt-[env(safe-area-inset-top)]"
        aria-hidden={!pastHero}
      >
        <div className="hero-header-sticky-inner border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 md:px-8">
            <BrandMark tone="dark" />
            <PrimaryNav tone="dark" />
          </div>
        </div>
      </div>
    </div>
  )
}
