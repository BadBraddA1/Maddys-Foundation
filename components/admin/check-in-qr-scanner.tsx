"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"

type Props = {
  /** When true, camera is running. */
  open: boolean
  onClose: () => void
  onCode: (code: string) => void
  /**
   * Keep scanning after each successful read (re-arms after cooldown).
   * Default true for day-of desk use.
   */
  continuous?: boolean
  /** ms before the same or next code can fire again. */
  cooldownMs?: number
  /** Docked under desk controls vs fullscreen overlay. */
  variant?: "modal" | "docked"
  /** Smaller camera + less chrome (mobile day-of). */
  compact?: boolean
}

/** Pull check-in code from a scanned URL or raw code string. */
export function parseScannedCheckInPayload(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  try {
    const url = new URL(text)
    const code = url.searchParams.get("code")
    if (code?.trim()) return code.trim().toUpperCase()
    const team = url.searchParams.get("team")
    if (team?.trim()) return `TEAM:${team.trim()}`
    // /ticket/p/OV-P-XXXXXX or /ticket/OV-XXXXXX
    const parts = url.pathname.split("/").filter(Boolean)
    const ticketIdx = parts.findIndex((p) => p === "ticket")
    if (ticketIdx >= 0) {
      if (parts[ticketIdx + 1] === "p" && parts[ticketIdx + 2]) {
        return decodeURIComponent(parts[ticketIdx + 2]!).toUpperCase()
      }
      if (parts[ticketIdx + 1] && parts[ticketIdx + 1] !== "p") {
        return decodeURIComponent(parts[ticketIdx + 1]!).toUpperCase()
      }
    }
  } catch {
    // not a URL
  }
  // Prefer per-player codes (PREFIX-P-BODY)
  const player = text.match(/\b([A-Z0-9]{1,4}-P-[A-Z0-9]{4,10})\b/i)
  if (player?.[1]) return player[1].toUpperCase()
  const teamCode = text.match(/\b([A-Z]{1,4}-[A-Z0-9]{4,10})\b/i)
  if (teamCode?.[1]) return teamCode[1].toUpperCase()
  if (/^[A-Z0-9-]{4,24}$/i.test(text)) return text.toUpperCase()
  return null
}

export function CheckInQrScanner({
  open,
  onClose,
  onCode,
  continuous = true,
  cooldownMs = 2500,
  variant = "modal",
  compact = false,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [coolingDown, setCoolingDown] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onCodeRef = useRef(onCode)
  const onCloseRef = useRef(onClose)
  const continuousRef = useRef(continuous)
  const cooldownMsRef = useRef(cooldownMs)
  const lockedUntilRef = useRef(0)
  const lastCodeRef = useRef<string | null>(null)
  const regionIdRef = useRef(
    `check-in-qr-reader-${variant}-${Math.random().toString(36).slice(2, 9)}`,
  )
  const regionId = regionIdRef.current

  onCodeRef.current = onCode
  onCloseRef.current = onClose
  continuousRef.current = continuous
  cooldownMsRef.current = cooldownMs

  const handleDecoded = useCallback((decoded: string) => {
    const parsed = parseScannedCheckInPayload(decoded)
    if (!parsed) return
    const now = Date.now()
    if (now < lockedUntilRef.current) return
    lockedUntilRef.current = now + cooldownMsRef.current
    lastCodeRef.current = parsed
    setLastScanned(parsed)
    setCoolingDown(true)
    window.setTimeout(() => setCoolingDown(false), cooldownMsRef.current)
    onCodeRef.current(parsed)
    if (!continuousRef.current) {
      onCloseRef.current()
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setLastScanned(null)
      setCoolingDown(false)
      lockedUntilRef.current = 0
      lastCodeRef.current = null
      return
    }
    setError(null)
    setStarting(true)

    let cancelled = false
    const scanner = new Html5Qrcode(regionId)
    scannerRef.current = scanner
    const box = compact ? 180 : 240

    void (async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: box, height: box } },
          (decoded) => {
            if (cancelled) return
            handleDecoded(decoded)
          },
          () => undefined,
        )
        if (!cancelled) setStarting(false)
      } catch (err) {
        if (cancelled) return
        setStarting(false)
        const msg = err instanceof Error ? err.message : String(err)
        setError(
          msg.includes("Permission") || msg.includes("NotAllowed")
            ? "Camera permission denied. Allow camera access, or type the code instead."
            : "Could not start camera. Type the check-in code instead.",
        )
      }
    })()

    return () => {
      cancelled = true
      const s = scannerRef.current
      scannerRef.current = null
      if (s?.isScanning) {
        void s.stop().then(() => s.clear()).catch(() => undefined)
      } else {
        try {
          s?.clear()
        } catch {
          // ignore
        }
      }
    }
  }, [open, regionId, handleDecoded, compact])

  if (!open) return null

  const titleClass =
    variant === "modal" ? "text-white" : "text-ink"
  const mutedClass =
    variant === "modal" ? "text-white/80" : "text-muted"

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className={`font-display ${compact ? "text-base" : "text-xl"} ${titleClass}`}>
          {continuous ? "Live scan" : "Scan QR"}
        </h2>
        <button
          type="button"
          className={`inline-flex min-h-10 items-center px-2 text-sm underline underline-offset-4 ${titleClass}`}
          onClick={onClose}
        >
          {variant === "docked" ? "Stop" : "Close"}
        </button>
      </div>
      {!compact ? (
        <p className={`mt-2 text-sm ${mutedClass}`}>
          {continuous
            ? "Camera stays on — point at the next QR. Same code ignored briefly."
            : "Point the camera at a player or team QR. Player codes check in automatically."}
        </p>
      ) : null}
      <div
        id={regionId}
        className={`overflow-hidden bg-black ${
          compact ? "mt-2 min-h-[160px] max-h-[28vh]" : "mt-4 min-h-[280px]"
        }`}
      />
      {starting ? (
        <p className={`mt-2 text-xs ${mutedClass}`}>Starting camera…</p>
      ) : null}
      {lastScanned ? (
        <p
          className={`mt-2 text-xs font-medium ${variant === "modal" ? "text-accent" : "text-ink"}`}
          role="status"
        >
          {lastScanned}
          {coolingDown ? " · wait…" : " · ready"}
        </p>
      ) : null}
      {error ? (
        <p
          className={`mt-2 text-xs ${variant === "modal" ? "text-accent" : "text-danger"}`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </>
  )

  if (variant === "docked") {
    return (
      <div
        className={`border border-line bg-surface ${compact ? "p-2" : "p-4"}`}
        role="region"
        aria-label="Live check-in QR scanner"
      >
        {body}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan check-in QR code"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{body}</div>
    </div>
  )
}
