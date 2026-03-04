import { NextRequest, NextResponse } from "next/server";
import { OPENCLAW_CONFIG } from "@/lib/openclaw";
import { getAllTasks } from "@/lib/task-store";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Attempt to fetch live tasks from the OpenClaw gateway.
  // Falls back to KV-persisted mock data if the gateway is unreachable.
  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/tasks`, {
      headers: {
        Authorization: `Bearer ${OPENCLAW_CONFIG.hooksToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Gateway unreachable — fall through to KV/cache
  }

  // Fall back to KV-persisted tasks (not in-memory)
  const tasks = await getAllTasks();
  return NextResponse.json(tasks);
}
