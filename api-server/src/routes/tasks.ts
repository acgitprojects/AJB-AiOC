/**
 * api-server/src/routes/tasks.ts
 * GET    /api/tasks      — list all tasks
 * POST   /api/tasks      — create a task
 * PATCH  /api/tasks/:id  — update a task
 * DELETE /api/tasks/:id  — delete a task
 */

import { Router, Request, Response } from "express";
import { gatewayGet, gatewayPatch, gatewayPost } from "../openclaw";

export type TaskStatus   = "pending" | "in-progress" | "completed" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id:          string;
  title:       string;
  description?: string;
  status:      TaskStatus;
  priority:    TaskPriority;
  agent?:      string;
  dueDate?:    string;
  createdAt?:  string;
}

// In-memory fallback store
const FALLBACK_TASKS: Task[] = [
  { id: "t-1", title: "Reply to YC follow-up email",     status: "pending",    priority: "critical", agent: "jary",   dueDate: "2026-03-03", createdAt: "2026-03-03T07:00:00Z" },
  { id: "t-2", title: "Prepare pitch deck v3",           status: "in-progress", priority: "high",    agent: "jary",   dueDate: "2026-03-05", createdAt: "2026-03-02T09:00:00Z" },
  { id: "t-3", title: "Review Morgan's budget analysis", status: "pending",    priority: "high",     agent: "morgan", dueDate: "2026-03-04", createdAt: "2026-03-03T08:00:00Z" },
  { id: "t-4", title: "Team standup notes",              status: "completed",  priority: "medium",   agent: "jordan", createdAt: "2026-03-03T09:30:00Z" },
];

let taskIdCounter = 100;

const router = Router();

router.get("/tasks", async (_req: Request, res: Response) => {
  const live = await gatewayGet<Task[]>("/tasks");
  res.json(live ?? FALLBACK_TASKS);
});

router.post("/tasks", async (req: Request, res: Response) => {
  const body = req.body as Partial<Task>;
  if (!body.title) {
    res.status(400).json({ ok: false, error: "title is required" });
    return;
  }

  const live = await gatewayPost<Task>("/tasks", body);
  if (live) {
    res.status(201).json(live);
    return;
  }

  // In-memory fallback
  const task: Task = {
    id:        `t-${++taskIdCounter}`,
    title:     body.title,
    status:    body.status    ?? "pending",
    priority:  body.priority  ?? "medium",
    agent:     body.agent,
    dueDate:   body.dueDate,
    createdAt: new Date().toISOString(),
  };
  FALLBACK_TASKS.push(task);
  res.status(201).json(task);
});

router.patch("/tasks/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as Partial<Task>;

  const live = await gatewayPatch<Task>(`/tasks/${id}`, updates);
  if (live) {
    res.json(live);
    return;
  }

  const task = FALLBACK_TASKS.find(t => t.id === id);
  if (!task) {
    res.status(404).json({ ok: false, error: "task_not_found" });
    return;
  }
  Object.assign(task, updates);
  res.json(task);
});

router.delete("/tasks/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  // Try gateway first
  try {
    const { gatewayUrl, hooksToken } = (await import("../config")).CONFIG.openclaw;
    const r = await fetch(`${gatewayUrl}/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${hooksToken}` },
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      res.json({ ok: true });
      return;
    }
  } catch { /* fall through */ }

  const idx = FALLBACK_TASKS.findIndex(t => t.id === id);
  if (idx === -1) {
    res.status(404).json({ ok: false, error: "task_not_found" });
    return;
  }
  FALLBACK_TASKS.splice(idx, 1);
  res.json({ ok: true });
});

export default router;
