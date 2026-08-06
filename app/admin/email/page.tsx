import { EmailTestPanel } from "@/components/admin/email-test-panel"
import { getAdminOrNull } from "@/lib/auth"
import { emailConfigured } from "@/lib/email"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminEmailPage() {
  const admin = await getAdminOrNull()
  if (!admin) redirect("/admin")

  const from = process.env.EMAIL_FROM?.trim() || ""

  return (
    <EmailTestPanel
      configured={emailConfigured()}
      defaultTo={admin.email.includes("@") ? admin.email : ""}
      fromLabel={from}
    />
  )
}
