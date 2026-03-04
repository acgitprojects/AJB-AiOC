/**
 * app/api/workflows/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/workflows          — list all workflows
 * POST /api/workflows          — create new workflow with validation
 *
 * SPRINT 2: Workflow negotiation
 * Agents propose workflows which are validated for soundness (no cycles, etc)
 * before acceptance into the system.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createWorkflow, getAllWorkflows, detectWorkflowConflicts } from "@/lib/workflow-store";
import { logAudit } from "@/lib/audit-log";

export interface CreateWorkflowRequest {
  agentId: string;
  workflowName: string;
  states: string[];
  transitions: Record<string, string[]>;
  rules?: Record<string, unknown>;
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
    const workflows = await getAllWorkflows();

    return NextResponse.json(
      { ok: true, workflows, count: workflows.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[workflows] Failed to list workflows:", err);
    return NextResponse.json(
      { error: "Failed to list workflows" },
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

  let body: CreateWorkflowRequest;
  try {
    body = (await req.json()) as CreateWorkflowRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate required fields
  if (
    !body.agentId ||
    !body.workflowName ||
    !Array.isArray(body.states) ||
    !body.transitions
  ) {
    return NextResponse.json(
      {
        error: "Missing required fields: agentId, workflowName, states, transitions",
      },
      { status: 400 }
    );
  }

  try {
    // Create workflow (will validate structure)
    const result = await createWorkflow(
      body.agentId,
      body.workflowName,
      body.states,
      body.transitions,
      body.rules || {}
    );

    // Check if validation failed
    if ("error" in result) {
      await logAudit({
        timestamp: new Date().toISOString(),
        userEmail: session.email,
        action: "workflow_create",
        resource: "workflow",
        resourceId: `${body.agentId}:${body.workflowName}`,
        details: { errors: result.error },
        status: "failure",
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Workflow validation failed",
          validationErrors: result.error,
        },
        { status: 400 }
      );
    }

    const workflow = result;

    // Check for conflicts with existing workflows
    const conflicts = await detectWorkflowConflicts(
      body.states,
      body.transitions
    );

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "workflow_create",
      resource: "workflow",
      resourceId: workflow.id,
      details: {
        states: workflow.states.length,
        congricts: conflicts.length,
      },
      status: "success",
    });

    return NextResponse.json(
      {
        ok: true,
        workflow,
        warnings:
          conflicts.length > 0
            ? {
                message: "Workflow conflicts detected with existing workflows",
                conflictingWorkflows: conflicts.map(c => c.id),
              }
            : undefined,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[workflows] Failed to create workflow:", err);

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "workflow_create",
      resource: "workflow",
      resourceId: `${body.agentId}:${body.workflowName}`,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
