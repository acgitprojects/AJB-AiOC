/**
 * app/api/workflows/[id]/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/workflows/[id]          — get workflow details
 * PATCH  /api/workflows/[id]          — update workflow rules (agent negotiation)
 * DELETE /api/workflows/[id]          — remove workflow
 *
 * SPRINT 2: Individual workflow operations
 * Agents can negotiate (PATCH) workflow rules via consensus voting
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getWorkflow,
  updateWorkflowRules,
  deleteWorkflow,
} from "@/lib/workflow-store";
import { logAudit } from "@/lib/audit-log";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const resolvedParams = await params;
  const workflowId = resolvedParams.id;

  try {
    const workflow = await getWorkflow(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "workflow_view",
      resource: "workflow",
      resourceId: workflowId,
      details: {},
      status: "success",
    });

    return NextResponse.json(
      { ok: true, workflow },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[workflows/id] Failed to fetch workflow:", err);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const resolvedParams = await params;
  const workflowId = resolvedParams.id;

  let body: { rules?: Record<string, unknown> };
  try {
    body = (await req.json()) as { rules?: Record<string, unknown> };
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.rules) {
    return NextResponse.json(
      { error: "Missing 'rules' field for workflow update" },
      { status: 400 }
    );
  }

  try {
    const workflow = await getWorkflow(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Update workflow rules (for agent negotiation)
    const updated = await updateWorkflowRules(workflowId, body.rules);

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "workflow_update",
      resource: "workflow",
      resourceId: workflowId,
      details: { rulesUpdated: Object.keys(body.rules).length },
      status: "success",
    });

    return NextResponse.json(
      { ok: true, workflow: updated },
      { status: 200 }
    );
  } catch (err) {
    console.error("[workflows/id] Failed to update workflow:", err);

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "workflow_update",
      resource: "workflow",
      resourceId: workflowId,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const resolvedParams = await params;
  const workflowId = resolvedParams.id;

  try {
    const workflow = await getWorkflow(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Delete the workflow
    await deleteWorkflow(workflowId);

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "workflow_delete",
      resource: "workflow",
      resourceId: workflowId,
      details: {},
      status: "success",
    });

    return NextResponse.json(
      { ok: true, message: "Workflow deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[workflows/id] Failed to delete workflow:", err);

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "workflow_delete",
      resource: "workflow",
      resourceId: workflowId,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
