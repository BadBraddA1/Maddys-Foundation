import { publicSiteUrl } from "@/lib/stripe"
import { siteName, siteShortName } from "@/lib/site-metadata"

/** Hex stand-ins for site OKLCH tokens — email clients need hex. */
export const EMAIL_COLORS = {
  bg: "#f8f6f0",
  surface: "#fcfbf8",
  ink: "#3d372c",
  muted: "#6b6558",
  line: "#e5e2d9",
  deep: "#1c3d32",
  deepMid: "#2a4f42",
  onDeep: "#f7f5f0",
  onDeepMuted: "#d9e0db",
  accent: "#c9a24b",
  accentInk: "#4a3a1f",
} as const

const FONT_DISPLAY =
  "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Times New Roman', serif"
const FONT_SANS =
  "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif"
const FONT_MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"

export function escapeEmailHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function emailCta(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px">
      <tr>
        <td style="background-color:${EMAIL_COLORS.deep};border-radius:0">
          <a href="${escapeEmailHtml(href)}"
             style="display:inline-block;padding:14px 28px;font-family:${FONT_SANS};font-size:14px;font-weight:600;line-height:1.2;color:${EMAIL_COLORS.onDeep};text-decoration:none">
            ${escapeEmailHtml(label)}
          </a>
        </td>
      </tr>
    </table>`.trim()
}

export function emailSecondaryLink(href: string, label: string): string {
  return `<a href="${escapeEmailHtml(href)}" style="color:${EMAIL_COLORS.accentInk};font-weight:600;text-decoration:underline">${escapeEmailHtml(label)}</a>`
}

/**
 * Branded HTML shell matching the public site: fairway-green header,
 * warm off-white page, serif/sans type stacks.
 */
export function wrapEmailHtml(opts: {
  /** Shown in some clients as inbox preview. */
  preheader?: string
  /** Main column HTML (already escaped where needed). */
  bodyHtml: string
}): string {
  const logoUrl = `${publicSiteUrl()}/brand/logo.jpg`
  const homeUrl = publicSiteUrl()
  const preheader = opts.preheader?.trim() || ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${escapeEmailHtml(siteName)}</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_COLORS.bg};color:${EMAIL_COLORS.ink}">
  ${
    preheader
      ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeEmailHtml(preheader)}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_COLORS.bg}">
    <tr>
      <td align="center" style="padding:28px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">
          <tr>
            <td style="background-color:${EMAIL_COLORS.deep};padding:20px 24px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" width="48" style="width:48px">
                    <a href="${escapeEmailHtml(homeUrl)}" style="text-decoration:none">
                      <img src="${escapeEmailHtml(logoUrl)}" width="40" height="40" alt="" style="display:block;border:0;border-radius:0;width:40px;height:40px;object-fit:cover"/>
                    </a>
                  </td>
                  <td valign="middle" style="padding-left:12px">
                    <a href="${escapeEmailHtml(homeUrl)}" style="font-family:${FONT_DISPLAY};font-size:18px;font-weight:600;line-height:1.25;color:${EMAIL_COLORS.onDeep};text-decoration:none;letter-spacing:-0.02em">
                      ${escapeEmailHtml(siteShortName)}
                    </a>
                    <div style="font-family:${FONT_SANS};font-size:12px;line-height:1.4;color:${EMAIL_COLORS.onDeepMuted};margin-top:2px">
                      ${escapeEmailHtml(siteName)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:${EMAIL_COLORS.surface};border:1px solid ${EMAIL_COLORS.line};border-top:0;padding:28px 24px;font-family:${FONT_SANS};font-size:16px;line-height:1.6;color:${EMAIL_COLORS.ink}">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;font-family:${FONT_SANS};font-size:12px;line-height:1.5;color:${EMAIL_COLORS.muted}">
              <a href="${escapeEmailHtml(homeUrl)}" style="color:${EMAIL_COLORS.muted};text-decoration:underline">${escapeEmailHtml(siteName)}</a>
              <span style="color:${EMAIL_COLORS.line}"> · </span>
              Spreading joy and light in honor of Madalyn Robinson
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

export function emailDetailRow(
  rows: Array<{ label: string; value: string }>,
): string {
  const lines = rows
    .map(
      (r) =>
        `<tr>
          <td style="padding:6px 0;font-family:${FONT_SANS};font-size:13px;color:${EMAIL_COLORS.muted};width:72px;vertical-align:top">${escapeEmailHtml(r.label)}</td>
          <td style="padding:6px 0;font-family:${FONT_SANS};font-size:15px;color:${EMAIL_COLORS.ink};vertical-align:top">${escapeEmailHtml(r.value)}</td>
        </tr>`,
    )
    .join("")
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:16px 0;border-top:1px solid ${EMAIL_COLORS.line};border-bottom:1px solid ${EMAIL_COLORS.line}">${lines}</table>`
}

export function emailCodeBlock(code: string, label = "Check-in code"): string {
  return `
    <div style="margin:20px 0;padding:18px 16px;background-color:${EMAIL_COLORS.bg};border:1px solid ${EMAIL_COLORS.line};text-align:center">
      <div style="font-family:${FONT_SANS};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_COLORS.muted}">${escapeEmailHtml(label)}</div>
      <div style="margin-top:8px;font-family:${FONT_MONO};font-size:26px;letter-spacing:0.12em;color:${EMAIL_COLORS.ink}">${escapeEmailHtml(code)}</div>
    </div>`.trim()
}

export function emailQrBlock(src: string, alt = "Check-in QR code"): string {
  return `
    <div style="margin:8px 0 20px;text-align:center">
      <img src="${escapeEmailHtml(src)}" alt="${escapeEmailHtml(alt)}" width="200" height="200" style="display:inline-block;border:1px solid ${EMAIL_COLORS.line};background-color:#ffffff"/>
    </div>`.trim()
}

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-family:${FONT_DISPLAY};font-size:26px;font-weight:600;line-height:1.2;letter-spacing:-0.02em;color:${EMAIL_COLORS.ink}">${escapeEmailHtml(text)}</h1>`
}

export function emailParagraph(htmlOrText: string, muted = false): string {
  const color = muted ? EMAIL_COLORS.muted : EMAIL_COLORS.ink
  return `<p style="margin:0 0 14px;font-family:${FONT_SANS};font-size:16px;line-height:1.6;color:${color}">${htmlOrText}</p>`
}

export { FONT_DISPLAY, FONT_SANS, FONT_MONO }
