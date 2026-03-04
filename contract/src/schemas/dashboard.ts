import { z } from "zod";

export const DashboardStatsSchema = z.object({
  tasksToday: z.number(),
  activeAgents: z.number(),
  avgResponseSec: z.number(),
  ajcSubscribers: z.number(),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
