import { HomePageView } from "@/components/home-page-view"

/** Public ISR — admin/register writes call revalidatePublicEvents. */
export const revalidate = 60

export default async function HomePage() {
  return <HomePageView />
}
