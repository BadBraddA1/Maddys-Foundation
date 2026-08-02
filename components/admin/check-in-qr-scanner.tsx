"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"

type Props = {
  open: boolean
  onClose: () => void
  onCode: (code: string) => void
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

export function CheckInQrScanner({ open, onClose, onCode }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const handledRef = useRef(false)
  const regionId = "check-in-qr-reader"

  useEffect(() => {
    if (!open) return
    handledRef.current = false
    setError(null)
    setStarting(true)

    let cancelled = false
    const scanner = new Html5Qrcode(regionId)
    scannerRef.current = scanner

    void (async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (handledRef.current || cancelled) return
            const parsed = parseScannedCheckInPayload(decoded)
            if (!parsed) return
            handledRef.current = true
            onCode(parsed)
            onClose()
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
  }, [open, onClose, onCode])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan check-in QR code"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 text-white">
          <h2 className="font-display text-xl">Scan QR</h2>
          <button
            type="button"
            className="inline-flex min-h-11 items-center px-3 text-sm underline underline-offset-4"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="mt-2 text-sm text-white/80">
          Point the camera at a player or team QR. Player codes check in
          automatically. Works on iPhone Safari when camera access is allowed.
        </p>
        <div
          id={regionId}
          className="mt-4 min-h-[280px] overflow-hidden rounded-sm bg-black"
        />
        {starting ? (
          <p className="mt-3 text-sm text-white/80">Starting camera…</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
