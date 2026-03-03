/**
 * app/api/agents/[id]/heartbeat/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/agents/[id]/heartbeat    — agent lifesign / liveness proof
 *
 * SPRINT 2: Agent health monitoring
 * Agents send heartbeats every 30 seconds to maintain "online" status
 * System monitors heartbeats to detect offline/crashed agents
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { recordHeartbeat } from "@/lib/agent-health";
import { logAudit } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const now = new Date().toISOString();

  try {
    // Record the heartbeat
    await recordHeartbeat(id);

    // Log heartbeat (useful for debugging, but limited logging to avoid spam)
    // Only log every 5th heartbeat to keep logs manageable
    if (Math.random() < 0.2) {
      await logAudit({
        timestamp: now,
        userEmail: id,
        action: "agent_heartbeat",
        resource: "agent",
        resourceId: id,
        details: { heartbeatAt: now },
        status: "success",
      });
    }

    return NextResponse.json(
      {
        ok: true,
        message: `Heartbeat recorded for agent ${id}`,
        timestamp: now,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(`[agents/id/heartbeat] Failed to record heartbeat for ${id}:`, err);

    await logAudit({
      timestamp: now,
      userEmail: id,
      action: "agent_heartbeat",
      resource: "agent",
      resourceId: id,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to record heartbeat" },
      { status: 500 }
    );
  }
}
