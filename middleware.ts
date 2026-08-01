import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

const isStaffRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"])
const isSignIn = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"])

const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
)

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isSignIn(req)) {
    return NextResponse.next()
  }

  if (!isStaffRoute(req)) {
    return NextResponse.next()
  }

  const session = await auth()
  if (session.userId) {
    return NextResponse.next()
  }

  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const signIn = req.nextUrl.clone()
  signIn.pathname = "/sign-in"
  signIn.searchParams.set("redirect_url", req.nextUrl.pathname)
  return NextResponse.redirect(signIn)
})

export default function middleware(req: NextRequest, event: unknown) {
  if (!hasClerk) {
    if (isStaffRoute(req) && req.nextUrl.pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Clerk is not configured" },
        { status: 503 },
      )
    }
    return NextResponse.next()
  }

  return (clerkHandler as (req: NextRequest, event: unknown) => Response | Promise<Response>)(
    req,
    event,
  )
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/sign-in(.*)",
    "/sign-up(.*)",
  ],
}
