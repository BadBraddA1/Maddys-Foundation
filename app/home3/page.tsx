import type { Metadata } from "next"
import { HomePageView } from "@/components/home-page-view"

export const metadata: Metadata = {
  title: "Color test — Fairway + gold",
  robots: { index: false, follow: false },
}

export const revalidate = 60

/** Fairway green header/footer + soft gold accent — color test only. */
export default async function Home3Page() {
  return (
    <HomePageView theme="fairway-gold" testLabel="Fairway green + soft gold" />
  )
}
