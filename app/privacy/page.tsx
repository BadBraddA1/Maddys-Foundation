import type { Metadata } from "next"
import { SiteHeaderSolid } from "@/components/site-header"
import { siteName, siteUrl } from "@/lib/site-metadata"

export const metadata: Metadata = {
  title: "Privacy",
  description: `Privacy policy for ${siteName}.`,
}

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSolid />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 md:px-8">
        <h1 className="font-display">Privacy</h1>
        <div className="prose-measure mt-8 space-y-5 text-muted leading-relaxed">
          <p>
            When you register for an event on {siteUrl.replace(/^https?:\/\//, "")},
            we collect the information you submit (such as name, email, phone,
            guest count, and notes) so we can confirm your place and communicate
            about that event.
          </p>
          <p>
            We do not sell your personal information. Staff use registration data
            only to operate foundation events. Payment links (when used) are
            handled by the third-party processor you visit — we do not store card
            numbers on this site.
          </p>
          <p>
            Questions about your data? Contact the foundation through the channels
            listed on upcoming event pages, or ask a staff member at an event.
          </p>
          <p className="text-sm">Last updated: August 1, 2026</p>
        </div>
      </main>
    </div>
  )
}
