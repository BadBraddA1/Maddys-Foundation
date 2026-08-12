import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { listPackageAvailability } from "@/lib/sponsor-hold"
import {
  ensureSponsorPackageConfigSchema,
  updateSponsorPackageConfig,
} from "@/lib/sponsor-packages"
import { parseUsdToCents } from "@/lib/sponsor-levels"

export const runtime = "nodejs"

/** Admin: package inventory + pricing overrides. */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await ensureSponsorPackageConfigSchema().catch(() => undefined)
  const packages = await listPackageAvailability()
  return NextResponse.json({ packages })
}

type PatchBody = {
  packageKey?: string
  /** null / empty / "unlimited" → unlimited */
  quantity?: number | string | null
  amountUsd?: string | null
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as PatchBody | null
  const packageKey = String(body?.packageKey ?? "").trim()
  if (!packageKey) {
    return NextResponse.json({ error: "Package required." }, { status: 400 })
  }

  let quantity: number | null
  const rawQty = body?.quantity
  if (
    rawQty === null ||
    rawQty === undefined ||
    rawQty === "" ||
    String(rawQty).trim().toLowerCase() === "unlimited"
  ) {
    quantity = null
  } else {
    const n = Number(rawQty)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json(
        { error: "Quantity must be a non-negative number or unlimited." },
        { status: 400 },
      )
    }
    quantity = Math.floor(n)
  }

  let amountCents: number | null | undefined = undefined
  if (body?.amountUsd !== undefined && body.amountUsd !== null) {
    const trimmed = String(body.amountUsd).trim()
    if (!trimmed) {
      amountCents = null
    } else {
      const cents = parseUsdToCents(trimmed)
      if (!cents) {
        return NextResponse.json(
          { error: "Enter a valid dollar amount." },
          { status: 400 },
        )
      }
      amountCents = cents
    }
  }

  try {
    const pkg = await updateSponsorPackageConfig({
      packageKey,
      quantity,
      amountCents,
    })
    const packages = await listPackageAvailability()
    return NextResponse.json({ package: pkg, packages })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update package."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
