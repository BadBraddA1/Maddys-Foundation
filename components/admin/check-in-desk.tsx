"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  CheckInQrScanner,
  parseScannedCheckInPayload,
} from "@/components/admin/check-in-qr-scanner"
import { PrepaidBadge, PrepaidTabs } from "@/components/admin/prepaid-badge"
import {
  readKeepAwakePreference,
  readLiveScanPreference,
  useKeepAwake,
  writeKeepAwakePreference,
  writeLiveScanPreference,
} from "@/components/admin/use-keep-awake"
import {
  computePlayerAddonTotalCents,
  computeTeamDeskAddonTotalCents,
  formatAddonMoney,
  isPlayerCheckedIn,
  type AddonPrice,
  type EventPlayer,
  type PrepaidAddons,
} from "@/lib/check-in-shared"

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
  prepaid: PrepaidAddons
}

type PlayerDraft = {
  skins: boolean
  mulligans: boolean
}

function money(cents: number) {
  return formatAddonMoney(cents)
}

function skinsPrice(prices: AddonPrice[]) {
  return prices.find((p) => p.addon_key === "skins")?.price_cents ?? 500
}

function mulligansPrice(prices: AddonPrice[]) {
  return prices.find((p) => p.addon_key === "mulligans")?.price_cents ?? 2000
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
  const [liveScan, setLiveScan] = useState(false)
  const [keepAwake, setKeepAwake] = useState(false)
  const [prefsReady, setPrefsReady] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const teamPanelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setKeepAwake(readKeepAwakePreference())
    setLiveScan(readLiveScanPreference())
    setPrefsReady(true)
  }, [])

  const wake = useKeepAwake(keepAwake)

  useEffect(() => {
    if (!prefsReady) return
    writeKeepAwakePreference(keepAwake)
  }, [keepAwake, prefsReady])

  useEffect(() => {
    if (!prefsReady) return
    writeLiveScanPreference(liveScan)
    if (liveScan) {
      setScannerOpen(false)
      setManualOpen(false)
    }
  }, [liveScan, prefsReady])

  const cameraOn = liveScan || scannerOpen

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
    const prepaid = next.prepaid ?? { skins: false, mulligans: false }
    setTeam({ ...next, prepaid })
    const nextDrafts: Record<number, PlayerDraft> = {}
    for (const p of next.players) {
      nextDrafts[p.id] = {
        skins: prepaid.skins || p.skins === 1,
        mulligans: prepaid.mulligans || p.mulligans === 1,
      }
    }
    setDrafts(nextDrafts)
    window.requestAnimationFrame(() => {
      teamPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
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
    return computeTeamDeskAddonTotalCents(
      Object.values(drafts),
      team.prices,
      team.prepaid,
    )
  }, [drafts, team])

  const teamMulligansOn = useMemo(() => {
    if (!team) return false
    if (team.prepaid.mulligans) return true
    return Object.values(drafts).some((d) => d.mulligans)
  }, [drafts, team])

  function setTeamMulligans(on: boolean) {
    if (!team || team.prepaid.mulligans) return
    setDrafts((prev) => {
      const next: Record<number, PlayerDraft> = { ...prev }
      for (const p of team.players) {
        next[p.id] = {
          skins: next[p.id]?.skins ?? false,
          mulligans: on,
        }
      }
      return next
    })
  }

  function setPlayerSkins(playerId: number, on: boolean) {
    if (!team || team.prepaid.skins) return
    setDrafts((prev) => ({
      ...prev,
      [playerId]: {
        skins: on,
        mulligans: prev[playerId]?.mulligans ?? teamMulligansOn,
      },
    }))
  }

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
                mulligans: false,
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
    <div className="space-y-3 md:space-y-6 pb-24 md:pb-0">
      <div className="hidden items-end justify-between gap-4 md:flex">
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
      <p className="truncate text-xs text-muted md:hidden">{eventTitle}</p>

      {/* Sticky scan controls — stays under admin header on phones */}
      <div className="sticky top-[3.25rem] z-30 space-y-2 border border-line bg-surface p-2 shadow-sm md:static md:top-auto md:z-auto md:space-y-4 md:p-4 md:shadow-none">
        <div className="flex gap-2">
          <label className="flex min-h-10 flex-1 items-center gap-2 border border-line bg-bg px-2 text-sm">
            <input
              type="checkbox"
              className="size-4 shrink-0"
              checked={liveScan}
              onChange={(e) => setLiveScan(e.target.checked)}
            />
            <span className="leading-tight">
              Live scan
              <span className="hidden text-xs text-muted sm:inline">
                {" "}
                · camera stays on
              </span>
            </span>
          </label>
          <label className="flex min-h-10 flex-1 items-center gap-2 border border-line bg-bg px-2 text-sm">
            <input
              type="checkbox"
              className="size-4 shrink-0"
              checked={keepAwake}
              onChange={(e) => setKeepAwake(e.target.checked)}
            />
            <span className="leading-tight">
              Stay awake
              <span className="mt-0.5 block text-[10px] text-muted sm:hidden">
                {keepAwake
                  ? wake.active
                    ? "On"
                    : wake.error
                      ? "Failed"
                      : "…"
                  : wake.supported
                    ? "Off"
                    : "N/A"}
              </span>
              <span className="hidden text-xs text-muted sm:inline">
                {" "}
                ·{" "}
                {wake.supported
                  ? keepAwake
                    ? wake.active
                      ? "screen on"
                      : wake.error || "…"
                    : "prevent sleep"
                  : "not supported"}
              </span>
            </span>
          </label>
        </div>

        {liveScan ? (
          <CheckInQrScanner
            open={cameraOn}
            continuous
            compact
            variant="docked"
            onClose={() => setLiveScan(false)}
            onCode={(code) => {
              void loadByCode(code)
            }}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!liveScan ? (
            <button
              type="button"
              className="inline-flex min-h-10 flex-1 items-center justify-center border border-line bg-bg px-3 text-sm font-medium text-ink md:flex-none"
              onClick={() => setScannerOpen(true)}
            >
              Scan once
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex min-h-10 flex-1 items-center justify-center border border-line px-3 text-sm md:hidden"
            onClick={() => setManualOpen((v) => !v)}
            aria-expanded={manualOpen}
          >
            {manualOpen ? "Hide code / search" : "Code / search"}
          </button>
        </div>

        <div
          className={`space-y-3 ${manualOpen || !liveScan ? "block" : "hidden"} md:block`}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="check-in-code"
              className="field-control min-h-10 flex-1 font-mono text-sm uppercase tracking-wide md:min-h-12 md:text-base"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Code"
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
              className="btn-deep inline-flex min-h-10 items-center justify-center px-4 text-sm font-medium disabled:opacity-60 md:min-h-12"
              disabled={loadingTeam}
              onClick={() => void loadByCode(codeInput)}
            >
              Load
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="team-search"
              className="field-control min-h-10 flex-1 text-sm md:min-h-12 md:text-base"
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
              className="inline-flex min-h-10 items-center justify-center border border-line px-4 text-sm font-medium disabled:opacity-60 md:min-h-12"
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
              {loadingTeam ? "…" : "Team"}
            </button>
          </div>
          {suggestions.length > 0 && (manualOpen || !liveScan || query.trim()) ? (
            <ul className="max-h-36 divide-y divide-line overflow-y-auto border border-line md:max-h-none">
              {suggestions.slice(0, 6).map((t) => (
                <li key={t.registrationId}>
                  <button
                    type="button"
                    className="flex min-h-10 w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-bg"
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
        open={!liveScan && scannerOpen}
        continuous
        variant="modal"
        onClose={() => setScannerOpen(false)}
        onCode={(code) => {
          void loadByCode(code)
        }}
      />

      {error ? (
        <p
          className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="border border-success/25 bg-success-soft px-3 py-2 text-sm text-ink"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {team ? (
        <div ref={teamPanelRef} className="space-y-3 md:space-y-6 scroll-mt-36">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl md:text-2xl">{team.teamName}</h2>
              <p className="mt-0.5 text-sm text-muted">
                {team.checkedInCount}/{team.players.length} in · {team.captainName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs tracking-wide text-ink md:text-sm">
                  {team.checkInCode}
                </span>
                <PrepaidTabs
                  skins={team.prepaid.skins}
                  mulligans={team.prepaid.mulligans}
                />
              </div>
              <Link
                href={`/admin/check-in/team/${team.registrationId}`}
                className="mt-1 inline-flex min-h-9 items-center text-xs underline underline-offset-4 md:min-h-11 md:text-sm"
              >
                Detail / history
              </Link>
            </div>
            {qr ? (
              <div className="hidden border border-line bg-surface p-4 text-center print:block md:block">
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
              {(team.prepaid.skins || team.prepaid.mulligans) && (
                <p className="border border-success/30 bg-success-soft px-3 py-2 text-xs md:text-sm">
                  Prepaid — collect $0 for{" "}
                  {[
                    team.prepaid.skins ? "skins" : null,
                    team.prepaid.mulligans ? "mulligans" : null,
                  ]
                    .filter(Boolean)
                    .join(" + ")}
                  .
                </p>
              )}

              {team.prepaid.mulligans ? (
                <div className="flex items-center justify-between gap-2 border border-success/30 bg-success-soft px-3 py-2">
                  <span className="text-sm font-medium">Mulligans (team)</span>
                  <PrepaidBadge label="Prepaid · $0" />
                </div>
              ) : (
                <label className="flex min-h-11 items-center gap-3 border border-line bg-surface px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={teamMulligansOn}
                    onChange={(e) => setTeamMulligans(e.target.checked)}
                  />
                  <span>
                    Team mulligans ({money(mulligansPrice(team.prices))})
                  </span>
                </label>
              )}

              {/* Dense mobile roster */}
              <ul className="divide-y divide-line border border-line md:hidden">
                {team.players.map((player) => {
                  const draft = drafts[player.id] ?? {
                    skins: false,
                    mulligans: teamMulligansOn,
                  }
                  const total = computePlayerAddonTotalCents(
                    draft,
                    team.prices,
                    {
                      prepaid: team.prepaid,
                      chargeTeamMulligans: false,
                    },
                  )
                  const inAlready = isPlayerCheckedIn(player)
                  return (
                    <li key={player.id} className="bg-surface px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {player.display_name}
                          </p>
                          {team.prepaid.skins ? (
                            <PrepaidBadge
                              label="Skins prepaid"
                              className="mt-1"
                            />
                          ) : (
                            <label className="mt-1 flex items-center gap-2 text-xs text-muted">
                              <input
                                type="checkbox"
                                className="size-4"
                                checked={draft.skins}
                                onChange={(e) =>
                                  setPlayerSkins(player.id, e.target.checked)
                                }
                              />
                              Skins
                              {draft.skins ? ` ${money(total)}` : ""}
                            </label>
                          )}
                        </div>
                        {inAlready ? (
                          <div className="flex shrink-0 flex-col gap-1">
                            <span className="inline-flex min-h-9 items-center justify-center bg-accent px-2 text-xs font-semibold text-accent-ink">
                              In
                            </span>
                            <button
                              type="button"
                              disabled={busyPlayerId === player.id}
                              className="inline-flex min-h-9 items-center justify-center border border-line px-2 text-xs disabled:opacity-60"
                              onClick={() => void onUndo(player)}
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={busyPlayerId === player.id}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center bg-success px-3 text-sm font-semibold text-white disabled:opacity-60"
                            onClick={() => void onCheckIn(player)}
                          >
                            {busyPlayerId === player.id ? "…" : "Check in"}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-line text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Player</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Check-in</th>
                      <th className="py-2 pr-3 font-medium">
                        {team.prepaid.skins
                          ? "Skins"
                          : `Skins (${money(skinsPrice(team.prices))})`}
                      </th>
                      <th className="py-2 font-medium">
                        {team.prepaid.skins ? "Status" : "Skins due"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {team.players.map((player) => {
                      const draft = drafts[player.id] ?? {
                        skins: false,
                        mulligans: teamMulligansOn,
                      }
                      const total = computePlayerAddonTotalCents(
                        draft,
                        team.prices,
                        {
                          prepaid: team.prepaid,
                          chargeTeamMulligans: false,
                        },
                      )
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
                          <td className="py-3 pr-3">
                            {team.prepaid.skins ? (
                              <span className="text-muted">Included</span>
                            ) : (
                              <input
                                type="checkbox"
                                className="size-5"
                                checked={draft.skins}
                                onChange={(e) =>
                                  setPlayerSkins(player.id, e.target.checked)
                                }
                                aria-label={`${player.display_name} Skins`}
                              />
                            )}
                          </td>
                          <td className="py-3 font-medium tabular-nums">
                            {team.prepaid.skins ? (
                              <PrepaidBadge label="Prepaid · $0" />
                            ) : (
                              money(total)
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sticky due/save on mobile */}
              <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-3 py-2 md:static md:inset-auto md:mt-0 md:flex md:flex-wrap md:items-center md:justify-between md:gap-4 md:border md:px-4 md:py-4">
                <div className="mb-1 md:mb-0">
                  <p className="text-sm font-medium tabular-nums md:text-base">
                    {liveTeamTotal > 0
                      ? `Due: ${money(liveTeamTotal)}`
                      : "Due: $0"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingAddons}
                  className="btn-deep inline-flex min-h-11 w-full items-center justify-center px-6 text-sm font-medium disabled:opacity-60 md:w-auto"
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
