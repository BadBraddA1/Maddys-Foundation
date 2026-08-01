"use client"

import { useEffect, useState } from "react"
import { BrandMark, PrimaryNav } from "@/components/site-nav"

/**
 * Single fixed home chrome — scrim over the photo, solid after the hero leaves.
 * One nav tree (no portal / duplicate BrandMark). Requires no CSS `contain` on the hero.
 */
export function HeroHeaderChrome() {
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

  const tone = pastHero ? "dark" : "light"

  return (
    <div
      className="hero-header-bar fixed inset-x-0 top-0 z-[var(--z-sticky)] pt-[env(safe-area-inset-top)]"
      data-ready={ready ? "true" : "false"}
      data-past={pastHero ? "true" : "false"}
    >
      <div
        className={
          pastHero
            ? "hero-header-bar-inner border-b border-line bg-surface"
            : "hero-header-bar-inner bg-gradient-to-b from-deep/75 from-30% via-deep/35 to-transparent pb-8"
        }
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 md:px-8 md:py-4">
          <BrandMark tone={tone} />
          <PrimaryNav tone={tone} />
        </div>
      </div>
    </div>
  )
}
