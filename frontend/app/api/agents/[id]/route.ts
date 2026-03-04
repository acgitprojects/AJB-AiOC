/**
 * app/api/agents/[id]/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/agents/[id]          — get agent details
 * DELETE /api/agents/[id]          — deregister agent
 * POST   /api/agents/[id]/heartbeat — agent lifesign (moved to separate route)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAgent, deregisterAgent } from "@/lib/agent-store";
import { logAudit } from "@/lib/audit-log";

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
    const agent = await getAgent(id);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, agent },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[agents] Failed to get agent:", err);
    return NextResponse.json(
      { error: "Failed to get agent" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
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
    const agent = await getAgent(id);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    const success = await deregisterAgent(id);
    if (!success) {
      throw new Error("Failed to deregister agent");
    }

    // Log the event
    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "agent_deregister",
      resource: "agent",
      resourceId: id,
      details: { name: agent.name },
      status: "success",
    });

    return NextResponse.json(
      { ok: true, message: `Agent ${id} deregistered` },
      { status: 200 }
    );
  } catch (err) {
    console.error("[agents] Failed to deregister agent:", err);

    // Log the failure
    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "agent_deregister",
      resource: "agent",
      resourceId: id,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to deregister agent" },
      { status: 500 }
    );
  }
}
