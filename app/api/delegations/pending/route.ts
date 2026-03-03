/**
 * app/api/delegations/pending/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/delegations/pending?agentId=...   — agent's pending delegations
 *
 * SPRINT 2 PHASE 3: Agent workflow inbox
 * Returns delegations waiting for agent to accept/reject
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPendingDelegationsForAgent } from "@/lib/delegation-store";

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
    const delegations = await getPendingDelegationsForAgent(agentId);

    return NextResponse.json(
      {
        ok: true,
        delegations,
        count: delegations.length,
        agentId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error(
      `[delegations/pending] Failed to get pending for ${agentId}:`,
      err
    );
    return NextResponse.json(
      { error: "Failed to get pending delegations" },
      { status: 500 }
    );
  }
}
