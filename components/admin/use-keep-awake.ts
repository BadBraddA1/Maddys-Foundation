"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const STORAGE_KEY = "mf-check-in-keep-awake"

type WakeLockSentinelLike = {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: "release", listener: () => void) => void
}

/**
 * Screen Wake Lock for day-of scanning devices (iPhone Safari 16.4+ / Chrome).
 * Toggle persists in localStorage for the desk session.
 */
export function useKeepAwake(enabled: boolean) {
  const [supported, setSupported] = useState(false)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lockRef = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" && "wakeLock" in navigator,
    )
  }, [])

  const release = useCallback(async () => {
    const lock = lockRef.current
    lockRef.current = null
    if (lock && !lock.released) {
      try {
        await lock.release()
      } catch {
        // ignore
      }
    }
    setActive(false)
  }, [])

  const request = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      setSupported(false)
      return
    }
    if (document.visibilityState !== "visible") return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lock = (await (navigator as any).wakeLock.request(
        "screen",
      )) as WakeLockSentinelLike
      lockRef.current = lock
      lock.addEventListener("release", () => {
        if (lockRef.current === lock) {
          lockRef.current = null
          setActive(false)
        }
      })
      setActive(true)
      setError(null)
    } catch (err) {
      setActive(false)
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg.includes("NotAllowed") || msg.includes("Permission")
          ? "Could not keep screen awake (permission / low power)."
          : "Could not keep screen awake on this browser.",
      )
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      void release()
      return
    }
    void request()

    const onVisibility = () => {
      if (document.visibilityState === "visible" && enabled) {
        void request()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      void release()
    }
  }, [enabled, request, release])

  return { supported, active, error }
}

export function readKeepAwakePreference(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function writeKeepAwakePreference(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0")
  } catch {
    // ignore
  }
}

const LIVE_SCAN_KEY = "mf-check-in-live-scan"

export function readLiveScanPreference(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(LIVE_SCAN_KEY) === "1"
  } catch {
    return false
  }
}

export function writeLiveScanPreference(on: boolean) {
  try {
    window.localStorage.setItem(LIVE_SCAN_KEY, on ? "1" : "0")
  } catch {
    // ignore
  }
}
