/**
 * app/api/delegations/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/delegations              — list all delegations (paginated)
 * POST /api/delegations              — create new delegation proposal
 *
 * SPRINT 2 PHASE 3: Task delegation workflow
 * Agents propose task handoffs, target agents accept/reject
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getAllDelegations,
  createDelegation,
  getPendingDelegationsForAgent,
} from "@/lib/delegation-store";
import { logAudit } from "@/lib/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";

export interface CreateDelegationRequest {
  taskId: string;
  sourceAgentId: string;
  targetAgentId: string;
  reason?: string;
}

export async function GET(req: NextRequest) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");
    const filter = searchParams.get("filter") as
      | "PROPOSED"
      | "PENDING_APPROVAL"
      | "ACCEPTED"
      | "ACTIVE"
      | "REJECTED"
      | "CANCELLED"
      | null;

    let result = await getAllDelegations(limit, offset);

    // Filter by status if requested
    if (filter) {
      result.delegations = result.delegations.filter(d => d.status === filter);
    }

    return NextResponse.json(
      { ok: true, delegations: result.delegations, total: result.total },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[delegations] Failed to list delegations:", err);
    return NextResponse.json(
      { error: "Failed to list delegations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: CreateDelegationRequest;
  try {
    body = (await req.json()) as CreateDelegationRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.taskId || !body.sourceAgentId || !body.targetAgentId) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: taskId, sourceAgentId, targetAgentId",
      },
      { status: 400 }
    );
  }

  // RATE LIMITING: Check source agent
  const rateLimitCheck = await checkRateLimit(body.sourceAgentId);
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: rateLimitCheck.resetAt,
      },
      {
        status: 429,
        headers: {
          "Retry-After": new Date(rateLimitCheck.resetAt).getTime().toString(),
        },
      }
    );
  }

  try {
    const delegation = await createDelegation(
      body.taskId,
      body.sourceAgentId,
      body.targetAgentId,
      body.reason
    );

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "delegation_create",
      resource: "delegation",
      resourceId: delegation.id,
      details: {
        taskId: body.taskId,
        sourceAgent: body.sourceAgentId,
        targetAgent: body.targetAgentId,
      },
      status: "success",
    });

    return NextResponse.json(
      { ok: true, delegation },
      { status: 201 }
    );
  } catch (err) {
    console.error("[delegations] Failed to create delegation:", err);

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "delegation_create",
      resource: "delegation",
      resourceId: "",
      details: { error: String(err), taskId: body.taskId },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to create delegation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/delegations/pending?agentId=...
 * Get pending delegations waiting for this agent to respond
 */
export async function OPTIONS(req: NextRequest) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  return NextResponse.json({ ok: true });
}
