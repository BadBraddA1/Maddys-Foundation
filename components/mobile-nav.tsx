"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"

const links = [
  { href: "/story", label: "Her Story" },
  { href: "/events", label: "Events" },
  { href: "/donate", label: "Donate" },
]

/** Mobile disclosure nav — closes when the route changes. */
export function MobileNav({
  tone,
}: {
  tone: "light" | "dark"
}) {
  const pathname = usePathname()
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const menuId = useId()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = detailsRef.current
    if (el) {
      el.open = false
      setExpanded(false)
    }
  }, [pathname])

  const panel =
    tone === "light"
      ? "border-on-deep-border bg-deep text-on-deep"
      : "border-line bg-surface text-ink"

  const mobileLink =
    tone === "light"
      ? "text-on-deep hover:bg-on-deep-hover"
      : "text-ink hover:bg-bg"

  return (
    <details
      ref={detailsRef}
      className="relative md:hidden"
      onToggle={(e) => {
        setExpanded((e.currentTarget as HTMLDetailsElement).open)
      }}
    >
      <summary
        className={`flex h-11 w-11 cursor-pointer list-none items-center justify-center border text-sm font-medium transition [&::-webkit-details-marker]:hidden ${
          tone === "light"
            ? "border-on-deep-border bg-deep/80 text-on-deep"
            : "border-line bg-surface text-ink"
        }`}
        aria-controls={menuId}
        aria-expanded={expanded}
      >
        <span className="sr-only">Menu</span>
        <span aria-hidden="true" className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-4 bg-current" />
          <span className="block h-0.5 w-4 bg-current" />
          <span className="block h-0.5 w-4 bg-current" />
        </span>
      </summary>
      <ul
        id={menuId}
        className={`nav-panel-enter absolute right-0 z-[var(--z-dropdown)] mt-2 min-w-[12.5rem] border py-1 ${panel}`}
      >
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`flex min-h-11 items-center px-4 text-base font-medium ${mobileLink}`}
              onClick={() => {
                const el = detailsRef.current
                if (el) el.open = false
                setExpanded(false)
              }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  )
}
