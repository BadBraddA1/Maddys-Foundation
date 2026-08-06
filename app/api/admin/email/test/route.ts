import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { audit } from "@/lib/audit"
import { EMAIL_TEMPLATE_OPTIONS, type EmailTemplateKind } from "@/lib/email-templates"
import { sendTestTemplateEmail } from "@/lib/registration-emails"

export const runtime = "nodejs"

const KINDS = new Set(
  EMAIL_TEMPLATE_OPTIONS.map((o) => o.kind),
)

export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { kind?: string; to?: string }
  try {
    body = (await req.json()) as { kind?: string; to?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const kind = String(body.kind ?? "").trim() as EmailTemplateKind
  const to = String(body.to ?? "").trim()
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "Unknown email template." }, { status: 400 })
  }

  const result = await sendTestTemplateEmail({ kind, to })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  await audit(
    admin.email,
    "test_email",
    "email_template",
    kind,
    `to=${to}`,
  ).catch(() => undefined)

  return NextResponse.json({
    ok: true,
    id: result.id,
    message: `Test “${kind}” email sent to ${to}.`,
  })
}
