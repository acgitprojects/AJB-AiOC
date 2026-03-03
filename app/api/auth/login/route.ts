/**
 * app/api/auth/login/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/login
 *
 * Accepts { email, password }.
 * Falls back to legacy DASHBOARD_PASSWORD single-user mode when no users exist.
 * Supports demo mode when DEMO_MODE=true in .env.local
 * On success, sets a signed HttpOnly session cookie.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, signSession } from "@/lib/auth-utils";
import { getUserByEmail, userCount } from "@/lib/user-store";
import { validateDemoLogin } from "@/lib/demo";
import { logAuthEvent } from "@/lib/audit-log";

const SESSION_COOKIE  = "aioc_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// SECURITY: Validate session secret at startup (FIX for BUG-AG-005)
function getSessionSecret(): string {
  const secret = process.env.DASHBOARD_SESSION_SECRET;
  
  // Enforce minimum secret length for security
  if (!secret || secret.length < 32) {
    throw new Error(
      "CRITICAL: DASHBOARD_SESSION_SECRET not configured or too short (min 32 chars). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  
  return secret;
}

export async function POST(req: NextRequest) {
  let email: string, password: string;
  try {
    const body = await req.json() as { email?: string; password?: string };
    email    = (body.email    ?? "").trim().toLowerCase();
    password = (body.password ?? "").trim();
  } catch {
    await logAuthEvent("unknown", "failed_login", "failure", { reason: "bad_request" });
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!password) {
    await logAuthEvent(email || "unknown", "failed_login", "failure", { reason: "missing_password" });
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // Validate session secret (FIX for BUG-AG-005)
  let secret: string;
  try {
    secret = getSessionSecret();
  } catch (err) {
    // Don't expose error details to client
    console.error("[auth] Session secret configuration error:", err);
    return NextResponse.json(
      { ok: false, error: "server_misconfiguration" },
      { status: 503 }
    );
  }

  // ── Demo mode ──────────────────────────────────────────────────────────────
  const demoAccount = validateDemoLogin(email, password);
  if (demoAccount) {
    const token = await signSession(
      { email: demoAccount.email, name: demoAccount.name, role: demoAccount.role, exp: Date.now() + SESSION_MAX_AGE * 1000 },
      secret,
    );
    await logAuthEvent(demoAccount.email, "login", "success", { mode: "demo" });
    return cookieResponse(token, SESSION_MAX_AGE, { email: demoAccount.email, name: demoAccount.name, role: demoAccount.role });
  }

  // ── Legacy single-password mode (no users configured yet) ─────────────────
  const count = await userCount();
  if (count === 0) {
    const correctPassword = process.env.DASHBOARD_PASSWORD ?? "";
    if (!correctPassword) {
      await logAuthEvent(email || "unknown", "failed_login", "failure", { reason: "no_password_configured" });
      return NextResponse.json({ ok: false, error: "no_password_configured" }, { status: 503 });
    }
    if (password !== correctPassword) {
      await logAuthEvent(email || "legacy", "failed_login", "failure", { reason: "invalid_password" });
      return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
    }
    const token = await signSession(
      { email: email || "admin@local", name: "Admin", role: "admin", exp: Date.now() + SESSION_MAX_AGE * 1000 },
      secret,
    );
    await logAuthEvent(email || "admin@local", "login", "success", { mode: "legacy" });
    return cookieResponse(token, SESSION_MAX_AGE);
  }

  // ── Multi-user mode ───────────────────────────────────────────────────────
  if (!email) {
    await logAuthEvent("unknown", "failed_login", "failure", { reason: "email_required" });
    return NextResponse.json({ ok: false, error: "email_required" }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    await logAuthEvent(email, "failed_login", "failure", { reason: "user_not_found" });
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await logAuthEvent(email, "failed_login", "failure", { reason: "invalid_password" });
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const token = await signSession(
    { email: user.email, name: user.name, role: user.role, exp: Date.now() + SESSION_MAX_AGE * 1000 },
    secret,
  );

  await logAuthEvent(email, "login", "success", { mode: "multi-user" });
  return cookieResponse(token, SESSION_MAX_AGE, { email: user.email, name: user.name, role: user.role });
}

function cookieResponse(
  token: string,
  maxAge: number,
  userData?: { email: string; name: string; role: string },
) {
  const res = NextResponse.json({ ok: true, user: userData });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge,
  });
  return res;
}
