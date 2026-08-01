"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { PublicSponsor } from "@/lib/sponsors"

/** Must match `.sponsor-marquee-track` animation duration in globals.css */
export const SPONSOR_MARQUEE_DURATION_MS = 40_000

type Props = { sponsors: PublicSponsor[] }

function SponsorMark({ sponsor }: { sponsor: PublicSponsor }) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sponsor.logo_url}
        alt=""
        className="h-10 w-auto max-w-[9rem] object-contain opacity-90 sm:h-12 sm:max-w-[11rem]"
      />
      <span className="sr-only">{sponsor.name}</span>
    </>
  )

  if (sponsor.website_url) {
    return (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center justify-center px-6 opacity-90 transition hover:opacity-100"
        title={sponsor.name}
      >
        {inner}
      </a>
    )
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center px-6"
      title={sponsor.name}
    >
      {inner}
    </span>
  )
}

/**
 * Infinite horizontal sponsor strip.
 * Duplicates the logo set until each animation half fills the viewport
 * (so few sponsors don’t leave a blank right half of the screen).
 */
export function SponsorMarquee({ sponsors }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  /** How many copies of the full sponsor list are in the track (always even ≥ 2). */
  const [copies, setCopies] = useState(4)

  const loop = useMemo(() => {
    if (sponsors.length === 0) return []
    const out: PublicSponsor[] = []
    for (let c = 0; c < copies; c++) out.push(...sponsors)
    return out
  }, [sponsors, copies])

  useLayoutEffect(() => {
    if (sponsors.length === 0) return
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return

    let cancelled = false

    const measureAndFill = () => {
      if (cancelled) return
      const kids = track.children
      if (kids.length < sponsors.length) return

      let setWidth = 0
      for (let i = 0; i < sponsors.length; i++) {
        setWidth += (kids[i] as HTMLElement).offsetWidth
      }
      if (setWidth <= 0) return

      // One animation half must cover the viewport; track = 2 halves (−50% keyframes).
      const setsPerHalf = Math.max(1, Math.ceil(viewport.clientWidth / setWidth))
      const nextCopies = setsPerHalf * 2
      setCopies((prev) => (prev === nextCopies ? prev : nextCopies))
    }

    const syncClock = () => {
      if (cancelled || !trackRef.current) return
      const offsetMs = Date.now() % SPONSOR_MARQUEE_DURATION_MS
      trackRef.current.style.animationDelay = `-${offsetMs}ms`
    }

    measureAndFill()
    syncClock()

    const onResize = () => {
      measureAndFill()
      syncClock()
    }
    window.addEventListener("resize", onResize)

    // Logos loading can change widths.
    const imgs = track.querySelectorAll("img")
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", measureAndFill, { once: true })
    })

    return () => {
      cancelled = true
      window.removeEventListener("resize", onResize)
    }
  }, [sponsors, copies])

  if (sponsors.length === 0) return null

  return (
    <div className="border-b border-on-deep-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pt-5 sm:px-6 md:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-on-deep-faint">
          Sponsors
        </p>
      </div>
      <div
        ref={viewportRef}
        className="sponsor-marquee relative mt-3 overflow-hidden pb-5"
      >
        <div
          ref={trackRef}
          className="sponsor-marquee-track flex w-max items-center"
        >
          {loop.map((sponsor, i) => (
            <SponsorMark
              key={`${sponsor.id}-${i}`}
              sponsor={sponsor}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
