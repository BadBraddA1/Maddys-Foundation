"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ResendConfirmationButton } from "@/components/admin/resend-confirmation-button"
import {
  computePlayerAddonTotalCents,
  computeTeamDeskAddonTotalCents,
  formatAddonMoney,
  isPlayerCheckedIn,
  type AddonPrice,
  type EventPlayer,
  type PrepaidAddons,
} from "@/lib/check-in-shared"

type Team = {
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

type HistoryRow = {
  id: number
  action: string
  actor: string
  detail: string
  createdAt: string
}

type Props = { team: Team; history: HistoryRow[] }

function skinsPrice(prices: AddonPrice[]) {
  return prices.find((p) => p.addon_key === "skins")?.price_cents ?? 500
}

function mulligansPrice(prices: AddonPrice[]) {
  return prices.find((p) => p.addon_key === "mulligans")?.price_cents ?? 2000
}

export function CheckInTeamDetail({ team: initial, history: initialHistory }: Props) {
  const router = useRouter()
  const [team, setTeam] = useState(() => ({
    ...initial,
    prepaid: initial.prepaid ?? { skins: false, mulligans: false },
  }))
  const [history, setHistory] = useState(initialHistory)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<
    Record<number, { skins: boolean; mulligans: boolean }>
  >(() => {
    const prepaid = initial.prepaid ?? { skins: false, mulligans: false }
    return Object.fromEntries(
      initial.players.map((p) => [
        p.id,
        {
          skins: prepaid.skins || p.skins === 1,
          mulligans: prepaid.mulligans || p.mulligans === 1,
        },
      ]),
    )
  })

  const teamMulligansOn = useMemo(() => {
    if (team.prepaid.mulligans) return true
    return Object.values(drafts).some((d) => d.mulligans)
  }, [drafts, team.prepaid.mulligans])

  const liveTotal = useMemo(
    () =>
      computeTeamDeskAddonTotalCents(
        Object.values(drafts),
        team.prices,
        team.prepaid,
      ),
    [drafts, team.prices, team.prepaid],
  )

  function applyTeam(next: Team) {
    const prepaid = next.prepaid ?? { skins: false, mulligans: false }
    setTeam({ ...next, prepaid })
    setDrafts(
      Object.fromEntries(
        next.players.map((p) => [
          p.id,
          {
            skins: prepaid.skins || p.skins === 1,
            mulligans: prepaid.mulligans || p.mulligans === 1,
          },
        ]),
      ),
    )
  }

  async function refresh() {
    const res = await fetch(`/api/admin/check-in/teams/${team.registrationId}`)
    const data = (await res.json()) as { team?: Team }
    if (data.team) applyTeam(data.team)
    const hRes = await fetch(
      `/api/admin/check-in/teams/${team.registrationId}/history`,
    )
    const hData = (await hRes.json()) as { history?: HistoryRow[] }
    if (hData.history) setHistory(hData.history)
    router.refresh()
  }

  async function undo(player: EventPlayer) {
    setBusyId(player.id)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/check-in/players/${player.id}/undo`, {
        method: "POST",
      })
      const data = (await res.json()) as {
        error?: string
        player?: EventPlayer
      }
      if (data.player) {
        setTeam((prev) => {
          const players = prev.players.map((p) =>
            p.id === data.player!.id ? data.player! : p,
          )
          return {
            ...prev,
            players,
            checkedInCount: players.filter((p) => isPlayerCheckedIn(p)).length,
          }
        })
      }
      if (!res.ok) {
        setError(data.error || "Unable to undo.")
        return
      }
      setMessage(
        `Check-in undone for ${data.player?.display_name ?? player.display_name}.`,
      )
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function checkIn(player: EventPlayer) {
    setBusyId(player.id)
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
      if (data.player) {
        setTeam((prev) => {
          const players = prev.players.map((p) =>
            p.id === data.player!.id ? data.player! : p,
          )
          return {
            ...prev,
            players,
            checkedInCount: players.filter((p) => isPlayerCheckedIn(p)).length,
          }
        })
      }
      if (!res.ok) {
        setError(data.error || "Unable to check in.")
        return
      }
      setMessage(
        `${data.player?.display_name ?? player.display_name} checked in.`,
      )
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  function setTeamMulligans(on: boolean) {
    if (team.prepaid.mulligans) return
    setDrafts((prev) => {
      const next = { ...prev }
      for (const p of team.players) {
        next[p.id] = {
          skins: next[p.id]?.skins ?? false,
          mulligans: on,
        }
      }
      return next
    })
  }

  async function saveAddons() {
    setSaving(true)
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
                mulligans: teamMulligansOn,
              }),
            })),
          }),
        },
      )
      const data = (await res.json()) as { error?: string; team?: Team }
      if (!res.ok || !data.team) {
        setError(data.error || "Unable to save add-ons.")
        return
      }
      applyTeam(data.team)
      setMessage("Add-ons saved.")
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{team.teamName}</h1>
          <p className="mt-1 text-sm text-muted">
            {team.checkedInCount}/{team.players.length} checked in ·{" "}
            {formatAddonMoney(liveTotal)} day-of add-ons
          </p>
          <p className="mt-1 font-mono text-sm tracking-wide">
            Code {team.checkInCode}
          </p>
          <div className="mt-2">
            <ResendConfirmationButton
              eventId={team.eventId}
              registrationId={team.registrationId}
            />
          </div>
          <p className="mt-1 text-sm">
            <a
              href={`/ticket/${encodeURIComponent(team.checkInCode)}`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Open shareable ticket
            </a>
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="border border-success/25 bg-success-soft px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}

      {(team.prepaid.skins || team.prepaid.mulligans) && (
        <p className="border border-success/25 bg-success-soft px-4 py-3 text-sm">
          Prepaid online:{" "}
          {[
            team.prepaid.skins ? "Skins (whole team)" : null,
            team.prepaid.mulligans ? "Mulligans (whole team)" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          . Already paid — do not collect again.
        </p>
      )}

      <div className="border border-line bg-surface px-4 py-4">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={teamMulligansOn}
            disabled={team.prepaid.mulligans}
            onChange={(e) => setTeamMulligans(e.target.checked)}
          />
          <span>
            Mulligans — whole team (
            {formatAddonMoney(mulligansPrice(team.prices))})
            {team.prepaid.mulligans ? " · Prepaid" : ""}
          </span>
        </label>
      </div>

      <ul className="space-y-4">
        {team.players.map((player) => {
          const draft = drafts[player.id] ?? {
            skins: false,
            mulligans: teamMulligansOn,
          }
          const skinsDue = computePlayerAddonTotalCents(draft, team.prices, {
            prepaid: team.prepaid,
            chargeTeamMulligans: false,
          })
          const inAlready = isPlayerCheckedIn(player)
          return (
            <li key={player.id} className="border border-line bg-surface px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{player.display_name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {inAlready
                      ? `Checked in${player.checked_in_at ? ` · ${new Date(player.checked_in_at).toLocaleString()}` : ""}`
                      : "Not checked in"}
                  </p>
                </div>
                {inAlready ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex min-h-12 items-center bg-accent px-4 text-sm font-semibold text-accent-ink">
                      Checked in
                    </span>
                    <button
                      type="button"
                      disabled={busyId === player.id}
                      className="inline-flex min-h-12 items-center justify-center border border-line px-4 text-sm font-medium disabled:opacity-60"
                      onClick={() => void undo(player)}
                    >
                      {busyId === player.id ? "…" : "Undo"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === player.id}
                    className="inline-flex min-h-12 items-center justify-center bg-success px-4 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => void checkIn(player)}
                  >
                    {busyId === player.id ? "…" : "Check In"}
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={draft.skins}
                    disabled={team.prepaid.skins}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [player.id]: {
                          skins: e.target.checked,
                          mulligans: draft.mulligans,
                        },
                      }))
                    }
                  />
                  Skins ({formatAddonMoney(skinsPrice(team.prices))}/person)
                  {team.prepaid.skins ? " · Prepaid" : ""}
                  {!team.prepaid.skins && draft.skins
                    ? ` · ${formatAddonMoney(skinsDue)}`
                    : ""}
                </label>
              </div>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        disabled={saving}
        className="btn-deep inline-flex min-h-12 items-center justify-center px-6 text-sm font-medium disabled:opacity-60"
        onClick={() => void saveAddons()}
      >
        {saving ? "Saving…" : "Save add-ons"}
      </button>

      <div>
        <h2 className="font-display text-xl">History</h2>
        <ul className="mt-3 divide-y divide-line border border-line">
          {history.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No history yet.</li>
          ) : (
            history.map((h) => (
              <li key={h.id} className="px-4 py-3 text-sm">
                <span className="font-medium text-ink">{h.action}</span>
                {h.detail ? ` · ${h.detail}` : ""}
                <span className="text-muted">
                  {" "}
                  · {h.actor} · {h.createdAt}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <Link
        href={`/admin/check-in?team=${team.registrationId}`}
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
      >
        Open on desk
      </Link>
    </div>
  )
}
