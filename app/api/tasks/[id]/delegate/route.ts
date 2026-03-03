/**
 * app/api/tasks/[id]/delegate/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/tasks/[id]/delegate     — delegate task to another agent
 *
 * SPRINT 2: Task delegation
 * Agent can delegate a task to another agent with approval workflow
 *
 * Workflow:
 * 1. Agent A proposes delegation to Agent B
 * 2. System sends notification to Agent B
 * 3. Agent B accepts or rejects (via consensus if multiple agents involved)
 * 4. If accepted: ownership transfers, Agent A removed from handlers
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTask, updateTask } from "@/lib/task-store";
import { getAgent } from "@/lib/agent-store";
import { logAudit } from "@/lib/audit-log";

export interface DelegateTaskRequest {
  targetAgentId: string;
  reason?: string;
}

export async function POST(
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
  const taskId = resolvedParams.id;

  let body: DelegateTaskRequest;
  try {
    body = (await req.json()) as DelegateTaskRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.targetAgentId) {
    return NextResponse.json(
      { error: "Missing required field: targetAgentId" },
      { status: 400 }
    );
  }

  try {
    // Resolve params for Next.js 15+
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    // Fetch task
    const task = await getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Verify target agent exists
    const targetAgent = await getAgent(body.targetAgentId);
    if (!targetAgent) {
      return NextResponse.json(
        { error: `Target agent ${body.targetAgentId} not found` },
        { status: 404 }
      );
    }

    // Add delegation proposal if not already present
    const delegationHistory = (task.delegations || []) as Array<{
      from: string;
      to: string;
      proposedAt: string;
      acceptedAt?: string;
      reason?: string;
      status: "PENDING" | "ACCEPTED" | "REJECTED";
    }>;

    delegationHistory.push({
      from: session.email || "system",
      to: body.targetAgentId,
      proposedAt: new Date().toISOString(),
      reason: body.reason,
      status: "PENDING",
    });

    // Update task with delegation proposal
    const now = new Date().toISOString();
    const updatedTask = await updateTask(taskId, {
      delegations: delegationHistory,
      updatedAt: now,
      // Add to delegation queue if not there
      status: task.status === "delegated" ? "delegated" : task.status,
    });

    await logAudit({
      timestamp: now,
      userEmail: session.email,
      action: "task_delegate",
      resource: "task",
      resourceId: taskId,
      details: {
        targetAgentId: body.targetAgentId,
        reason: body.reason,
        status: "PENDING",
      },
      status: "success",
    });

    return NextResponse.json(
      {
        ok: true,
        task: updatedTask,
        delegation: {
          from: session.email,
          to: body.targetAgentId,
          status: "PENDING",
          proposedAt: now,
          message: `Delegation proposal sent to ${body.targetAgentId}`,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[tasks/id/delegate] Failed to delegate task:", err);

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "task_delegate",
      resource: "task",
      resourceId: taskId,
      details: { error: String(err), targetAgentId: body.targetAgentId },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to delegate task" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]/delegate?action=accept|reject
 * Accept or reject a delegation proposal
 */
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
  const taskId = resolvedParams.id;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") as "accept" | "reject" | null;

  if (!action || !["accept", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Missing or invalid 'action' query parameter (accept|reject)" },
      { status: 400 }
    );
  }

  try {
    const task = await getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const delegations = (task.delegations || []) as Array<{
      from: string;
      to: string;
      proposedAt: string;
      acceptedAt?: string;
      reason?: string;
      status: "PENDING" | "ACCEPTED" | "REJECTED";
    }>;

    // Find latest pending delegation
    const latestDelegation = delegations.find(d => d.status === "PENDING");

    if (!latestDelegation) {
      return NextResponse.json(
        { error: "No pending delegation for this task" },
        { status: 400 }
      );
    }

    // Update delegation status
    latestDelegation.status = action === "accept" ? "ACCEPTED" : "REJECTED";
    if (action === "accept") {
      latestDelegation.acceptedAt = new Date().toISOString();
    }

    const now = new Date().toISOString();
    const updatedTask = await updateTask(taskId, {
      delegations,
      updatedAt: now,
      // If rejected, revert to previous status
      status: action === "reject" ? task.status : "in-progress",
    });

    await logAudit({
      timestamp: now,
      userEmail: session.email,
      action: `task_delegation_${action}`,
      resource: "task",
      resourceId: taskId,
      details: {
        delegatedFrom: latestDelegation.from,
        delegatedTo: latestDelegation.to,
      },
      status: "success",
    });

    return NextResponse.json(
      {
        ok: true,
        task: updatedTask,
        delegation: {
          ...latestDelegation,
          message: `Delegation ${action === "accept" ? "accepted" : "rejected"}`,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[tasks/id/delegate] Failed to process delegation response:", err);

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "task_delegation_respond",
      resource: "task",
      resourceId: taskId,
      details: { error: String(err), action },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to process delegation response" },
      { status: 500 }
    );
  }
}
