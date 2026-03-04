import { listAgents } from "../services/agent.service";

export const agentHandlers = {
  list: async () => {
    return { status: 200 as const, body: await listAgents() };
  },
};
