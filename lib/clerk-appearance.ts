/** Staff auth: site tokens, no Clerk card/logo/footer. */
export const clerkAppearance = {
  layout: {
    logoPlacement: "none",
    socialButtonsVariant: "blockButton",
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "var(--deep)",
    colorText: "var(--ink)",
    colorTextSecondary: "var(--muted)",
    colorBackground: "transparent",
    colorInputBackground: "var(--surface)",
    colorInputText: "var(--ink)",
    colorNeutral: "var(--line)",
    colorDanger: "var(--danger)",
    borderRadius: "0.375rem",
    fontFamily: "var(--font-source-sans), 'Segoe UI', system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border-0 bg-transparent p-0 shadow-none",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    logoBox: "hidden",
    footer: "hidden",
    footerPages: "hidden",
    footerAction: "hidden",
    navbar: "hidden",
    formButtonPrimary:
      "min-h-11 w-full rounded-md bg-deep text-sm font-medium text-on-deep shadow-none hover:bg-deep-mid",
    formFieldInput:
      "min-h-11 rounded-md border border-line bg-surface text-base text-ink",
    formFieldLabel: "text-sm font-medium text-ink",
    formFieldHintText: "text-sm text-muted",
    formFieldErrorText: "text-sm text-danger",
    socialButtonsBlockButton:
      "min-h-11 border border-line bg-surface text-ink hover:bg-accent-soft",
    dividerLine: "bg-line",
    dividerText: "text-muted",
    identityPreviewEditButton: "text-accent-ink",
    formResendCodeLink: "text-accent-ink",
    alternativeMethodsBlockButton: "text-accent-ink",
  },
}
