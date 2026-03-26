import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const url = request.nextUrl.clone()

  // Handle admin subdomain (always apply - this is an admin-only app)
  if (true || hostname.startsWith("admin.") || hostname.startsWith("localhost")) {
    // Public admin routes - no auth required
    if (url.pathname === "/login" || url.pathname.startsWith("/api/admin/auth")) {
      return NextResponse.next()
    }

    // API routes for admin - check admin_session cookie
    if (url.pathname.startsWith("/api/admin") || url.pathname.startsWith("/api/cron")) {
      const token = request.cookies.get("admin_session")?.value
      // Cron routes use a different auth mechanism
      if (url.pathname.startsWith("/api/cron")) {
        const cronSecret = request.headers.get("x-cron-secret")
        if (cronSecret !== process.env.ADMIN_CRON_SECRET) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        return NextResponse.next()
      }
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      return NextResponse.next()
    }

    // Admin pages - check admin_session cookie
    const token = request.cookies.get("admin_session")?.value
    if (!token && url.pathname !== "/login") {
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    // If logged in and trying to access login page, redirect to dashboard
    if (token && url.pathname === "/login") {
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    // Root redirect to dashboard
    if (url.pathname === "/") {
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.gif|.*\\.ico|.*\\.webp).*)"],
}
