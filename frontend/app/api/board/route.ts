/**
 * app/api/board/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/board   — fetch all kanban tasks
 * PATCH /api/board  — move a task to a different status column
 *
 * Proxies to the OpenClaw gateway /board endpoint.
 * Falls back to the mock KANBAN_TASKS array if the gateway is unreachable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { KANBAN_TASKS, type KanbanTask } from "@/lib/mock-data";
import { OPENCLAW_CONFIG } from "@/lib/openclaw";


function authHeaders() {
  return {
    Authorization: `Bearer ${OPENCLAW_CONFIG.hooksToken}`,
    "Content-Type": "application/json",
  };
}

export async function GET() {
  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/board`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return NextResponse.json(await res.json());
  } catch { /* fall through */ }

  return NextResponse.json(KANBAN_TASKS);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; status: KanbanTask["status"] };

  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/board/${body.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: body.status }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return NextResponse.json(await res.json());
  } catch { /* fall through */ }

  // Optimistic in-memory mock update
  const task = KANBAN_TASKS.find(t => t.id === body.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  task.status = body.status;
  return NextResponse.json(task);
}
