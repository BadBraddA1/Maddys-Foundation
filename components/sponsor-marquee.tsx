"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { PublicSponsor } from "@/lib/sponsors"

/** One full loop (half the duplicated track) in ms — used for wall-clock phase. */
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

function estimateCopies(sponsorCount: number): number {
  const width =
    typeof window !== "undefined" ? window.innerWidth : 1200
  const approxSet = Math.max(sponsorCount, 1) * 160
  return Math.max(1, Math.ceil(width / approxSet)) * 2
}

/**
 * Infinite horizontal sponsor strip.
 * Position is driven by wall-clock time (rAF), not CSS animation — remounts
 * and navigations land on the same phase. Logo set is duplicated until each
 * half fills the viewport.
 */
export function SponsorMarquee({ sponsors }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const [copies, setCopies] = useState(() =>
    estimateCopies(Math.max(sponsors.length, 1)),
  )
  const [reduceMotion, setReduceMotion] = useState(false)

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

    const measure = () => {
      const kids = track.children
      if (kids.length < sponsors.length) return
      let setWidth = 0
      for (let i = 0; i < sponsors.length; i++) {
        setWidth += (kids[i] as HTMLElement).offsetWidth
      }
      if (setWidth <= 0) return
      const setsPerHalf = Math.max(
        1,
        Math.ceil(viewport.clientWidth / setWidth),
      )
      const next = setsPerHalf * 2
      setCopies((prev) => (prev === next ? prev : next))
    }

    measure()
    const onResize = () => {
      setCopies(estimateCopies(sponsors.length))
      requestAnimationFrame(measure)
    }
    window.addEventListener("resize", onResize)
    track.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", measure, { once: true })
    })
    return () => window.removeEventListener("resize", onResize)
  }, [sponsors, copies])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduceMotion(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  // Wall-clock driven scroll — same Date.now() phase after any remount.
  useEffect(() => {
    if (reduceMotion || sponsors.length === 0) return
    const track = trackRef.current
    if (!track) return

    let raf = 0
    const tick = () => {
      const el = trackRef.current
      if (el && !pausedRef.current) {
        const half = el.scrollWidth / 2
        if (half > 0) {
          const phase =
            (Date.now() % SPONSOR_MARQUEE_DURATION_MS) /
            SPONSOR_MARQUEE_DURATION_MS
          el.style.transform = `translate3d(${-phase * half}px,0,0)`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduceMotion, sponsors.length, copies, loop.length])

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
        onMouseEnter={() => {
          pausedRef.current = true
        }}
        onMouseLeave={() => {
          pausedRef.current = false
        }}
      >
        <div
          ref={trackRef}
          className={
            reduceMotion
              ? "sponsor-marquee-track sponsor-marquee-track--static flex w-max items-center"
              : "sponsor-marquee-track flex w-max items-center will-change-transform"
          }
        >
          {loop.map((sponsor, i) => (
            <SponsorMark key={`${sponsor.id}-${i}`} sponsor={sponsor} />
          ))}
        </div>
      </div>
    </div>
  )
}
