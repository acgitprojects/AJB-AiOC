import { listTasks } from "../services/task.service";
import { listAgents } from "../services/agent.service";

export const dashboardHandlers = {
  stats: async () => {
    const [tasks, agents] = await Promise.all([listTasks(), listAgents()]);
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
