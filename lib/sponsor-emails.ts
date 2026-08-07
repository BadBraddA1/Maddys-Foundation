import { emailConfigured, sendEmail } from "@/lib/email"
import {
  emailCta,
  escapeEmailHtml,
  wrapEmailHtml,
} from "@/lib/email-layout"
import {
  formatUsdFromCents,
  venmoHandle,
} from "@/lib/sponsor-levels"
import type { Sponsor } from "@/lib/sponsors"
import { publicSiteUrl } from "@/lib/stripe"

export function sponsorPayUrl(sponsor: Sponsor): string {
  return `${publicSiteUrl()}/sponsor/pay/${sponsor.pay_token}`
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

  const amount = formatUsdFromCents(sponsor.amount_cents)
  const level = sponsor.level_label || "Sponsorship"
  const payUrl = sponsorPayUrl(sponsor)
  const venmo = venmoHandle()

  const html = wrapEmailHtml({
    preheader: `You owe ${amount} for ${level}`,
    eyebrow: "Sponsorship",
    headline: `Thanks for supporting Madalyn’s Foundation`,
    bodyHtml: `
      <p style="margin:0 0 14px">Hi ${escapeEmailHtml(sponsor.contact_name || sponsor.name)},</p>
      <p style="margin:0 0 14px">
        We’re so grateful for <strong>${escapeEmailHtml(sponsor.name)}</strong>’s
        <strong>${escapeEmailHtml(level)}</strong> commitment of
        <strong>${escapeEmailHtml(amount)}</strong>.
      </p>
      <p style="margin:0 0 14px">
        Pay securely by card with the button below. Prefer Venmo? Send
        <strong>${escapeEmailHtml(amount)}</strong> to
        <strong>@${escapeEmailHtml(venmo)}</strong> with your business name in the note —
        then reply to this email so we can confirm and publish your logo.
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

  const result = await sendEmail({
    to,
    subject: `Sponsorship payment — ${amount} for Madalyn’s Foundation`,
    html,
    text: `Hi ${sponsor.contact_name || sponsor.name},\n\nPlease pay ${amount} for your ${level} sponsorship:\n${payUrl}\n\nVenmo: @${venmo} (include your business name in the note).\n`,
  })
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

export async function sendSponsorPaidThanks(sponsor: Sponsor): Promise<void> {
  if (!emailConfigured() || !sponsor.contact_email) return
  const amount = formatUsdFromCents(sponsor.amount_cents)
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
  await sendEmail({
    to: sponsor.contact_email,
    subject: "Thank you — your sponsorship is live",
    html,
    text: `Thank you, ${sponsor.name}! We received your ${amount} sponsorship. Your logo is now on ${publicSiteUrl()}.\n`,
  })
}
