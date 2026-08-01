import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { RegisterForm } from "@/components/register-form"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"
import {
  formatEventDate,
  formatEventFeeLabel,
  getEventBySlug,
  isRegistrationAvailable,
  listPublishedEvents,
} from "@/lib/events"
import { siteName } from "@/lib/site-metadata"
import { CHECKOUT_HOLD_MINUTES } from "@/lib/registration-hold-shared"
import { dropPendingRegistration } from "@/lib/stripe-checkout"

/** Fresh enough for capacity; registration POST also revalidates. */
export const revalidate = 30

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    paid?: string
    canceled?: string
    session_id?: string
  }>
}

export async function generateStaticParams() {
  try {
    const events = await listPublishedEvents()
    return events.map((e) => ({ slug: e.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug).catch(() => null)
  if (!event) return { title: "Register" }
  return {
    title: `Register for ${event.title}`,
    description: `Register for ${event.title} | ${siteName}`,
  }
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const event = await getEventBySlug(slug).catch(() => null)
  if (!event || !event.is_published) notFound()

  const open = isRegistrationAvailable(event)
  const fee = formatEventFeeLabel(event)
  const teamSize = event.team_size && event.team_size > 1 ? event.team_size : null
  const requirePayment = event.fee_cents > 0
  const paidReturn = query.paid === "1"
  const canceledReturn = query.canceled === "1"
  const sessionId = query.session_id?.trim()

  if (canceledReturn && sessionId) {
    await dropPendingRegistration({ checkoutSessionId: sessionId }).catch(
      () => undefined,
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeaderSolid />
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <Link
          href={`/events/${event.slug}`}
          className="inline-flex min-h-11 max-w-full items-center text-sm font-medium text-muted hover:text-ink"
        >
          <span className="truncate">← {event.title}</span>
        </Link>
        <h1 className="mt-6 font-display">
          {teamSize ? "Register your team" : "Register"}
        </h1>
        <p className="mt-2 text-muted">{formatEventDate(event.starts_at)}</p>

        {paidReturn ? (
          <div
            className="success-enter mt-10 border border-success/25 bg-success-soft px-6 py-8"
            role="status"
          >
            <h2 className="font-display text-2xl text-ink">Payment received</h2>
            <p className="mt-3 text-ink/75">
              Thanks — your team registration for{" "}
              <span className="font-medium text-ink">{event.title}</span> is
              confirmed. We&apos;ll be in touch with details closer to the date.
            </p>
            <Link
              href={`/events/${event.slug}`}
              className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
            >
              Back to event
            </Link>
          </div>
        ) : null}

        {canceledReturn && !paidReturn ? (
          <div
            className="mt-10 border border-line bg-surface px-6 py-6"
            role="status"
          >
            <p className="text-ink">
              Checkout was canceled and your hold was released — that spot is
              back in the pool. Fill out the form again when you&apos;re ready
              to pay within the {CHECKOUT_HOLD_MINUTES}-minute window.
            </p>
          </div>
        ) : null}

        {!paidReturn && !open ? (
          <p className="mt-10 text-muted">
            Registration isn&apos;t open for this event right now.
          </p>
        ) : null}

        {!paidReturn && open ? (
          <div className="mt-10">
            <RegisterForm
              eventSlug={event.slug}
              eventTitle={event.title}
              feeLabel={fee}
              feeCents={event.fee_cents}
              teamSize={teamSize}
              requirePayment={requirePayment}
            />
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}
