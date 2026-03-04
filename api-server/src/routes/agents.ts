import { agents } from "../db/seed";

export const agentHandlers = {
  list: async () => {
    return { status: 200 as const, body: agents };
  },
};
