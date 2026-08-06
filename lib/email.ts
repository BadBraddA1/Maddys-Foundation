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

const SENDKIT_API = "https://api.sendkit.dev"

export function emailConfigured(): boolean {
  return Boolean(
    process.env.SENDKIT_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
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

  const body: Record<string, unknown> = {
    from: process.env.EMAIL_FROM!.trim(),
    to: deliverable.length === 1 ? deliverable[0] : deliverable,
    subject: input.subject,
    html: input.html,
    text: input.text,
  }

  if (input.attachments?.length) {
    body.attachments = input.attachments.map((a) => ({
      filename: a.filename,
      content: a.content.toString("base64"),
      content_type: a.contentType,
    }))
  }

  let res: Response
  try {
    res = await fetch(`${SENDKIT_API}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDKIT_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error"
    console.error("[email] sendkit request failed", err)
    return { ok: false, error: message }
  }

  const raw = await res.text()
  let parsed: { id?: string; data?: Array<{ id?: string }>; message?: string; name?: string } =
    {}
  try {
    parsed = raw ? (JSON.parse(raw) as typeof parsed) : {}
  } catch {
    // non-JSON error body
  }

  if (!res.ok) {
    const message =
      parsed.message ||
      (raw.trim() ? raw.slice(0, 240) : `SendKit HTTP ${res.status}`)
    console.error("[email] send failed", res.status, message)
    return { ok: false, error: message }
  }

  const id = parsed.id || parsed.data?.[0]?.id
  return { ok: true, id }
}
