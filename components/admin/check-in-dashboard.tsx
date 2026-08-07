"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { formatAddonMoney } from "@/lib/check-in-shared"

type TeamRow = {
  registrationId: number
  teamName: string
  playerCount: number
  checkedInCount: number
  skinsCount: number
  mulligansCount: number
  addonTotalCents: number
}

type Totals = {
  teams: number
  players: number
  checkedIn: number
  skins: number
  mulligans: number
  addonTotalCents: number
}

type Props = { eventId: number; eventTitle: string }

type SortKey =
  | "teamName"
  | "playerCount"
  | "checkedInCount"
  | "skinsCount"
  | "mulligansCount"
  | "addonTotalCents"

export function CheckInDashboard({ eventId, eventTitle }: Props) {
  const [totals, setTotals] = useState<Totals | null>(null)
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [onlyFull, setOnlyFull] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("teamName")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/check-in/dashboard?eventId=${eventId}`)
      const data = (await res.json()) as {
        error?: string
        totals?: Totals
        teams?: TeamRow[]
      }
      if (!res.ok) {
        setError(data.error || "Unable to load dashboard.")
        return
      }
      setTotals(data.totals ?? null)
      setTeams(data.teams ?? [])
    } catch {
      setError("Database connection error.")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    let rows = [...teams]
    const needle = q.trim().toLowerCase()
    if (needle) {
      rows = rows.filter((t) => t.teamName.toLowerCase().includes(needle))
    }
    if (onlyFull) {
      rows = rows.filter(
        (t) => t.playerCount > 0 && t.checkedInCount >= t.playerCount,
      )
    }
    rows.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av)
      }
      return sortDir === "asc"
        ? Number(av) - Number(bv)
        : Number(bv) - Number(av)
    })
    return rows
  }, [teams, q, onlyFull, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function exportCsv() {
    const header = [
      "Team Name",
      "Total Players",
      "Players Checked In",
      "Skins",
      "Mulligans",
      "Add-On Total",
    ]
    const lines = [
      header.join(","),
      ...filtered.map((t) =>
        [
          JSON.stringify(t.teamName),
          t.playerCount,
          t.checkedInCount,
          t.skinsCount,
          t.mulligansCount,
          (t.addonTotalCents / 100).toFixed(2),
        ].join(","),
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `check-in-${eventId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cards = totals
    ? [
        { label: "Teams", value: String(totals.teams) },
        { label: "Players", value: String(totals.players) },
        { label: "Checked in", value: String(totals.checkedIn) },
        { label: "Skins (players)", value: String(totals.skins) },
        { label: "Mulligans (teams)", value: String(totals.mulligans) },
        {
          label: "Add-on total",
          value: formatAddonMoney(totals.addonTotalCents),
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Check-in dashboard</h1>
          <p className="mt-1 text-sm text-muted">{eventTitle}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-medium">
          <button
            type="button"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
            onClick={exportCsv}
          >
            Export CSV
          </button>
          <Link
            href="/admin/check-in"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Desk
          </Link>
        </div>
      </div>

      {error ? (
        <p className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="border border-line bg-surface px-4 py-4">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 font-display text-2xl tabular-nums text-ink">
              {loading && !totals ? "…" : c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input
          className="field-control min-h-11 max-w-sm"
          placeholder="Filter teams"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={onlyFull}
            onChange={(e) => setOnlyFull(e.target.checked)}
          />
          Fully checked in only
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              {(
                [
                  ["teamName", "Team"],
                  ["playerCount", "Players"],
                  ["checkedInCount", "Checked in"],
                  ["skinsCount", "Skins (players)"],
                  ["mulligansCount", "Mulligans (teams)"],
                  ["addonTotalCents", "Add-ons"],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="py-2 pr-3 font-medium">
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((t) => (
              <tr key={t.registrationId}>
                <td className="py-3 pr-3">
                  <Link
                    href={`/admin/check-in/team/${t.registrationId}`}
                    className="font-medium text-ink underline underline-offset-4"
                  >
                    {t.teamName}
                  </Link>
                </td>
                <td className="py-3 pr-3 tabular-nums">{t.playerCount}</td>
                <td className="py-3 pr-3 tabular-nums">{t.checkedInCount}</td>
                <td className="py-3 pr-3 tabular-nums">{t.skinsCount}</td>
                <td className="py-3 pr-3 tabular-nums">{t.mulligansCount}</td>
                <td className="py-3 tabular-nums">
                  {formatAddonMoney(t.addonTotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 ? (
          <p className="mt-6 text-muted">No teams match.</p>
        ) : null}
      </div>
    </div>
  )
}
