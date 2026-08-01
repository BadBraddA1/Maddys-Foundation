"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toEventIso } from "@/lib/events"

type Parts = { days: number; hours: number; mins: number; secs: number }

function split(ms: number): Parts {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return { days, hours, mins, secs }
}

type Props = {
  targetIso: string
  title: string
  href: string
  /** compact = inline chip · stacked = unit columns · days = big day count · featured = home centerpiece */
  layout?: "compact" | "stacked" | "days" | "featured"
}

/** Live countdown to the next published event. Client-only clock to avoid SSR hydration drift. */
export function NextEventCountdown({
  targetIso,
  title,
  href,
  layout = "compact",
}: Props) {
  const target = new Date(toEventIso(targetIso)).getTime()
  const [parts, setParts] = useState<Parts | null>(null)

  useEffect(() => {
    if (Number.isNaN(target)) return
    const tick = () => setParts(split(target - Date.now()))
    tick()
    // Featured home clock doesn’t need second-precision; quieter updates.
    const ms = layout === "featured" ? 30_000 : 1000
    const id = window.setInterval(tick, ms)
    const onVis = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [target, layout])

  const ended = Number.isNaN(target) || (!!parts && target <= Date.now())
  const ready = parts !== null
  const display = parts ?? { days: 0, hours: 0, mins: 0, secs: 0 }

  if (ended && ready) {
    return (
      <Link
        href={href}
        className="countdown-enter inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline decoration-accent/70 underline-offset-4"
      >
        See events →
      </Link>
    )
  }

  if (layout === "featured") {
    const units = [
      { label: "Days", value: display.days },
      { label: "Hours", value: display.hours },
      { label: "Minutes", value: display.mins },
    ]
    return (
      <div
        className={`countdown-featured text-center ${ready ? "is-ready" : ""}`}
      >
        <p className="text-sm text-muted">Next gathering</p>
        <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">
          <Link href={href} className="transition hover:text-accent-ink">
            {title}
          </Link>
        </h2>
        <Link
          href={href}
          className="countdown-enter mt-8 inline-flex flex-wrap items-end justify-center gap-5 sm:gap-8"
          aria-label={`Countdown to ${title}`}
        >
          {units.map((u) => (
            <span
              key={u.label}
              className="flex min-w-[3rem] flex-col items-center sm:min-w-[3.75rem]"
            >
              <span
                className="font-display text-3xl leading-none text-ink tabular-nums sm:text-4xl"
                suppressHydrationWarning
              >
                {ready ? String(u.value).padStart(2, "0") : "––"}
              </span>
              <span className="mt-2 text-xs font-medium text-muted">
                {u.label}
              </span>
            </span>
          ))}
        </Link>
        <p className="mt-8">
          <Link
            href={href}
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline decoration-line underline-offset-4 hover:text-accent-ink"
          >
            Event details & RSVP →
          </Link>
        </p>
      </div>
    )
  }

  if (layout === "days") {
    return (
      <Link
        href={href}
        className={`countdown-enter group flex min-h-11 flex-col items-center justify-center px-2 text-center ${ready ? "is-ready" : ""}`}
      >
        <span
          className="countdown-days font-display text-2xl leading-none text-accent-ink tabular-nums transition group-hover:text-ink"
          suppressHydrationWarning
        >
          {ready ? display.days : "–"}
        </span>
        <span className="mt-0.5 text-xs font-medium text-muted">
          days · <span className="countdown-title">{title}</span>
        </span>
      </Link>
    )
  }

  if (layout === "stacked") {
    const units = [
      { label: "Days", value: display.days },
      { label: "Hrs", value: display.hours },
      { label: "Min", value: display.mins },
      { label: "Sec", value: display.secs },
    ]
    return (
      <Link
        href={href}
        className={`countdown-enter flex min-h-11 items-center gap-3 ${ready ? "is-ready" : ""}`}
      >
        <span className="countdown-title hidden text-xs font-medium text-muted sm:inline">
          Next · {title}
        </span>
        <span className="flex gap-2">
          {units.map((u) => (
            <span key={u.label} className="flex min-w-[2.25rem] flex-col items-center">
              <span
                className="font-display text-lg leading-none text-ink tabular-nums"
                suppressHydrationWarning
              >
                {ready ? String(u.value).padStart(2, "0") : "––"}
              </span>
              <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted">
                {u.label}
              </span>
            </span>
          ))}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={`countdown-enter inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-accent-soft/50 px-3 text-sm ${ready ? "is-ready" : ""}`}
    >
      <span className="font-medium text-muted">Next</span>
      <span
        className="font-display text-base text-accent-ink tabular-nums"
        suppressHydrationWarning
      >
        {ready
          ? `${display.days}d ${String(display.hours).padStart(2, "0")}h ${String(display.mins).padStart(2, "0")}m`
          : "––"}
      </span>
    </Link>
  )
}
