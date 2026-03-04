/**
 * app/api/agents/[id]/health/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/agents/[id]/health        — get agent health status
 *
 * SPRINT 2: Health monitoring
 * Returns current health status, last heartbeat, and alert level
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { checkAgentHealth } from "@/lib/agent-health";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const health = await checkAgentHealth(id);

    return NextResponse.json(
      { ok: true, health },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error(`[agents/id/health] Failed to check health for ${id}:`, err);

    return NextResponse.json(
      { error: "Failed to check agent health" },
      { status: 500 }
    );
  }
}
