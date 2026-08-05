import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import {
  STAFF_COOKIE,
  verifyStaffSessionTokenEdge,
} from "@/lib/staff-password"

const isStaffRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"])
const isStaffLogin = createRouteMatcher([
  "/api/admin/login",
  "/api/admin/logout",
])
const isSignIn = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"])

const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
)

function adminDevBypassEnabled(): boolean {
  if (process.env.ADMIN_DEV_BYPASS !== "1") return false
  if (process.env.VERCEL_ENV === "production") return false
  return (
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "preview"
  )
}

async function hasStaffCookie(req: NextRequest): Promise<boolean> {
  return verifyStaffSessionTokenEdge(req.cookies.get(STAFF_COOKIE)?.value)
}

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isSignIn(req) || isStaffLogin(req)) {
    return NextResponse.next()
  }

  if (!isStaffRoute(req)) {
    return NextResponse.next()
  }

  if (adminDevBypassEnabled() || (await hasStaffCookie(req))) {
    return NextResponse.next()
  }

  const session = await auth()
  if (session.userId) {
    return NextResponse.next()
  }

  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Clerk is primary — send staff to sign-in (password fallback lives there too).
  const signIn = req.nextUrl.clone()
  signIn.pathname = "/sign-in"
  signIn.searchParams.set("redirect_url", req.nextUrl.pathname)
  return NextResponse.redirect(signIn)
})

export default async function middleware(req: NextRequest, event: unknown) {
  if (adminDevBypassEnabled()) {
    return NextResponse.next()
  }

  if (isStaffLogin(req)) {
    return NextResponse.next()
  }

  if (!hasClerk) {
    // Password session unlocks admin APIs without Clerk.
    if (isStaffRoute(req) && req.nextUrl.pathname.startsWith("/api/admin")) {
      if (await hasStaffCookie(req)) {
        return NextResponse.next()
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  return (
    clerkHandler as (
      req: NextRequest,
      event: unknown,
    ) => Response | Promise<Response>
  )(req, event)
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/sign-in(.*)",
    "/sign-up(.*)",
  ],
}
