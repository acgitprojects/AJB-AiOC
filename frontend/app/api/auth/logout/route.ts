/**
 * app/api/auth/logout/route.ts
 * DELETE /api/auth/logout  — clear the session cookie
 */

import { NextResponse } from "next/server";

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("aioc_session", "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   0,
  });
  return res;
}
