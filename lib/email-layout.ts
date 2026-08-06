import { publicSiteUrl } from "@/lib/stripe"
import { siteName, siteShortName } from "@/lib/site-metadata"

/** Hex stand-ins for site OKLCH tokens — email clients need hex. */
export const EMAIL_COLORS = {
  cream: "#f8f6f0",
  surface: "#ffffff",
  ink: "#1c3d32",
  muted: "#5a6b60",
  border: "#e5e2d9",
  deep: "#1c3d32",
  deepMid: "#2a4f42",
  onDeep: "#f7f5f0",
  accent: "#c9a24b",
  accentLight: "#e0c078",
  accentSoft: "#f4ecda",
  accentInk: "#4a3a1f",
} as const

const FONT_DISPLAY =
  "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Times New Roman', serif"
const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
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
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px">
      <tr>
        <td>
          <a class="mf-cta" href="${escapeEmailHtml(href)}"
             style="display:inline-block;padding:15px 28px;font-family:${FONT_SANS};font-size:16px;font-weight:700;line-height:1;color:${EMAIL_COLORS.onDeep};text-decoration:none;background-color:${EMAIL_COLORS.deep};border:1px solid ${EMAIL_COLORS.deepMid};border-radius:999px">
            ${escapeEmailHtml(label)}
          </a>
        </td>
      </tr>
    </table>`.trim()
}

export function emailSecondaryLink(href: string, label: string): string {
  return `<a href="${escapeEmailHtml(href)}" style="color:${EMAIL_COLORS.accent};font-weight:700;text-decoration:underline">${escapeEmailHtml(label)}</a>`
}

export type WrapEmailHtmlOpts = {
  preheader?: string
  /** Small uppercase label above the headline (e.g. "You're registered"). */
  eyebrow?: string
  headline: string
  /** Main column HTML (already escaped where needed). */
  bodyHtml: string
  ctaLabel: string
  ctaUrl: string
  /** Extra HTML under the CTA (links, notes). */
  secondaryHtml?: string
  footerNote?: string
}

/**
 * Pew Packer–style shell: cream page, centered logo, rounded card,
 * gold→fairway gradient stripe, pill CTA.
 */
export function wrapEmailHtml(opts: WrapEmailHtmlOpts): string {
  const logoUrl = `${publicSiteUrl()}/brand/logo.jpg`
  const homeUrl = publicSiteUrl()
  const preheader = opts.preheader?.trim() || ""
  const eyebrow = opts.eyebrow?.trim() || ""
  const footerNote = opts.footerNote?.trim() || ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${escapeEmailHtml(opts.headline)}</title>
  <!--[if mso]><style type="text/css">body,table,td{font-family:Georgia,'Times New Roman',serif!important;}</style><![endif]-->
  <style>
    @media (max-width: 620px) {
      .mf-shell { padding: 16px 12px !important; }
      .mf-card { border-radius: 16px !important; }
      .mf-pad { padding: 24px 20px !important; }
      .mf-headline { font-size: 26px !important; line-height: 1.25 !important; }
      .mf-cta { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_COLORS.cream}">
  ${
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${escapeEmailHtml(preheader)}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_COLORS.cream}">
    <tr>
      <td align="center" class="mf-shell" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">
          <tr>
            <td style="padding:0 0 18px;text-align:center">
              <a href="${escapeEmailHtml(homeUrl)}" style="text-decoration:none;display:inline-block">
                <img src="${escapeEmailHtml(logoUrl)}" width="88" height="88" alt="${escapeEmailHtml(siteShortName)}" style="display:block;margin:0 auto;width:88px;height:88px;border:0;border-radius:50%;object-fit:cover;box-shadow:0 8px 24px rgba(28,61,50,0.18)"/>
              </a>
              <div style="margin-top:12px;font-family:${FONT_DISPLAY};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${EMAIL_COLORS.ink}">
                ${escapeEmailHtml(siteShortName)}
              </div>
              <div style="margin-top:2px;font-family:${FONT_SANS};font-size:12px;color:${EMAIL_COLORS.muted}">
                ${escapeEmailHtml(siteName)}
              </div>
            </td>
          </tr>
          <tr>
            <td class="mf-card" style="background-color:${EMAIL_COLORS.surface};border:1px solid ${EMAIL_COLORS.border};border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(28,61,50,0.1)">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:5px;background:linear-gradient(90deg, ${EMAIL_COLORS.accent} 0%, ${EMAIL_COLORS.accentLight} 50%, ${EMAIL_COLORS.deepMid} 100%);font-size:0;line-height:0">&nbsp;</td>
                </tr>
                <tr>
                  <td class="mf-pad" style="padding:32px 36px 28px">
                    ${
                      eyebrow
                        ? `<p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_COLORS.accent}">${escapeEmailHtml(eyebrow)}</p>`
                        : ""
                    }
                    <h1 class="mf-headline" style="margin:0 0 18px;font-family:${FONT_DISPLAY};font-size:30px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;color:${EMAIL_COLORS.ink}">${escapeEmailHtml(opts.headline)}</h1>
                    <div style="font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${EMAIL_COLORS.muted}">
                      ${opts.bodyHtml}
                    </div>
                    ${emailCta(opts.ctaUrl, opts.ctaLabel)}
                    ${opts.secondaryHtml ?? ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${EMAIL_COLORS.muted}">
              ${footerNote ? `<p style="margin:0 0 10px">${escapeEmailHtml(footerNote)}</p>` : ""}
              <p style="margin:0 0 8px">
                <a href="${escapeEmailHtml(homeUrl)}" style="color:${EMAIL_COLORS.accent};text-decoration:underline">${escapeEmailHtml(siteName)}</a>
              </p>
              <p style="margin:0;opacity:0.85">Spreading joy and light in honor of Madalyn Robinson</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

export function emailDetailRows(
  rows: Array<{ label: string; value: string }>,
): string {
  const lines = rows
    .map(
      (r, i) =>
        `<tr>
          <td style="padding:12px 0;${i < rows.length - 1 ? `border-bottom:1px solid ${EMAIL_COLORS.border};` : ""}font-family:${FONT_SANS};font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL_COLORS.accent};width:78px;vertical-align:top">${escapeEmailHtml(r.label)}</td>
          <td style="padding:12px 0;${i < rows.length - 1 ? `border-bottom:1px solid ${EMAIL_COLORS.border};` : ""}font-family:${FONT_SANS};font-size:15px;font-weight:600;color:${EMAIL_COLORS.ink};vertical-align:top">${escapeEmailHtml(r.value)}</td>
        </tr>`,
    )
    .join("")
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:8px 0 4px;background-color:${EMAIL_COLORS.cream};border:1px solid ${EMAIL_COLORS.border};border-radius:14px">
      <tr>
        <td style="padding:4px 18px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">${lines}</table>
        </td>
      </tr>
    </table>`.trim()
}

export function emailCodeBlock(code: string, label = "Check-in code"): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 8px;background:linear-gradient(135deg, rgba(201,162,75,0.14) 0%, rgba(28,61,50,0.08) 100%);border:1px solid rgba(201,162,75,0.35);border-radius:16px">
      <tr>
        <td style="padding:22px 18px;text-align:center">
          <div style="font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_COLORS.accent}">${escapeEmailHtml(label)}</div>
          <div style="margin-top:10px;font-family:${FONT_MONO};font-size:28px;letter-spacing:0.14em;font-weight:700;color:${EMAIL_COLORS.ink}">${escapeEmailHtml(code)}</div>
        </td>
      </tr>
    </table>`.trim()
}

export function emailQrBlock(src: string, alt = "Check-in QR code"): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px">
      <tr>
        <td align="center" style="padding:16px;background-color:${EMAIL_COLORS.cream};border:1px solid ${EMAIL_COLORS.border};border-radius:16px">
          <img src="${escapeEmailHtml(src)}" alt="${escapeEmailHtml(alt)}" width="200" height="200" style="display:block;margin:0 auto;border:0;background-color:#ffffff;border-radius:8px"/>
        </td>
      </tr>
    </table>`.trim()
}

/** @deprecated Prefer headline via wrapEmailHtml — kept for any leftover callers. */
export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-family:${FONT_DISPLAY};font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;color:${EMAIL_COLORS.ink}">${escapeEmailHtml(text)}</h1>`
}

export function emailParagraph(htmlOrText: string, muted = false): string {
  const color = muted ? EMAIL_COLORS.muted : EMAIL_COLORS.ink
  return `<p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${color}">${htmlOrText}</p>`
}

export { FONT_DISPLAY, FONT_SANS, FONT_MONO }
