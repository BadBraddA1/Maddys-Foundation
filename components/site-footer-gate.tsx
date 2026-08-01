"use client"

import { usePathname } from "next/navigation"

/** Hide the public site footer on staff / auth surfaces. */
export function SiteFooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up")
  ) {
    return null
  }
  return children
}
