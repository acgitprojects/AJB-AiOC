import { listTasks, patchTask, createTask } from "../services/task.service";
import type { TaskPatch, TaskCreate } from "@ajb/contract";

export const taskHandlers = {
  list: async () => {
    return { status: 200 as const, body: await listTasks() };
  },
  create: async ({ body }: { body: TaskCreate }) => {
    const task = await createTask(body);
    return { status: 201 as const, body: task };
  },
  patch: async ({ params, body }: { params: { id: string }; body: TaskPatch }) => {
    const result = await patchTask(params.id, body);
    if (!result) return { status: 404 as const, body: { message: "Not found" } };
    return { status: 200 as const, body: result };
  },
};
