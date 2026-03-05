import * as taskRepo from "../repositories/task.repository";
import type { MyTask, TaskPatch, TaskCreate } from "@ajb/contract";
import { listComments } from "./task-comments.service";
import { dispatchTaskToAgent } from "./task-agent.service";

export async function listTasks(filters?: { dueDateFrom?: string; dueDateTo?: string }): Promise<MyTask[]> {
  return taskRepo.findAll(filters);
}

export async function patchTask(
  id: string,
  patch: TaskPatch,
): Promise<MyTask | null> {
  const existing = await taskRepo.findById(id);
  if (!existing) return null;
  const updated = await taskRepo.update(id, patch);
  const agentAssignee = updated?.assignee?.type === "agent" ? updated.assignee : null;
  if (updated && agentAssignee) {
    const comments = await listComments(id);
    dispatchTaskToAgent(updated, comments, agentAssignee.id, agentAssignee.name, "update").catch(() => {});
  }
  return updated;
}

export async function createTask(data: TaskCreate): Promise<MyTask> {
  const task = await taskRepo.insert(data);
  if (data.assignee.type === "agent") {
    dispatchTaskToAgent(task, [], data.assignee.id, data.assignee.name, "assignment").catch(() => {});
  }
  return task;
}
