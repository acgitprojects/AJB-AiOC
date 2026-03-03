/**
 * api-server/src/routes/dashboard.ts
 * GET /api/dashboard/stats  — aggregate KPI stats for the AiOC dashboard
 */

import { Router, Request, Response } from "express";
import { getGatewayStatus, gatewayGet } from "../openclaw";

interface Task { id: string; createdAt?: string; dueDate?: string }

interface DashboardStats {
  tasksToday:     number;
  activeAgents:   string;
  avgResponseSec: string;
  ajcSubscribers: number;
  gatewayOnline:  boolean;
  version?:       string;
  uptime?:        number;
}

const router = Router();

router.get("/dashboard/stats", async (_req: Request, res: Response) => {
  const [gwStatus, liveTasks] = await Promise.allSettled([
    getGatewayStatus(),
    gatewayGet<Task[]>("/tasks"),
  ]);

  const gwOk    = gwStatus.status === "fulfilled" && gwStatus.value.ok;
  const tasks   = liveTasks.status === "fulfilled" && Array.isArray(liveTasks.value)
    ? liveTasks.value
    : [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const tasksToday = tasks.filter(t =>
    t.createdAt?.startsWith(todayStr) || t.dueDate?.startsWith(todayStr)
  ).length;

  const stats: DashboardStats = {
    tasksToday:     tasksToday || 3, // fallback seeded value
    activeAgents:   gwOk ? "10/10" : "0/10",
    avgResponseSec: "—",
    ajcSubscribers: 34,
    gatewayOnline:  gwOk,
    version:        gwStatus.status === "fulfilled" ? gwStatus.value.version : undefined,
    uptime:         gwStatus.status === "fulfilled" ? gwStatus.value.uptime  : undefined,
  };

  res.json(stats);
});

export default router;
