import * as repo from "../repositories/task-files.repository";
import * as docRepo from "../repositories/document-jobs.repository";
import type { TaskFile, TaskFileUpload } from "@ajb/contract";

const MAX_FILES = 12;

export async function listFiles(taskId: string): Promise<TaskFile[]> {
  return repo.findByTaskId(taskId);
}

export async function uploadFile(taskId: string, data: TaskFileUpload): Promise<TaskFile | { error: string }> {
  const count = await repo.countByTaskId(taskId);
  if (count >= MAX_FILES) {
    return { error: `Maximum of ${MAX_FILES} files per task allowed` };
  }
  const id = crypto.randomUUID();
  return repo.insert({
    id,
    taskId,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSizeBytes: data.fileSizeBytes ?? null,
    fileDataB64: data.fileDataB64,
    uploadedBy: data.uploadedBy,
    uploadedByName: data.uploadedByName,
    documentJobId: null,
  });
}

export async function deleteFile(taskId: string, fileId: string): Promise<boolean> {
  const existing = await repo.findById(fileId);
  if (!existing || existing.taskId !== taskId) return false;
  return repo.deleteById(fileId);
}

export async function linkDocument(taskId: string, documentJobId: string): Promise<TaskFile | { error: string }> {
  const count = await repo.countByTaskId(taskId);
  if (count >= MAX_FILES) {
    return { error: `Maximum of ${MAX_FILES} files per task allowed` };
  }

  const doc = await docRepo.findById(documentJobId);
  if (!doc) return { error: "Document not found" };
  if (doc.status !== "completed" || !doc.fileDataB64 || !doc.fileName) {
    return { error: "Document is not completed or has no file data" };
  }

  const id = crypto.randomUUID();
  const mimeByType: Record<string, string> = {
    word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  const fileType = mimeByType[doc.type] ?? "application/octet-stream";

  return repo.insert({
    id,
    taskId,
    fileName: doc.fileName,
    fileType,
    fileSizeBytes: null,
    fileDataB64: doc.fileDataB64,
    uploadedBy: doc.agentId ?? "system",
    uploadedByName: "Document Agent",
    documentJobId,
  });
}
