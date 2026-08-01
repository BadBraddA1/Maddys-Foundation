"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

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
  /** compact = inline chip · stacked = unit columns · days = big day count */
  layout?: "compact" | "stacked" | "days"
}

/** Live countdown to the next published event. */
export function NextEventCountdown({
  targetIso,
  title,
  href,
  layout = "compact",
}: Props) {
  const target = new Date(targetIso).getTime()
  const [parts, setParts] = useState<Parts>(() => split(target - Date.now()))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    const tick = () => setParts(split(target - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [target])

  const ended = Number.isNaN(target) || target <= Date.now()

  if (ended) {
    return (
      <Link
        href={href}
        className="countdown-enter inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline decoration-accent/70 underline-offset-4"
      >
        See events →
      </Link>
    )
  }

  if (layout === "days") {
    return (
      <Link
        href={href}
        className={`countdown-enter group flex min-h-11 flex-col items-center justify-center px-2 text-center ${ready ? "is-ready" : ""}`}
      >
        <span className="countdown-days font-display text-2xl leading-none text-accent-ink tabular-nums transition group-hover:text-ink">
          {parts.days}
        </span>
        <span className="mt-0.5 text-xs font-medium text-muted">
          days · <span className="countdown-title">{title}</span>
        </span>
      </Link>
    )
  }

  if (layout === "stacked") {
    const units = [
      { label: "Days", value: parts.days },
      { label: "Hrs", value: parts.hours },
      { label: "Min", value: parts.mins },
      { label: "Sec", value: parts.secs },
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
              <span className="font-display text-lg leading-none text-ink tabular-nums">
                {String(u.value).padStart(2, "0")}
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
      <span className="font-display text-base text-accent-ink tabular-nums">
        {parts.days}d {String(parts.hours).padStart(2, "0")}h{" "}
        {String(parts.mins).padStart(2, "0")}m
      </span>
    </Link>
  )
}
