/**
 * app/api/auth/reset-password/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/reset-password
 * Body: { token, password }
 *
 * Validates the reset token, updates the password, deletes the token.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-utils";
import { getResetToken, deleteResetToken, updateUser } from "@/lib/user-store";

export async function POST(req: NextRequest) {
  let token: string, password: string;
  try {
    const body = await req.json() as { token?: string; password?: string };
    token    = (body.token    ?? "").trim();
    password = (body.password ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!token || !password) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  }

  const rt = await getResetToken(token);
  if (!rt) {
    return NextResponse.json({ ok: false, error: "invalid_or_expired_token" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const updated = await updateUser(rt.email, { passwordHash });
  if (!updated) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  await deleteResetToken(token);

  return NextResponse.json({ ok: true });
}
