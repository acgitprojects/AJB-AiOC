/**
 * app/api/ratelimit/status/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/ratelimit/status?agentId=...   — get agent rate limit status
 *
 * SPRINT 2: Rate limit monitoring
 * Returns current rate limit usage for an agent
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getRateLimitStatus } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json(
      { error: "Missing required query parameter: agentId" },
      { status: 400 }
    );
  }

  try {
    const status = await getRateLimitStatus(agentId);

    return NextResponse.json(
      { ok: true, agentId, rateLimit: status },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error(`[ratelimit/status] Failed to get status for ${agentId}:`, err);

    return NextResponse.json(
      { error: "Failed to get rate limit status" },
      { status: 500 }
    );
  }
}
