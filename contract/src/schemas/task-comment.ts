import { z } from "zod";

export const TaskCommentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  authorType: z.enum(["human", "agent"]),
  authorId: z.string(),
  authorName: z.string(),
  content: z.string(),
  createdAt: z.string(),
});

export const TaskCommentCreateSchema = z.object({
  content: z.string().min(1),
  authorType: z.enum(["human", "agent"]),
  authorId: z.string(),
  authorName: z.string(),
});

export type TaskComment = z.infer<typeof TaskCommentSchema>;
export type TaskCommentCreate = z.infer<typeof TaskCommentCreateSchema>;
