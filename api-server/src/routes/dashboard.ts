import { tasks, agents } from "../db/seed";

export const dashboardHandlers = {
  stats: async () => {
    return {
      status: 200 as const,
      body: {
        tasksToday: tasks.filter((t) => t.status !== "done").length,
        activeAgents: agents.filter((a) => a.status === "online").length,
        avgResponseSec: 0,
        ajcSubscribers: 34,
      },
    };
  },
};
