/**
 * app/api/users/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/users        — list all users (admin only)
 * POST /api/users        — create a user  (admin only)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getAllUsers, getUserByEmail, createUser } from "@/lib/user-store";
import { hashPassword } from "@/lib/auth-utils";
import { sendEmail, welcomeEmail } from "@/lib/email";

// ── GET /api/users ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const users = await getAllUsers();
  // Strip password hashes from response
  const safe = users.map(({ passwordHash: _ph, ...u }) => u);
  return NextResponse.json({ ok: true, users: safe });
}

// ── POST /api/users ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let data: { email?: string; name?: string; password?: string; role?: string; alertsEnabled?: boolean };
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const email    = (data.email ?? "").trim().toLowerCase();
  const name     = (data.name  ?? "").trim();
  const password = (data.password ?? "").trim();
  const role     = data.role === "admin" ? "admin" : "user";

  if (!email || !name || !password) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({
    email,
    name,
    passwordHash,
    role,
    alertsEnabled: data.alertsEnabled ?? false,
  });

  // Send welcome email (best-effort)
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const tpl = welcomeEmail({ name: user.name, email: user.email, loginUrl: appUrl + "/login" });
  sendEmail({ to: user.email, ...tpl }).catch(() => null);

  const { passwordHash: _ph, ...safe } = user;
  return NextResponse.json({ ok: true, user: safe }, { status: 201 });
}
