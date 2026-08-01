import { NextResponse } from "next/server"
import {
  STAFF_COOKIE,
  STAFF_MAX_AGE_SEC,
  createStaffSessionToken,
  getStaffPassword,
  passwordsMatch,
  staffPasswordConfigured,
} from "@/lib/staff-password"

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!staffPasswordConfigured()) {
    return NextResponse.json(
      { error: "Staff password login is not available." },
      { status: 503 },
    )
  }

  let body: { password?: string }
  try {
    body = (await req.json()) as { password?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const password = body.password ?? ""
  if (!passwordsMatch(password, getStaffPassword())) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(STAFF_COOKIE, createStaffSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
    sameSite: "lax",
    path: "/",
    maxAge: STAFF_MAX_AGE_SEC,
  })
  return res
}
