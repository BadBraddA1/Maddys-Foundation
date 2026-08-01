import type { Metadata, Viewport } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Analytics } from "@vercel/analytics/next"
import { Literata, Source_Sans_3 } from "next/font/google"
import { SiteFooter } from "@/components/site-footer"
import { SiteFooterGate } from "@/components/site-footer-gate"
import { clerkConfigured } from "@/lib/auth"
import {
  ogImageAlt,
  ogImagePath,
  siteDescription,
  siteName,
  siteTitle,
  siteUrl,
  twitterImagePath,
} from "@/lib/site-metadata"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c3d32",
}

/* Display: Literata — literary warmth for memorial voice; not Fraunces soft-AI default.
   Body: Source Sans 3 — humanist clarity for forms/nav; steadfast, not geometric DM Sans. */
const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
  weight: ["400", "600"],
})

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
  // UI uses regular + medium; display headlines are Literata 600.
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: ogImagePath,
        width: 1200,
        height: 630,
        alt: ogImageAlt,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: twitterImagePath,
        width: 1200,
        height: 630,
        alt: ogImageAlt,
      },
    ],
  },
}

function Providers({ children }: { children: React.ReactNode }) {
  if (!clerkConfigured()) {
    return <>{children}</>
  }
  return <ClerkProvider>{children}</ClerkProvider>
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${literata.variable} ${sourceSans.variable}`}>
      <body className="flex min-h-screen flex-col bg-bg font-sans text-ink antialiased">
        <Providers>
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooterGate>
            <SiteFooter />
          </SiteFooterGate>
          <Analytics />
        </Providers>
        {/* Favicons: app/icon.png + app/apple-icon.png (playbook 05) */}
      </body>
    </html>
  )
}
