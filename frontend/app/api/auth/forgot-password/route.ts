/**
 * app/api/auth/forgot-password/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Generates a one-time reset token (valid 60 min), stores it, and emails a link.
 * Always returns 200 to prevent user enumeration.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { generateToken } from "@/lib/auth-utils";
import { getUserByEmail, saveResetToken } from "@/lib/user-store";
import { sendEmail, passwordResetEmail } from "@/lib/email";

const EXPIRES_MINUTES = 60;

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json() as { email?: string };
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: true }); // swallow bad requests silently
  }

  if (!email) {
    return NextResponse.json({ ok: true });
  }

  // Silently succeed if user not found (prevent enumeration)
  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = generateToken(32);
  const expiresAt = Date.now() + EXPIRES_MINUTES * 60 * 1000;

  await saveResetToken({ email: user.email, token, expiresAt });

  const appUrl  = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const tpl = passwordResetEmail({
    name:           user.name,
    resetUrl,
    expiresMinutes: EXPIRES_MINUTES,
  });

  await sendEmail({ to: user.email, ...tpl });

  return NextResponse.json({ ok: true });
}
