import { NextRequest, NextResponse } from "next/server";
import { OPENCLAW_CONFIG } from "@/lib/openclaw";
import { MyTask } from "@/lib/mock-data";
import { getSession } from "@/lib/session";
import { updateTask, getTask } from "@/lib/task-store";
import { logTaskOperation } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  // SECURITY: Verify user is authenticated (CRITICAL FIX for BUG-AG-004)
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await req.json() as Partial<Omit<MyTask, 'id'>>;

  // Attempt to forward the update to the OpenClaw gateway.
  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/tasks/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${OPENCLAW_CONFIG.hooksToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      // Log successful update
      await logTaskOperation(
        session.email || "unknown",
        id,
        "update",
        "success",
        { status: body.status }
      );
      return NextResponse.json(data);
    }
  } catch {
    // Gateway unreachable — fall through to KV update (CRITICAL FIX for BUG-AG-003)
  }

  // FIX BUG-AG-003: Update task in KV, not in-memory
  // This ensures mutations persist across worker restarts
  try {
    const existing = await getTask(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const updated = await updateTask(id, body);
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 500 }
      );
    }

    // Log successful update
    await logTaskOperation(
      session.email || "unknown",
      id,
      "update",
      "success",
      { status: body.status }
    );

    return NextResponse.json(updated);
  } catch (err) {
    // Log failed update
    await logTaskOperation(
      session.email || "unknown",
      id,
      "update",
      "failure",
      { error: String(err) }
    );

    return NextResponse.json(
      { error: "Failed to persist task update", details: String(err) },
      { status: 500 }
    );
  }
}
