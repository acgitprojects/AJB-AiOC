/**
 * app/api/delegations/[id]/reject/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/delegations/[id]/reject     — target agent rejects delegation
 *
 * SPRINT 2 PHASE 3: Delegation rejection
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDelegation, rejectDelegation } from "@/lib/delegation-store";
import { logAudit } from "@/lib/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export interface RejectRequest {
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

  let body: RejectRequest = {};
  try {
    body = (await req.json()) as RejectRequest;
  } catch {
    // Empty body is OK for reject
  }

  try {
    const delegation = await getDelegation(id);

    if (!delegation) {
      return NextResponse.json(
        { error: "Delegation not found" },
        { status: 404 }
      );
    }

    // Only target agent can reject
    if (delegation.targetAgentId !== session.email) {
      return NextResponse.json(
        {
          error: "Only target agent can reject delegation",
          targetAgent: delegation.targetAgentId,
        },
        { status: 403 }
      );
    }

    if (delegation.status !== "PROPOSED" && delegation.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        {
          error: `Cannot reject delegation in status ${delegation.status}`,
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

    // Reject the delegation
    const rejected = await rejectDelegation(id, body.responseReason);

    await logAudit({
      timestamp: now,
      userEmail: session.email,
      action: "delegation_reject",
      resource: "delegation",
      resourceId: id,
      details: {
        taskId: delegation.taskId,
        sourceAgent: delegation.sourceAgentId,
        reason: body.responseReason,
      },
      status: "success",
    });

    return NextResponse.json(
      {
        ok: true,
        delegation: rejected,
        message: `Delegation rejected. Task ${delegation.taskId} remains with ${delegation.sourceAgentId}`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(`[delegations/id/reject] Failed to reject delegation ${id}:`, err);

    await logAudit({
      timestamp: now,
      userEmail: session.email,
      action: "delegation_reject",
      resource: "delegation",
      resourceId: id,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to reject delegation" },
      { status: 500 }
    );
  }
}
