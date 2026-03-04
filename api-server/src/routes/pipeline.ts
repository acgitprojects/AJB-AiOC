import { pipeline } from "../db/in-memory";

export const pipelineHandlers = {
  list: async () => ({
    status: 200 as const,
    body: pipeline,
  }),
};
