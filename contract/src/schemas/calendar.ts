import { z } from "zod";

export const CalTaskSchema = z.object({
  id: z.string(),
  agent: z.string(),
  title: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["pending", "in-progress", "done"]),
});
export type CalTask = z.infer<typeof CalTaskSchema>;

export const CalendarDataSchema = z.record(z.string(), z.array(CalTaskSchema));
export type CalendarData = z.infer<typeof CalendarDataSchema>;
