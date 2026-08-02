"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckInQrScanner,
  parseScannedCheckInPayload,
} from "@/components/admin/check-in-qr-scanner"
import { computeAddonTotalCents, formatAddonMoney, isPlayerCheckedIn, type AddonPrice, type EventPlayer } from "@/lib/check-in-shared"

type TeamSummary = {
  registrationId: number
  teamName: string
  captainName: string
  playerCount: number
  checkedInCount: number
}

type CheckInTeam = {
  registrationId: number
  eventId: number
  teamName: string
  captainName: string
  email: string
  phone: string
  notes: string
  checkInCode: string
  players: EventPlayer[]
  prices: AddonPrice[]
  teamAddonTotalCents: number
  checkedInCount: number
}

type PlayerDraft = {
  skins: boolean
  golf_cannon: boolean
  golf_pro: boolean
}

function money(cents: number) {
  return formatAddonMoney(cents)
}

type Props = {
  eventId: number
  eventTitle: string
  initialTeamId?: number | null
  initialCode?: string | null
}

export function CheckInDesk({
  eventId,
  eventTitle,
  initialTeamId,
  initialCode,
}: Props) {
  const [query, setQuery] = useState("")
  const [codeInput, setCodeInput] = useState(initialCode ?? "")
  const [suggestions, setSuggestions] = useState<TeamSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [team, setTeam] = useState<CheckInTeam | null>(null)
  const [drafts, setDrafts] = useState<Record<number, PlayerDraft>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyPlayerId, setBusyPlayerId] = useState<number | null>(null)
  const [savingAddons, setSavingAddons] = useState(false)
  const [qr, setQr] = useState<{ url: string; dataUrl: string } | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const loadSuggestions = useCallback(
    async (q: string) => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/admin/check-in/teams?eventId=${eventId}&q=${encodeURIComponent(q)}`,
        )
        const data = (await res.json()) as { teams?: TeamSummary[]; error?: string }
        if (!res.ok) {
          setError(data.error || "Could not load teams.")
          return
        }
        setSuggestions(data.teams ?? [])
      } catch {
        setError("Could not load teams.")
      } finally {
        setSearching(false)
      }
    },
    [eventId],
  )

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadSuggestions(query)
    }, 200)
    return () => window.clearTimeout(t)
  }, [query, loadSuggestions])

  const applyTeam = useCallback((next: CheckInTeam) => {
    setTeam(next)
    const nextDrafts: Record<number, PlayerDraft> = {}
    for (const p of next.players) {
      nextDrafts[p.id] = {
        skins: p.skins === 1,
        golf_cannon: p.golf_cannon === 1,
        golf_pro: p.golf_pro === 1,
      }
    }
    setDrafts(nextDrafts)
  }, [])

  const loadTeam = useCallback(
    async (registrationId: number) => {
      setLoadingTeam(true)
      setError(null)
      setMessage(null)
      setQr(null)
      try {
        const res = await fetch(`/api/admin/check-in/teams/${registrationId}`)
        const data = (await res.json()) as { team?: CheckInTeam; error?: string }
        if (!res.ok || !data.team) {
          setError(data.error || "Team not found.")
          setTeam(null)
          return
        }
        applyTeam(data.team)
        setQuery(data.team.teamName)
        const qrRes = await fetch(`/api/admin/check-in/teams/${registrationId}/qr`)
        const qrData = (await qrRes.json()) as {
          url?: string
          dataUrl?: string
        }
        if (qrRes.ok && qrData.url && qrData.dataUrl) {
          setQr({ url: qrData.url, dataUrl: qrData.dataUrl })
        }
      } catch {
        setError("Unable to load team.")
      } finally {
        setLoadingTeam(false)
      }
    },
    [applyTeam],
  )

  const loadByCode = useCallback(
    async (raw: string) => {
      const parsed = parseScannedCheckInPayload(raw) || raw.trim().toUpperCase()
      if (!parsed) {
        setError("Enter or scan a check-in code.")
        return
      }
      if (parsed.startsWith("TEAM:")) {
        const id = Number(parsed.slice(5))
        if (Number.isFinite(id) && id > 0) {
          await loadTeam(id)
          return
        }
      }
      setLoadingTeam(true)
      setError(null)
      setMessage(null)
      try {
        const res = await fetch(`/api/admin/check-in/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: parsed, eventId }),
        })
        const data = (await res.json()) as {
          error?: string
          message?: string
          registrationId?: number
          team?: CheckInTeam
          autoCheckedIn?: boolean
          alreadyCheckedIn?: boolean
          player?: EventPlayer
        }
        if (!res.ok) {
          setError(data.error || "Code not found.")
          return
        }
        setCodeInput(parsed)
        if (data.team) {
          applyTeam(data.team)
          setQuery(data.team.teamName)
          const qrRes = await fetch(
            `/api/admin/check-in/teams/${data.team.registrationId}/qr`,
          )
          const qrData = (await qrRes.json()) as {
            url?: string
            dataUrl?: string
          }
          if (qrRes.ok && qrData.url && qrData.dataUrl) {
            setQr({ url: qrData.url, dataUrl: qrData.dataUrl })
          }
        } else if (data.registrationId) {
          await loadTeam(data.registrationId)
        }
        setMessage(data.message || `Loaded code ${parsed}.`)
      } catch {
        setError("Could not look up code.")
      } finally {
        setLoadingTeam(false)
      }
    },
    [eventId, loadTeam, applyTeam],
  )

  useEffect(() => {
    if (initialCode?.trim()) {
      void loadByCode(initialCode)
      return
    }
    if (initialTeamId && initialTeamId > 0) {
      void loadTeam(initialTeamId)
    }
  }, [initialTeamId, initialCode, loadTeam, loadByCode])

  const liveTeamTotal = useMemo(() => {
    if (!team) return 0
    return Object.values(drafts).reduce(
      (sum, d) => sum + computeAddonTotalCents(d, team.prices),
      0,
    )
  }, [drafts, team])

  async function onCheckIn(player: EventPlayer) {
    if (busyPlayerId) return
    setBusyPlayerId(player.id)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(
        `/api/admin/check-in/players/${player.id}/check-in`,
        { method: "POST" },
      )
      const data = (await res.json()) as {
        error?: string
        player?: EventPlayer
      }
      const nextPlayer = data.player
      if (nextPlayer) {
        setTeam((prev) => {
          if (!prev) return prev
          const players = prev.players.map((p) =>
            p.id === nextPlayer.id ? nextPlayer : p,
          )
          return {
            ...prev,
            players,
            checkedInCount: players.filter((p) => isPlayerCheckedIn(p)).length,
          }
        })
      }
      if (!res.ok) {
        setError(data.error || "Unable to save check-in.")
        return
      }
      setMessage(
        `${nextPlayer?.display_name ?? player.display_name} has been checked in.`,
      )
    } catch {
      setError("Unable to save check-in.")
    } finally {
      setBusyPlayerId(null)
    }
  }

  async function onUndo(player: EventPlayer) {
    if (busyPlayerId) return
    setBusyPlayerId(player.id)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(
        `/api/admin/check-in/players/${player.id}/undo`,
        { method: "POST" },
      )
      const data = (await res.json()) as {
        error?: string
        player?: EventPlayer
      }
      const nextPlayer = data.player
      if (nextPlayer) {
        setTeam((prev) => {
          if (!prev) return prev
          const players = prev.players.map((p) =>
            p.id === nextPlayer.id ? nextPlayer : p,
          )
          return {
            ...prev,
            players,
            checkedInCount: players.filter((p) => isPlayerCheckedIn(p)).length,
          }
        })
      }
      if (!res.ok) {
        setError(data.error || "Unable to undo check-in.")
        return
      }
      setMessage(
        `Check-in undone for ${nextPlayer?.display_name ?? player.display_name}.`,
      )
    } catch {
      setError("Unable to undo check-in.")
    } finally {
      setBusyPlayerId(null)
    }
  }

  async function onSaveAddons() {
    if (!team || savingAddons) return
    setSavingAddons(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/check-in/teams/${team.registrationId}/addons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            players: team.players.map((p) => ({
              id: p.id,
              ...(drafts[p.id] ?? {
                skins: false,
                golf_cannon: false,
                golf_pro: false,
              }),
            })),
          }),
        },
      )
      const data = (await res.json()) as { error?: string; team?: CheckInTeam }
      if (!res.ok || !data.team) {
        setError(data.error || "Unable to save add-ons.")
        return
      }
      applyTeam(data.team)
      setMessage("Add-ons saved.")
    } catch {
      setError("Unable to save add-ons.")
    } finally {
      setSavingAddons(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Player check-in</h1>
          <p className="mt-1 text-sm text-muted">{eventTitle}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-medium">
          <Link
            href="/admin/check-in/dashboard"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Dashboard
          </Link>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center text-muted underline underline-offset-4"
          >
            Events
          </Link>
        </div>
      </div>

      <div className="border border-line bg-surface p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="check-in-code">
            Check-in code / Scan QR
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="check-in-code"
              className="field-control min-h-12 flex-1 font-mono text-base uppercase tracking-wide"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="OV-A3K9Q2"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void loadByCode(codeInput)
                }
              }}
            />
            <button
              type="button"
              className="btn-deep inline-flex min-h-12 items-center justify-center px-5 text-sm font-medium disabled:opacity-60"
              disabled={loadingTeam}
              onClick={() => void loadByCode(codeInput)}
            >
              Load code
            </button>
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center border border-line bg-bg px-5 text-sm font-medium text-ink"
              onClick={() => setScannerOpen(true)}
            >
              Scan QR
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            On iPhone: open this page in Safari while staff-logged-in, tap Scan QR,
            allow camera.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="team-search">
            Or search team name
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="team-search"
              className="field-control min-h-12 flex-1 text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Team name"
              autoComplete="off"
              list="team-suggestions"
            />
            <datalist id="team-suggestions">
              {suggestions.map((t) => (
                <option key={t.registrationId} value={t.teamName} />
              ))}
            </datalist>
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center border border-line px-6 text-sm font-medium disabled:opacity-60"
              disabled={loadingTeam || searching}
              onClick={() => {
                const match =
                  suggestions.find(
                    (t) =>
                      t.teamName.toLowerCase() === query.trim().toLowerCase(),
                  ) || suggestions[0]
                if (match) void loadTeam(match.registrationId)
                else setError("Team not found.")
              }}
            >
              {loadingTeam ? "Loading…" : "Load team"}
            </button>
          </div>
          {suggestions.length > 0 ? (
            <ul className="mt-3 divide-y divide-line border border-line">
              {suggestions.slice(0, 8).map((t) => (
                <li key={t.registrationId}>
                  <button
                    type="button"
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-bg"
                    onClick={() => void loadTeam(t.registrationId)}
                  >
                    <span className="font-medium text-ink">{t.teamName}</span>
                    <span className="text-muted tabular-nums">
                      {t.checkedInCount}/{t.playerCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <CheckInQrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCode={(code) => {
          void loadByCode(code)
        }}
      />

      {error ? (
        <p className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="border border-success/25 bg-success-soft px-4 py-3 text-sm text-ink"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {team ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">{team.teamName}</h2>
              <p className="mt-1 text-sm text-muted">
                {team.checkedInCount}/{team.players.length} checked in · Captain{" "}
                {team.captainName}
              </p>
              <p className="mt-1 font-mono text-sm tracking-wide text-ink">
                Code {team.checkInCode}
              </p>
              <Link
                href={`/admin/check-in/team/${team.registrationId}`}
                className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
              >
                Team detail / history
              </Link>
            </div>
            {qr ? (
              <div className="border border-line bg-surface p-4 text-center print:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr.dataUrl}
                  alt={`QR for ${team.teamName}`}
                  className="mx-auto h-40 w-40"
                />
                <p className="mt-2 max-w-[12rem] break-all text-xs text-muted">
                  {qr.url}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center border border-line px-3 text-sm"
                    onClick={() => void navigator.clipboard.writeText(qr.url)}
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center border border-line px-3 text-sm"
                    onClick={() => window.print()}
                  >
                    Print QR
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {team.players.length === 0 ? (
            <p className="text-muted">No players found for this team.</p>
          ) : (
            <>
              <ul className="space-y-4 md:hidden">
                {team.players.map((player) => {
                  const draft = drafts[player.id] ?? {
                    skins: false,
                    golf_cannon: false,
                    golf_pro: false,
                  }
                  const total = computeAddonTotalCents(draft, team.prices)
                  const inAlready = isPlayerCheckedIn(player)
                  return (
                    <li
                      key={player.id}
                      className="border border-line bg-surface px-4 py-4"
                    >
                      <p className="font-medium text-ink">{player.display_name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {inAlready
                          ? `Checked in${player.checked_in_at ? ` · ${new Date(player.checked_in_at).toLocaleString()}` : ""}`
                          : "Not checked in"}
                      </p>
                      {inAlready ? (
                        <div className="mt-4 flex flex-col gap-2">
                          <p className="inline-flex min-h-12 w-full items-center justify-center bg-accent px-4 text-base font-semibold text-accent-ink">
                            Checked in
                          </p>
                          <button
                            type="button"
                            disabled={busyPlayerId === player.id}
                            className="inline-flex min-h-12 w-full items-center justify-center border border-line px-4 text-sm font-medium disabled:opacity-60"
                            onClick={() => void onUndo(player)}
                          >
                            {busyPlayerId === player.id ? "Undoing…" : "Undo check-in"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={busyPlayerId === player.id}
                          className="mt-4 inline-flex min-h-14 w-full items-center justify-center bg-success px-4 text-base font-semibold text-white disabled:opacity-60"
                          onClick={() => void onCheckIn(player)}
                        >
                          {busyPlayerId === player.id ? "Saving…" : "Check In"}
                        </button>
                      )}
                      <div className="mt-4 space-y-2 text-sm">
                        {team.prices.map((price) => (
                          <label
                            key={price.addon_key}
                            className="flex min-h-11 items-center gap-3"
                          >
                            <input
                              type="checkbox"
                              className="size-5"
                              checked={Boolean(
                                draft[price.addon_key as keyof PlayerDraft],
                              )}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [player.id]: {
                                    ...draft,
                                    [price.addon_key]: e.target.checked,
                                  },
                                }))
                              }
                            />
                            <span>
                              {price.label} ({money(price.price_cents)})
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-3 text-sm font-medium tabular-nums">
                        Player total: {money(total)}
                      </p>
                    </li>
                  )
                })}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-line text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Player</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Check-in</th>
                      {team.prices.map((p) => (
                        <th key={p.addon_key} className="py-2 pr-3 font-medium">
                          {p.label}
                        </th>
                      ))}
                      <th className="py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {team.players.map((player) => {
                      const draft = drafts[player.id] ?? {
                        skins: false,
                        golf_cannon: false,
                        golf_pro: false,
                      }
                      const total = computeAddonTotalCents(draft, team.prices)
                      const inAlready = isPlayerCheckedIn(player)
                      return (
                        <tr key={player.id}>
                          <td className="py-3 pr-3 font-medium text-ink">
                            {player.display_name}
                          </td>
                          <td className="py-3 pr-3 text-muted">
                            {inAlready ? "In" : "—"}
                          </td>
                          <td className="py-3 pr-3">
                            {inAlready ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex min-h-12 items-center bg-accent px-3 text-sm font-semibold text-accent-ink">
                                  Checked in
                                </span>
                                <button
                                  type="button"
                                  disabled={busyPlayerId === player.id}
                                  className="inline-flex min-h-12 items-center justify-center border border-line px-4 text-sm font-medium disabled:opacity-60"
                                  onClick={() => void onUndo(player)}
                                >
                                  {busyPlayerId === player.id ? "…" : "Undo"}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={busyPlayerId === player.id}
                                className="inline-flex min-h-12 min-w-[10rem] items-center justify-center bg-success px-4 text-sm font-semibold text-white disabled:opacity-60"
                                onClick={() => void onCheckIn(player)}
                              >
                                {busyPlayerId === player.id ? "…" : "Check In"}
                              </button>
                            )}
                          </td>
                          {team.prices.map((price) => (
                            <td key={price.addon_key} className="py-3 pr-3">
                              <input
                                type="checkbox"
                                className="size-5"
                                checked={Boolean(
                                  draft[price.addon_key as keyof PlayerDraft],
                                )}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [player.id]: {
                                      ...draft,
                                      [price.addon_key]: e.target.checked,
                                    },
                                  }))
                                }
                                aria-label={`${player.display_name} ${price.label}`}
                              />
                            </td>
                          ))}
                          <td className="py-3 font-medium tabular-nums">
                            {money(total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border border-line bg-surface px-4 py-4">
                <p className="text-base font-medium tabular-nums">
                  Team add-on total: {money(liveTeamTotal)}
                </p>
                <button
                  type="button"
                  disabled={savingAddons}
                  className="btn-deep inline-flex min-h-12 items-center justify-center px-6 text-sm font-medium disabled:opacity-60"
                  onClick={() => void onSaveAddons()}
                >
                  {savingAddons ? "Saving…" : "Save add-ons"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
