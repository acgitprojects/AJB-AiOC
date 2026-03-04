import { tasks } from "../db/seed";

export const taskHandlers = {
  list: async () => {
    return { status: 200 as const, body: tasks };
  },
  patch: async ({ params, body }: { params: { id: string }; body: Record<string, unknown> }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return { status: 404 as const, body: { message: "Not found" } };
    Object.assign(task, body);
    task.updatedAt = new Date().toISOString();
    return { status: 200 as const, body: task };
  },
};
