import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { RegisterForm } from "@/components/register-form"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeaderSolid } from "@/components/site-header"
import {
  formatEventDate,
  formatFee,
  getEventBySlug,
  isRegistrationAvailable,
} from "@/lib/events"
import { siteName } from "@/lib/site-metadata"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug).catch(() => null)
  if (!event) return { title: "Register" }
  return {
    title: `Register for ${event.title}`,
    description: `Register for ${event.title} | ${siteName}`,
  }
}

export default async function RegisterPage({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug).catch(() => null)
  if (!event || !event.is_published) notFound()

  const open = isRegistrationAvailable(event)
  const fee = formatFee(event.fee_cents)

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
        <h1 className="mt-6 font-display">Register</h1>
        <p className="mt-2 text-muted">{formatEventDate(event.starts_at)}</p>

        {!open ? (
          <p className="mt-10 text-muted">
            Registration isn&apos;t open for this event right now.
          </p>
        ) : (
          <div className="mt-10">
            <RegisterForm
              eventSlug={event.slug}
              eventTitle={event.title}
              feeLabel={fee}
              paypalLink={event.paypal_link}
            />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
