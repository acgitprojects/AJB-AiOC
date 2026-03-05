import { listFiles, uploadFile, deleteFile, linkDocument } from "../services/task-files.service";
import type { TaskFileUpload, TaskFileLinkDocument } from "@ajb/contract";

export const taskFileHandlers = {
  list: async ({ params }: { params: { id: string } }) => {
    return { status: 200 as const, body: await listFiles(params.id) };
  },
  upload: async ({ params, body }: { params: { id: string }; body: TaskFileUpload }) => {
    const result = await uploadFile(params.id, body);
    if ("error" in result) return { status: 400 as const, body: { error: result.error } };
    return { status: 201 as const, body: result };
  },
  delete: async ({ params }: { params: { id: string; fileId: string } }) => {
    const ok = await deleteFile(params.id, params.fileId);
    if (!ok) return { status: 404 as const, body: { message: "File not found" } };
    return { status: 200 as const, body: { ok: true } };
  },
  linkDocument: async ({ params, body }: { params: { id: string }; body: TaskFileLinkDocument }) => {
    const result = await linkDocument(params.id, body.documentJobId);
    if ("error" in result) return { status: 400 as const, body: { error: result.error } };
    return { status: 201 as const, body: result };
  },
};
