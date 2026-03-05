import { createDocumentJob } from "../services/document.service";
import * as repo from "../repositories/document-jobs.repository";

export const documentHandlers = {
  create: async ({ body }: { body: { type: "word" | "excel" | "ppt"; title?: string; prompt: string; agentId: string } }) => {
    const job = await createDocumentJob(
      body.type,
      body.title?.trim() || null,
      body.prompt,
      body.agentId,
    );
    return { status: 201 as const, body: job };
  },

  list: async () => {
    const jobs = await repo.findAll();
    return { status: 200 as const, body: jobs };
  },

  get: async ({ params }: { params: { id: string } }) => {
    const job = await repo.findById(params.id);
    if (!job) return { status: 404 as const, body: { message: "Not found" } };
    return { status: 200 as const, body: job };
  },
};
