/**
 * middleware.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Auth gate for the entire dashboard.
 *
 * Checks for a valid signed session cookie (aioc_session) set by
 * POST /api/auth/login. Also accepts the legacy plain-secret cookie for
 * backward compatibility during migration.
 *
 * Public routes (no auth required):
 *   /login                        — login page
 *   /forgot-password              — request reset
 *   /reset-password               — reset with token
 *   /api/auth/*                   — auth endpoints
 *   /_next/*                      — Next.js assets
 *   /favicon.ico
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth-utils";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Production guard: refuse if session secret is still the insecure default.
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "aioc";
  if (process.env.NODE_ENV === "production" && secret === "aioc") {
    return new NextResponse(
      "AiOC: DASHBOARD_SESSION_SECRET is not set. Set a strong secret before deploying.",
      { status: 503, headers: { "Content-Type": "text/plain" } },
    );
  }

  // Allow static assets and public paths through.
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("aioc_session")?.value ?? "";

  // ── New: verify HMAC-signed session token ────────────────────────────────
  if (token.includes(".")) {
    const payload = await verifySession(token, secret);
    if (payload) return NextResponse.next();
  }

  // ── Legacy: plain-secret cookie (pre-user-management) ───────────────────
  if (token && token === secret) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
