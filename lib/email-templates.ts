/** Client-safe email template labels (no DB / SendKit). */

export type EmailTemplateKind = "confirmation" | "reminder" | "player_ticket"

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
]
