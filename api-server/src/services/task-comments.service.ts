import * as repo from "../repositories/task-comments.repository";
import type { TaskComment, TaskCommentCreate } from "@ajb/contract";

export async function listComments(taskId: string): Promise<TaskComment[]> {
  return repo.findByTaskId(taskId);
}

export async function addComment(taskId: string, data: TaskCommentCreate): Promise<TaskComment> {
  const id = crypto.randomUUID();
  return repo.insert({ id, taskId, ...data });
}

export async function deleteComment(taskId: string, commentId: string): Promise<boolean> {
  const existing = await repo.findById(commentId);
  if (!existing || existing.taskId !== taskId) return false;
  return repo.deleteById(commentId);
}
