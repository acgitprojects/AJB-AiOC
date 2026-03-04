/**
 * app/api/users/me/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/users/me   — return the current authenticated user (no password hash)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserByEmail } from "@/lib/user-store";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const user = await getUserByEmail(session.email);
  if (!user) {
    // Legacy single-password mode: synthesise a minimal user object from the session
    return NextResponse.json({
      ok: true,
      user: { email: session.email, name: session.name, role: session.role, alertsEnabled: false },
    });
  }

  const { passwordHash: _ph, ...safe } = user;
  return NextResponse.json({ ok: true, user: safe });
}
