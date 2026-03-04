import { z } from "zod";

export const BriefingSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  accent: z.string(),
  items: z.array(z.string()),
});
export type BriefingSection = z.infer<typeof BriefingSectionSchema>;

export const DailyBriefingSchema = z.object({
  date: z.string(),
  generatedAt: z.string(),
  status: z.enum(["ready", "generating", "error"]),
  sections: z.array(BriefingSectionSchema),
});
export type DailyBriefing = z.infer<typeof DailyBriefingSchema>;
