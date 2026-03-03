/**
 * lib/session.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side helper to read the current session from a Next.js request.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest } from "next/server";
import { verifySession, SessionPayload } from "@/lib/auth-utils";

// SECURITY: Validate session secret configuration (FIX for BUG-AG-005)
function getSessionSecret(): string {
  const secret = process.env.DASHBOARD_SESSION_SECRET;
  
  // Don't silently fall back to weak secret
  if (!secret || secret.length < 32) {
    console.error(
      "[session] CRITICAL: DASHBOARD_SESSION_SECRET not configured or too short (min 32 chars)"
    );
    // Return empty string so verification fails safely (client must re-login)
    return "";
  }
  
  return secret;
}

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const token  = req.cookies.get("aioc_session")?.value ?? "";
  const secret = getSessionSecret();
  
  if (!token || !secret) return null;

  const payload = await verifySession(token, secret);
  return payload;
}

export async function requireAdmin(
  req: NextRequest,
): Promise<SessionPayload | null> {
  const session = await getSession(req);
  if (!session || session.role !== "admin") return null;
  return session;
}
