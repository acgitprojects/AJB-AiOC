import { z } from "zod";

export const KanbanTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  agent: z.string(),
  tag: z.string(),
  status: z.enum(["backlog", "in-progress", "review", "done"]),
});
export type KanbanTask = z.infer<typeof KanbanTaskSchema>;

export const BoardPatchBodySchema = z.object({
  id: z.string(),
  status: z.enum(["backlog", "in-progress", "review", "done"]),
});
