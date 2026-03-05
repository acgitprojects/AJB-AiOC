import * as repo from "../repositories/task-comments.repository";
import * as taskRepo from "../repositories/task.repository";
import { dispatchTaskToAgent } from "./task-agent.service";
import type { TaskComment, TaskCommentCreate } from "@ajb/contract";

export async function listComments(taskId: string): Promise<TaskComment[]> {
  return repo.findByTaskId(taskId);
}

export async function addComment(taskId: string, data: TaskCommentCreate): Promise<TaskComment> {
  const id = crypto.randomUUID();
  const comment = await repo.insert({ id, taskId, ...data });

  if (data.authorType === "human") {
    const task = await taskRepo.findById(taskId);
    if (task?.assignee?.type === "agent") {
      const allComments = await repo.findByTaskId(taskId);
      dispatchTaskToAgent(task, allComments, task.assignee.id, task.assignee.name, "comment").catch(() => {});
    }
  }

  return comment;
}

export async function deleteComment(taskId: string, commentId: string): Promise<boolean> {
  const existing = await repo.findById(commentId);
  if (!existing || existing.taskId !== taskId) return false;
  return repo.deleteById(commentId);
}
