import { listComments, addComment, deleteComment } from "../services/task-comments.service";
import type { TaskCommentCreate } from "@ajb/contract";

export const taskCommentHandlers = {
  list: async ({ params }: { params: { id: string } }) => {
    return { status: 200 as const, body: await listComments(params.id) };
  },
  create: async ({ params, body }: { params: { id: string }; body: TaskCommentCreate }) => {
    const comment = await addComment(params.id, body);
    return { status: 201 as const, body: comment };
  },
  delete: async ({ params }: { params: { id: string; commentId: string } }) => {
    const ok = await deleteComment(params.id, params.commentId);
    if (!ok) return { status: 404 as const, body: { message: "Comment not found" } };
    return { status: 200 as const, body: { ok: true } };
  },
};
