import { z } from "zod";

export const PipelineItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  stage: z.enum(["idea", "drafting", "review", "scheduled", "published"]),
  agent: z.string(),
  product: z.string(),
  imageUrl: z.string().optional(),
});
export type PipelineItem = z.infer<typeof PipelineItemSchema>;
