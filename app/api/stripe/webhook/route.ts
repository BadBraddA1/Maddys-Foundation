import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"

export const runtime = "nodejs"

/**
 * Stripe CLI / Dashboard can ping this route. Real work is in POST.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
  })
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET missing")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const rawBody = await req.text()

  let event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    console.error("[stripe webhook] signature", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      if (session.metadata?.kind === "sponsor_payment") {
        const { confirmSponsorFromCheckout } = await import(
          "@/lib/sponsor-checkout"
        )
        await confirmSponsorFromCheckout(session)
      } else {
        const { confirmRegistrationFromCheckout } = await import(
          "@/lib/stripe-checkout"
        )
        await confirmRegistrationFromCheckout(session)
      }
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object
      if (session.metadata?.kind === "sponsor_payment") {
        const { dropPendingSponsorFromSession } = await import(
          "@/lib/sponsor-checkout"
        )
        await dropPendingSponsorFromSession(session)
      } else {
        const { dropPendingRegistrationFromSession } = await import(
          "@/lib/stripe-checkout"
        )
        await dropPendingRegistrationFromSession(session)
      }
    }
  } catch (err) {
    console.error("[stripe webhook] handler", err)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
