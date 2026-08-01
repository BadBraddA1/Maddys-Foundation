import { Resend } from "resend"

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
    contentId?: string
  }>
}

export function emailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
  )
}

/** Skip known non-deliverable / seed addresses. */
export function shouldSkipEmailAddress(to: string): boolean {
  const email = to.trim().toLowerCase()
  if (!email) return true
  if (email.endsWith(".test") || email.endsWith(".example")) return true
  if (email.includes("@checkin-seed.")) return true
  return false
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const toList = (Array.isArray(input.to) ? input.to : [input.to])
    .map((t) => t.trim())
    .filter(Boolean)

  if (toList.length === 0) {
    return { ok: false, error: "No recipients" }
  }

  const deliverable = toList.filter((t) => !shouldSkipEmailAddress(t))
  if (deliverable.length === 0) {
    console.info("[email] skip seed/test address", toList.join(", "))
    return { ok: true, id: "skipped-test" }
  }

  if (!emailConfigured()) {
    console.info(
      "[email] not configured — would send:",
      input.subject,
      "→",
      deliverable.join(", "),
    )
    return { ok: false, error: "Email is not configured" }
  }

  const resend = new Resend(process.env.RESEND_API_KEY!.trim())
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!.trim(),
    to: deliverable,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      contentId: a.contentId,
      contentDisposition: a.contentId ? ("inline" as const) : undefined,
    })),
  })

  if (error) {
    console.error("[email] send failed", error)
    return { ok: false, error: error.message }
  }
  return { ok: true, id: data?.id }
}
