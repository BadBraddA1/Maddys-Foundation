import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AddToAppleWallet } from "@/components/add-to-apple-wallet"
import { TicketCaptainShare } from "@/components/ticket-captain-share"
import { appleWalletConfigured } from "@/lib/apple-wallet-config"
import { siteName } from "@/lib/site-metadata"
import { getPublicTicketByCode } from "@/lib/ticket"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const ticket = await getPublicTicketByCode(decodeURIComponent(code)).catch(
    () => null,
  )
  return {
    title: ticket
      ? `${ticket.teamName} — check-in · ${siteName}`
      : `Ticket · ${siteName}`,
    robots: { index: false, follow: false },
  }
}

export default async function TicketPage({ params }: Props) {
  const { code: raw } = await params
  const ticket = await getPublicTicketByCode(decodeURIComponent(raw))
  if (!ticket) notFound()

  const qrSrc = `/ticket/${encodeURIComponent(ticket.code)}/qr`

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
        <p className="text-sm uppercase tracking-[0.14em] text-muted">Team</p>
        <p className="mt-1 font-display text-2xl text-ink">{ticket.teamName}</p>
        <p className="mt-6 text-sm uppercase tracking-[0.14em] text-muted">
          Team check-in code
        </p>
        <p className="mt-2 font-mono text-3xl tracking-widest text-ink">
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
          Captains: use this page to email each teammate a personal QR. On event
          day, staff can also scan this team code to open your roster.
        </p>
        <AddToAppleWallet
          enabled={appleWalletConfigured()}
          href={`/ticket/${encodeURIComponent(ticket.code)}/wallet`}
        />
      </div>

      {ticket.playerDetails.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-xl text-ink">Players</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink">
            {ticket.playerDetails.map((p) => (
              <li key={p.id}>
                <span>{p.displayName}</span>
                {p.checkInCode ? (
                  <span className="mt-0.5 block font-mono text-sm text-muted">
                    {p.checkInCode}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted">Captain: {ticket.captainName}</p>
      )}

      <TicketCaptainShare
        teamCode={ticket.code}
        players={ticket.playerDetails}
        captainEmail={ticket.captainEmail}
      />

      <p className="mt-10 print:hidden">
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
