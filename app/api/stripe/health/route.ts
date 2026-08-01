import { NextResponse } from "next/server"
import { getStripe, stripeConfigured } from "@/lib/stripe"

export const runtime = "nodejs"

/** Non-secret health check for Stripe keys on this deployment. */
export async function GET() {
  if (!stripeConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: "STRIPE_SECRET_KEY is empty on this environment",
    })
  }

  const key = process.env.STRIPE_SECRET_KEY!.trim()
  const mode = key.startsWith("sk_live")
    ? "live"
    : key.startsWith("sk_test")
      ? "test"
      : "unknown"

  try {
    const balance = await getStripe().balance.retrieve()
    return NextResponse.json({
      ok: true,
      configured: true,
      mode,
      livemode: balance.livemode,
      webhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      publishable: Boolean(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
      ),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        mode,
        error: message.slice(0, 200),
      },
      { status: 502 },
    )
  }
}
