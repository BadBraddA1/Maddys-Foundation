/** Client-safe email template labels (no DB / SendKit). */

export type EmailTemplateKind =
  | "confirmation"
  | "reminder"
  | "player_ticket"
  | "sponsor_pay_invite"
  | "sponsor_paid_thanks"

export const EMAIL_TEMPLATE_OPTIONS: Array<{
  kind: EmailTemplateKind
  label: string
  description: string
}> = [
  {
    kind: "confirmation",
    label: "Registration confirmation",
    description: "Sent to the captain after paid registration.",
  },
  {
    kind: "reminder",
    label: "7-day reminder",
    description: "Cron reminder to share teammate tickets.",
  },
  {
    kind: "player_ticket",
    label: "Player ticket",
    description: "Personal check-in QR for one teammate.",
  },
  {
    kind: "sponsor_pay_invite",
    label: "Sponsor pay link",
    description: "Custom amount owed — Stripe card pay link (admin Option 2).",
  },
  {
    kind: "sponsor_paid_thanks",
    label: "Sponsor paid / logo live",
    description: "Thanks email after Stripe confirms payment (logo auto-publishes).",
  },
]
