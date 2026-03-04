import { pipeline } from "../db/seed";

export const pipelineHandlers = {
  list: async () => ({
    status: 200 as const,
    body: pipeline,
  }),
};
