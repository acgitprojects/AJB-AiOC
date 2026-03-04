/**
 * app/api/delegations/[id]/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/delegations/[id]       — get delegation details
 * DELETE /api/delegations/[id]       — cancel delegation (by source agent)
 *
 * SPRINT 2 PHASE 3: Task delegation operations
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDelegation, cancelDelegation } from "@/lib/delegation-store";
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
    const delegation = await getDelegation(id);

    if (!delegation) {
      return NextResponse.json(
        { error: "Delegation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, delegation },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error(`[delegations/id] Failed to fetch delegation ${id}:`, err);
    return NextResponse.json(
      { error: "Failed to fetch delegation" },
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
  const now = new Date().toISOString();

  try {
    const delegation = await getDelegation(id);

    if (!delegation) {
      return NextResponse.json(
        { error: "Delegation not found" },
        { status: 404 }
      );
    }

    // Only source agent can cancel
    if (delegation.sourceAgentId !== session.email) {
      return NextResponse.json(
        { error: "Only source agent can cancel delegation" },
        { status: 403 }
      );
    }

    const cancelled = await cancelDelegation(id);

    await logAudit({
      timestamp: now,
      userEmail: session.email,
      action: "delegation_cancel",
      resource: "delegation",
      resourceId: id,
      details: { taskId: delegation.taskId },
      status: "success",
    });

    return NextResponse.json(
      { ok: true, delegation: cancelled },
      { status: 200 }
    );
  } catch (err) {
    console.error(`[delegations/id] Failed to cancel delegation ${id}:`, err);

    await logAudit({
      timestamp: now,
      userEmail: session.email,
      action: "delegation_cancel",
      resource: "delegation",
      resourceId: id,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to cancel delegation" },
      { status: 500 }
    );
  }
}
