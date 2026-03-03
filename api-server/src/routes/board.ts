/**
 * api-server/src/routes/board.ts
 * GET  /api/board       — fetch all kanban tasks
 * PATCH /api/board/:id  — move a task to a new status column
 *
 * Proxies to OpenClaw gateway; uses in-memory store as fallback.
 */

import { Router, Request, Response } from "express";
import { gatewayGet, gatewayPatch } from "../openclaw";

export interface KanbanTask {
  id:       string;
  title:    string;
  status:   "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high";
  agent?:   string;
  dueDate?: string;
}

// In-memory fallback store (seeded once at startup, mutable for PATCH)
const FALLBACK_BOARD: KanbanTask[] = [
  { id: "bt-1", title: "Review Q2 marketing plan",      status: "todo",        priority: "high",   agent: "maya" },
  { id: "bt-2", title: "Update investor deck",           status: "in-progress", priority: "high",   agent: "jary",   dueDate: "2026-03-05" },
  { id: "bt-3", title: "Draft blog post — AI in ops",    status: "review",      priority: "medium", agent: "maya" },
  { id: "bt-4", title: "Interview candidate follow-ups", status: "done",        priority: "low",    agent: "sophia" },
];

const router = Router();

router.get("/board", async (_req: Request, res: Response) => {
  const live = await gatewayGet<KanbanTask[]>("/board");
  res.json(live ?? FALLBACK_BOARD);
});

router.patch("/board/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status: KanbanTask["status"] };

  if (!status) {
    res.status(400).json({ ok: false, error: "status is required" });
    return;
  }

  const live = await gatewayPatch<KanbanTask>(`/board/${id}`, { status });
  if (live) {
    res.json(live);
    return;
  }

  // Optimistic in-memory fallback
  const task = FALLBACK_BOARD.find(t => t.id === id);
  if (!task) {
    res.status(404).json({ ok: false, error: "task_not_found" });
    return;
  }
  task.status = status;
  res.json(task);
});

export default router;
