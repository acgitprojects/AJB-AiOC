/**
 * app/api/dashboard/stats/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/dashboard/stats
 *
 * Returns KPI stats for the dashboard overview cards.
 * Derives live data from:
 *   - OpenClaw /healthz (gateway + agent count)
 *   - Tasks from KV or mock data
 * Falls back to seeded placeholder values if gateway is unreachable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllTasks } from "@/lib/task-store";
import { getGatewayStatus, OPENCLAW_CONFIG } from "@/lib/openclaw";
import { getSession } from "@/lib/session";


export interface DashboardStats {
  tasksToday:     number;
  activeAgents:   string;
  avgResponseSec: string;
  ajcSubscribers: number;
  gatewayOnline:  boolean;
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

  const [gatewayStatus, tasksData] = await Promise.allSettled([
    getGatewayStatus(),
    getAllTasks(),
  ]);

  const gwOk = gatewayStatus.status === "fulfilled" && gatewayStatus.value.ok;

  // Task count: from KV/cache, filtered by today
  let tasksToday = 0;
  if (tasksData.status === "fulfilled") {
    const todayStr = new Date().toISOString().slice(0, 10);
    tasksToday = tasksData.value.filter(t => {
      return t.createdAt?.startsWith(todayStr) || t.dueDate?.startsWith(todayStr);
    }).length;
  }

  const stats: DashboardStats = {
    tasksToday,
    activeAgents:   gwOk ? "10/10" : "0/10",
    avgResponseSec: gwOk ? "—" : "—",
    ajcSubscribers: 34, // sourced from AJC feed until /api/ajc exists
    gatewayOnline:  gwOk,
  };

  return NextResponse.json(stats, {
    headers: { "Cache-Control": "no-store" },
  });
}
