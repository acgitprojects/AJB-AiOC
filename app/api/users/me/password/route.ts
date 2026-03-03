/**
 * app/api/users/me/password/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PUT /api/users/me/password
 * Body: { currentPassword, newPassword }
 *
 * Allows an authenticated user to change their own password.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserByEmail, updateUser } from "@/lib/user-store";
import { verifyPassword, hashPassword } from "@/lib/auth-utils";

export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let currentPassword: string, newPassword: string;
  try {
    const body = await req.json() as { currentPassword?: string; newPassword?: string };
    currentPassword = (body.currentPassword ?? "").trim();
    newPassword     = (body.newPassword     ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  }

  const user = await getUserByEmail(session.email);
  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "wrong_current_password" }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await updateUser(user.email, { passwordHash });

  return NextResponse.json({ ok: true });
}
