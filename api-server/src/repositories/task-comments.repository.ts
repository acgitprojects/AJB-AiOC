import { sql } from "../db/client";
import type { TaskComment } from "@ajb/contract";

function mapRow(r: Record<string, unknown>): TaskComment {
  return {
    id: r.id as string,
    taskId: r.task_id as string,
    authorType: r.author_type as "human" | "agent",
    authorId: r.author_id as string,
    authorName: r.author_name as string,
    content: r.content as string,
    createdAt: (r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)),
  };
}

export async function findByTaskId(taskId: string): Promise<TaskComment[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT * FROM task_comments WHERE task_id = ${taskId} ORDER BY created_at ASC
  `;
  return rows.map(mapRow);
}

export async function insert(data: {
  id: string;
  taskId: string;
  authorType: "human" | "agent";
  authorId: string;
  authorName: string;
  content: string;
}): Promise<TaskComment> {
  const [row] = await sql<Record<string, unknown>[]>`
    INSERT INTO task_comments (id, task_id, author_type, author_id, author_name, content)
    VALUES (${data.id}, ${data.taskId}, ${data.authorType}, ${data.authorId}, ${data.authorName}, ${data.content})
    RETURNING *
  `;
  return mapRow(row);
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM task_comments WHERE id = ${id}`;
  return (result as unknown as { count: number }).count > 0;
}

export async function findById(id: string): Promise<TaskComment | null> {
  const [row] = await sql<Record<string, unknown>[]>`SELECT * FROM task_comments WHERE id = ${id}`;
  return row ? mapRow(row) : null;
}
