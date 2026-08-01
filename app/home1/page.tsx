import type { Metadata } from "next"
import { HomePageView } from "@/components/home-page-view"

export const metadata: Metadata = {
  title: "Color test — Cream white",
  robots: { index: false, follow: false },
}

export const revalidate = 60

/** Cream / warm paper palette — color test only. */
export default async function Home1Page() {
  return (
    <HomePageView theme="cream" testLabel="Cream white" />
  )
}
