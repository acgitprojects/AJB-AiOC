import { z } from "zod";

export const AgentStatusSchema = z.enum(["online", "idle", "offline"]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  model: z.string(),
  status: AgentStatusSchema,
  skills: z.array(z.string()),
  tasksCompleted: z.number(),
  responseRate: z.number(),
  avgResponseMs: z.number(),
  reports: z.array(z.string()),
  reportsTo: z.string().nullable(),
});
export type Agent = z.infer<typeof AgentSchema>;
