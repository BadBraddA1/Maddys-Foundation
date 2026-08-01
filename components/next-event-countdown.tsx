"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toEventIso } from "@/lib/events"

type Parts = { days: number; hours: number; mins: number }

function split(ms: number): Parts {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const mins = Math.floor((total % 3600) / 60)
  return { days, hours, mins }
}

type Props = {
  targetIso: string
  title: string
  href: string
}

/** Featured home countdown — days/hours/minutes, quiet 30s tick, one primary link. */
export function NextEventCountdown({ targetIso, title, href }: Props) {
  const target = new Date(toEventIso(targetIso)).getTime()
  const [parts, setParts] = useState<Parts | null>(null)

  useEffect(() => {
    if (Number.isNaN(target)) return
    const tick = () => setParts(split(target - Date.now()))
    tick()
    const id = window.setInterval(tick, 30_000)
    const onVis = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [target])

  const ended = Number.isNaN(target) || (!!parts && target <= Date.now())
  const ready = parts !== null
  const display = parts ?? { days: 0, hours: 0, mins: 0 }

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
      <div
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
            <span className="mt-2 text-xs font-medium text-muted">{u.label}</span>
          </span>
        ))}
      </div>
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
