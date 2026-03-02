/**
 * middleware.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Simple password-gate for the entire dashboard.
 * Checks for a signed session cookie (aioc_session) set by /api/auth/login.
 * Unauthenticated requests are redirected to /login.
 *
 * Public routes (no auth required):
 *   /login                 — the login page itself
 *   /api/auth/login        — login POST handler
 *   /_next/*               — Next.js assets
 *   /favicon.ico           — favicon
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Next.js internals and public paths through without auth.
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  // Check session cookie.
  const session = req.cookies.get("aioc_session")?.value;
  const expected = process.env.DASHBOARD_SESSION_SECRET ?? "aioc";

  if (session !== expected) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
