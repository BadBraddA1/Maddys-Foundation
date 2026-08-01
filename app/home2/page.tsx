import type { Metadata } from "next"
import { HomePageView } from "@/components/home-page-view"

export const metadata: Metadata = {
  title: "Color test — Fairway green",
  robots: { index: false, follow: false },
}

export const revalidate = 60

/** Golf-course green palette — color test only. */
export default async function Home2Page() {
  return (
    <HomePageView theme="fairway" testLabel="Golf course green" />
  )
}
