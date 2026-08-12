import { NextResponse } from "next/server"
import { listPackageAvailability } from "@/lib/sponsor-hold"
import { ensureSponsorPackageConfigSchema } from "@/lib/sponsor-packages"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Public package availability (claimed vs sale-pending holds). */
export async function GET() {
  await ensureSponsorPackageConfigSchema().catch(() => undefined)
  const packages = await listPackageAvailability().catch(() => [])
  return NextResponse.json(
    { packages, serverNow: Math.floor(Date.now() / 1000) },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
