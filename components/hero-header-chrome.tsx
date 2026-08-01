"use client"

import { useEffect, useState } from "react"
import { BrandMark, PrimaryNav } from "@/components/site-nav"

/** Start fading to solid while a bit of hero is still on screen — avoids a hard snap. */
const SOLIDIFY_WITHIN_PX = 96

/**
 * Single fixed home chrome — green scrim over the photo, solid bar after scroll.
 * Layers crossfade so the switch isn’t flashy.
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

    const update = () => {
      const bottom = hero.getBoundingClientRect().bottom
      setPastHero(bottom <= SOLIDIFY_WITHIN_PX)
    }

    update()

    const io = new IntersectionObserver(() => update(), {
      threshold: [0, 0.01, 0.1, 1],
    })
    io.observe(hero)

    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)

    return () => {
      window.cancelAnimationFrame(enter)
      io.disconnect()
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return (
    <div
      className="hero-header-bar fixed inset-x-0 top-0 z-[var(--z-sticky)] pt-[env(safe-area-inset-top)]"
      data-ready={ready ? "true" : "false"}
      data-past={pastHero ? "true" : "false"}
    >
      <div
        className={`hero-header-bar-inner relative border-b ${
          pastHero ? "border-on-deep-border" : "border-transparent"
        }`}
      >
        {/* Solid fairway bar — fades in */}
        <div
          className={`pointer-events-none absolute inset-0 bg-deep transition-opacity duration-500 ease-[var(--ease-out-quart)] ${
            pastHero ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
        {/* Photo scrim — fades out */}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-deep/80 from-25% via-deep/40 to-transparent transition-opacity duration-500 ease-[var(--ease-out-quart)] ${
            pastHero ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 md:px-8 md:py-4">
          <BrandMark tone="light" />
          <PrimaryNav tone="light" />
        </div>
      </div>
    </div>
  )
}
