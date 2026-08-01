import type { Metadata, Viewport } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Analytics } from "@vercel/analytics/next"
import { Literata, Source_Sans_3 } from "next/font/google"
import { clerkConfigured } from "@/lib/auth"
import {
  siteDescription,
  siteName,
  siteTitle,
  siteUrl,
} from "@/lib/site-metadata"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f2d3f",
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
  weight: ["400", "500", "600"],
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
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
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
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <Providers>
          {children}
          <Analytics />
        </Providers>
        {/* Favicons: app/icon.png + app/apple-icon.png (playbook 05) */}
      </body>
    </html>
  )
}
