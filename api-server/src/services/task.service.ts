import * as taskRepo from "../repositories/task.repository";
import type { MyTask, TaskPatch, TaskCreate } from "@ajb/contract";

export async function listTasks(filters?: { dueDateFrom?: string; dueDateTo?: string }): Promise<MyTask[]> {
  return taskRepo.findAll(filters);
}

export async function patchTask(
  id: string,
  patch: TaskPatch,
): Promise<MyTask | null> {
  const existing = await taskRepo.findById(id);
  if (!existing) return null;
  return taskRepo.update(id, patch);
}

export async function createTask(data: TaskCreate): Promise<MyTask> {
  return taskRepo.insert(data);
}
