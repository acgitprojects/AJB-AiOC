import { z } from "zod";

export const TaskFileSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSizeBytes: z.number().nullable(),
  fileDataB64: z.string(),
  uploadedBy: z.string(),
  uploadedByName: z.string(),
  documentJobId: z.string().nullable(),
  createdAt: z.string(),
});

export const TaskFileUploadSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSizeBytes: z.number().optional(),
  fileDataB64: z.string().min(1),
  uploadedBy: z.string(),
  uploadedByName: z.string(),
});

export const TaskFileLinkDocumentSchema = z.object({
  documentJobId: z.string(),
});

export type TaskFile = z.infer<typeof TaskFileSchema>;
export type TaskFileUpload = z.infer<typeof TaskFileUploadSchema>;
export type TaskFileLinkDocument = z.infer<typeof TaskFileLinkDocumentSchema>;
