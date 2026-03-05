import { z } from "zod";

export const DocumentJobMessageSchema = z.object({
  role: z.string(),
  text: z.string(),
  ts: z.string(),
});

export const DocumentJobSchema = z.object({
  id: z.string(),
  type: z.enum(["word", "excel", "ppt"]),
  title: z.string().nullable(),
  prompt: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  agentId: z.string().nullable(),
  sessionKey: z.string().nullable(),
  agentMessages: z.array(DocumentJobMessageSchema),
  fileName: z.string().nullable(),
  fileDataB64: z.string().nullable(),
  errorMsg: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export const DocumentCreateSchema = z.object({
  type: z.enum(["word", "excel", "ppt"]),
  title: z.string().optional(),
  prompt: z.string().min(1),
  agentId: z.string(),
});

export type DocumentJob = z.infer<typeof DocumentJobSchema>;
export type DocumentJobMessage = z.infer<typeof DocumentJobMessageSchema>;
export type DocumentCreate = z.infer<typeof DocumentCreateSchema>;
