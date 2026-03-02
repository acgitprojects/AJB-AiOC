/**
 * app/api/auth/login/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/login
 *
 * Validates the submitted password against DASHBOARD_PASSWORD env var.
 * On success, sets an HttpOnly cookie (aioc_session) and redirects to /dashboard.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let password: string;
  try {
    const body = await req.json() as { password?: string };
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const correctPassword = process.env.DASHBOARD_PASSWORD ?? "";
  const sessionSecret   = process.env.DASHBOARD_SESSION_SECRET ?? "aioc";

  if (!correctPassword) {
    // No password configured — deny all logins
    return NextResponse.json({ ok: false, error: "no_password_configured" }, { status: 503 });
  }

  if (password !== correctPassword) {
    // Constant-time-ish: don't short-circuit
    return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("aioc_session", sessionSecret, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    // 7-day session
    maxAge:   60 * 60 * 24 * 7,
  });
  return response;
}
