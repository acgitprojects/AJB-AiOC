import { board } from "../db/in-memory";
import type { KanbanTask } from "@ajb/contract";

export const boardHandlers = {
  list: async () => ({
    status: 200 as const,
    body: board,
  }),

  patch: async ({ body }: { body: { id: string; status: KanbanTask["status"] } }) => {
    const task = board.find(t => t.id === body.id);
    if (!task) {
      return { status: 200 as const, body: { id: body.id, title: "", agent: "", tag: "", status: body.status } as KanbanTask };
    }
    task.status = body.status;
    return { status: 200 as const, body: task };
  },
};
