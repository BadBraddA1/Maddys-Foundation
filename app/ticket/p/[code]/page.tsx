import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AddToAppleWallet } from "@/components/add-to-apple-wallet"
import { appleWalletConfigured } from "@/lib/apple-wallet-config"
import { siteName } from "@/lib/site-metadata"
import { getPublicPlayerTicketByCode } from "@/lib/ticket"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const ticket = await getPublicPlayerTicketByCode(
    decodeURIComponent(code),
  ).catch(() => null)
  return {
    title: ticket
      ? `${ticket.playerName} — check-in · ${siteName}`
      : `Player ticket · ${siteName}`,
    robots: { index: false, follow: false },
  }
}

export default async function PlayerTicketPage({ params }: Props) {
  const { code: raw } = await params
  const ticket = await getPublicPlayerTicketByCode(decodeURIComponent(raw))
  if (!ticket) notFound()

  const qrSrc = `/ticket/p/${encodeURIComponent(ticket.code)}/qr`

  return (
    <main className="mx-auto min-h-[70vh] max-w-lg px-4 py-10 print:py-4">
      <p className="text-sm text-muted">{siteName}</p>
      <h1 className="mt-2 font-display text-3xl text-ink text-pretty">
        {ticket.eventTitle}
      </h1>
      <p className="mt-2 text-muted">
        {ticket.eventWhen}
        {ticket.eventLocation ? ` · ${ticket.eventLocation}` : ""}
      </p>

      <div className="mt-8 border border-line bg-surface px-5 py-6 text-center">
        <p className="text-sm uppercase tracking-[0.14em] text-muted">Player</p>
        <p className="mt-1 font-display text-2xl text-ink">{ticket.playerName}</p>
        <p className="mt-2 text-sm text-muted">
          Team {ticket.teamName}
          {ticket.captainName ? ` · Captain ${ticket.captainName}` : ""}
        </p>
        <p className="mt-6 text-sm uppercase tracking-[0.14em] text-muted">
          Check-in code
        </p>
        <p className="mt-2 font-mono text-2xl tracking-widest text-ink sm:text-3xl">
          {ticket.code}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={`QR for ${ticket.code}`}
          width={220}
          height={220}
          className="mx-auto mt-6"
        />
        <p className="mt-3 text-sm text-muted text-pretty">
          Show this screen at the check-in desk. Staff will scan your QR to check
          you in automatically.
        </p>
        {ticket.checkedIn ? (
          <p className="mt-4 text-sm font-medium text-success" role="status">
            Already checked in.
          </p>
        ) : null}
        <AddToAppleWallet
          enabled={appleWalletConfigured()}
          href={`/ticket/p/${encodeURIComponent(ticket.code)}/wallet`}
        />
      </div>

      {ticket.teamCode ? (
        <p className="mt-8 text-sm text-muted">
          Team ticket:{" "}
          <Link
            href={`/ticket/${encodeURIComponent(ticket.teamCode)}`}
            className="font-medium text-accent-ink underline underline-offset-4"
          >
            {ticket.teamCode}
          </Link>
        </p>
      ) : null}

      <p className="mt-6 print:hidden">
        <Link
          href={`/events/${ticket.eventSlug}`}
          className="text-sm font-medium text-accent-ink underline underline-offset-4"
        >
          Event details
        </Link>
      </p>
    </main>
  )
}
