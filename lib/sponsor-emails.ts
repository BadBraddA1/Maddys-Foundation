import { emailConfigured, sendEmail } from "@/lib/email"
import {
  emailCta,
  escapeEmailHtml,
  wrapEmailHtml,
} from "@/lib/email-layout"
import { formatUsdFromCents } from "@/lib/sponsor-levels"
import type { Sponsor } from "@/lib/sponsors"
import { publicSiteUrl } from "@/lib/stripe"

export type SponsorEmailKind = "sponsor_pay_invite" | "sponsor_paid_thanks"

export function sponsorPayUrl(sponsor: Pick<Sponsor, "pay_token">): string {
  return `${publicSiteUrl()}/sponsor/pay/${sponsor.pay_token}`
}

/** Sample sponsor for /admin/email tests (no DB). */
export function sampleSponsorForEmail(): Sponsor {
  const token = "test-sponsor-pay-token"
  return {
    id: 0,
    name: "Oak Valley Partners",
    logo_url: "",
    logo_key: "",
    website_url: "https://example.com",
    contact_name: "Alex Sponsor",
    contact_email: "alex@example.com",
    contact_phone: "",
    contact_notes: "",
    sort_order: 0,
    is_published: 0,
    amount_cents: 250_00,
    payment_status: "unpaid",
    level_key: "",
    level_label: "",
    pay_token: token,
    stripe_checkout_session_id: "",
    paid_at: "",
    source: "admin",
    created_at: "",
    updated_at: "",
  }
}

export function buildSponsorEmailBodies(
  kind: SponsorEmailKind,
  sponsor: Sponsor = sampleSponsorForEmail(),
): { subject: string; html: string; text: string } {
  const amount = formatUsdFromCents(sponsor.amount_cents)
  const payUrl = sponsorPayUrl(sponsor)
  const greeting = sponsor.contact_name || sponsor.name

  if (kind === "sponsor_paid_thanks") {
    const subject = "Thank you — your sponsorship is live"
    const html = wrapEmailHtml({
      preheader: "Your sponsorship is live — thank you!",
      eyebrow: "Payment received",
      headline: "You’re on the site",
      bodyHtml: `
      <p style="margin:0 0 14px">Thank you, ${escapeEmailHtml(sponsor.name)}!</p>
      <p style="margin:0 0 14px">
        We received your ${escapeEmailHtml(amount)} sponsorship. Your logo is now
        publishing on <a href="${escapeEmailHtml(publicSiteUrl())}">maddysfoundation.org</a>.
      </p>
    `,
      ctaLabel: "Visit the site",
      ctaUrl: publicSiteUrl(),
    })
    const text = `Thank you, ${sponsor.name}! We received your ${amount} sponsorship. Your logo is now on ${publicSiteUrl()}.\n`
    return { subject, html, text }
  }

  const subject = `Sponsorship payment — ${amount} for Madalyn’s Foundation`
  const html = wrapEmailHtml({
    preheader: `Please pay ${amount} to become a sponsor`,
    eyebrow: "Sponsorship",
    headline: `Thanks for supporting Madalyn’s Foundation`,
    bodyHtml: `
      <p style="margin:0 0 14px">Hi ${escapeEmailHtml(greeting)},</p>
      <p style="margin:0 0 14px">
        We’re so grateful for <strong>${escapeEmailHtml(sponsor.name)}</strong>
        becoming a sponsor with a gift of
        <strong>${escapeEmailHtml(amount)}</strong>.
      </p>
      <p style="margin:0 0 14px">
        Pay securely by card with the button below. After Stripe confirms payment,
        your logo publishes on the site automatically — no follow-up needed.
      </p>
      ${emailCta(payUrl, `Pay ${amount}`)}
      <p style="margin:16px 0 0;font-size:13px;color:#5a6b60">
        Or open this link: ${escapeEmailHtml(payUrl)}
      </p>
    `,
    ctaLabel: `Pay ${amount}`,
    ctaUrl: payUrl,
    footerNote: "Questions? Just reply to this email.",
  })
  const text = `Hi ${greeting},\n\nPlease pay ${amount} to become a sponsor by card:\n${payUrl}\n\nYour logo publishes automatically after payment.\n`
  return { subject, html, text }
}

export async function sendSponsorPayInvite(
  sponsor: Sponsor,
): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) {
    return { ok: false, error: "Email is not configured." }
  }
  const to = sponsor.contact_email.trim()
  if (!to) return { ok: false, error: "Sponsor needs a contact email." }
  if (!sponsor.pay_token || sponsor.amount_cents <= 0) {
    return { ok: false, error: "Set an amount owed and generate a pay link first." }
  }

  const bodies = buildSponsorEmailBodies("sponsor_pay_invite", sponsor)
  const result = await sendEmail({
    to,
    subject: bodies.subject,
    html: bodies.html,
    text: bodies.text,
  })
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

export async function sendSponsorPaidThanks(sponsor: Sponsor): Promise<void> {
  if (!emailConfigured() || !sponsor.contact_email) return
  const bodies = buildSponsorEmailBodies("sponsor_paid_thanks", sponsor)
  await sendEmail({
    to: sponsor.contact_email,
    subject: bodies.subject,
    html: bodies.html,
    text: bodies.text,
  })
}

/** Admin /admin/email test — sample bodies, [TEST] subject, no DB writes. */
export async function sendTestSponsorEmail(opts: {
  kind: SponsorEmailKind
  to: string
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const to = opts.to.trim().toLowerCase()
  if (!to.includes("@") || to.length < 5) {
    return { ok: false, error: "Enter a valid email address." }
  }
  if (!emailConfigured()) {
    return {
      ok: false,
      error: "Email is not configured (SENDKIT_API_KEY + EMAIL_FROM).",
    }
  }
  const bodies = buildSponsorEmailBodies(opts.kind)
  return sendEmail({
    to,
    subject: `[TEST] ${bodies.subject}`,
    html: bodies.html,
    text: bodies.text,
  })
}
