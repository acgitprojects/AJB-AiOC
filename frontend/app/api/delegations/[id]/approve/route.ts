/**
 * app/api/delegations/[id]/approve/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/delegations/[id]/approve    — target agent accepts delegation
 *
 * SPRINT 2 PHASE 3: Delegation acceptance
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDelegation, acceptDelegation } from "@/lib/delegation-store";
import { getTask, updateTask } from "@/lib/task-store";
import { logAudit } from "@/lib/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export interface ApproveRequest {
  responseReason?: string;
}

export async function POST(req: NextRequest, { params }: Params) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const now = new Date().toISOString();

  let body: ApproveRequest = {};
  try {
    body = (await req.json()) as ApproveRequest;
  } catch {
    // Empty body is OK for approve
  }

  try {
    const delegation = await getDelegation(id);

    if (!delegation) {
      return NextResponse.json(
        { error: "Delegation not found" },
        { status: 404 }
      );
    }

    // Only target agent can approve
    if (delegation.targetAgentId !== session.email) {
      return NextResponse.json(
        {
          error: "Only target agent can approve delegation",
          targetAgent: delegation.targetAgentId,
        },
        { status: 403 }
      );
    }

    if (delegation.status !== "PROPOSED" && delegation.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        {
          error: `Cannot approve delegation in status ${delegation.status}`,
        },
        { status: 400 }
      );
    }

    // RATE LIMITING: Check target agent
    const rateLimitCheck = await checkRateLimit(delegation.targetAgentId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Accept the delegation
    const approved = await acceptDelegation(id, body.responseReason);

    // Update task to mark delegation as accepted
    const task = await getTask(delegation.taskId);
    if (task) {
      await updateTask(delegation.taskId, {
        status: "delegated",
        updatedAt: now,
      });
    }

    await logAudit({
      timestamp: now,
      userEmail: session.email,
      action: "delegation_approve",
      resource: "delegation",
      resourceId: id,
      details: {
        taskId: delegation.taskId,
        sourceAgent: delegation.sourceAgentId,
        targetAgent: delegation.targetAgentId,
      },
      status: "success",
    });

    return NextResponse.json(
      {
        ok: true,
        delegation: approved,
        message: `Delegation approved. Task ${delegation.taskId} will be transferred to ${delegation.targetAgentId}`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(`[delegations/id/approve] Failed to approve delegation ${id}:`, err);

    await logAudit({
      timestamp: now,
      userEmail: session.email,
      action: "delegation_approve",
      resource: "delegation",
      resourceId: id,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to approve delegation" },
      { status: 500 }
    );
  }
}
