import { z } from "zod";

export const TaskAssigneeSchema = z.object({
  type: z.enum(["agent", "human"]),
  id: z.string(),
  name: z.string(),
});
export type TaskAssignee = z.infer<typeof TaskAssigneeSchema>;

export const TaskDelegationSchema = z.object({
  from: z.string(),
  to: z.string(),
  proposedAt: z.string(),
  acceptedAt: z.string().optional(),
  reason: z.string().optional(),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
});

export const MyTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  createdByAgent: z.string(),
  assignee: TaskAssigneeSchema,
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["pending", "in-progress", "done", "delegated"]),
  createdAt: z.string(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()),
  updatedAt: z.string().optional(),
  delegations: z.array(TaskDelegationSchema).optional(),
});
export type MyTask = z.infer<typeof MyTaskSchema>;

export const TaskPatchSchema = z.object({
  status: z.enum(["pending", "in-progress", "done", "delegated"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  assignee: TaskAssigneeSchema.optional(),
  tags: z.array(z.string()).optional(),
});
export type TaskPatch = z.infer<typeof TaskPatchSchema>;
