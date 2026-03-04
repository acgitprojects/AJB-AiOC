import { sql } from "../db/client";
import type { MyTask, TaskPatch, TaskDelegation, TaskCreate } from "@ajb/contract";

function toISO(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  return d instanceof Date ? d.toISOString() : d;
}

function mapDelegation(row: Record<string, unknown>): TaskDelegation {
  return {
    from: row.from_id as string,
    to: row.to_id as string,
    proposedAt: toISO(row.proposed_at as Date)!,
    acceptedAt: toISO(row.accepted_at as Date | null) ?? undefined,
    reason: (row.reason as string | null) ?? undefined,
    status: row.status as "PENDING" | "ACCEPTED" | "REJECTED",
  };
}

function mapRow(row: Record<string, unknown>, delegations: TaskDelegation[] = []): MyTask {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    createdByAgent: row.created_by_agent as string,
    assignee: {
      type: row.assignee_type as "agent" | "human",
      id: row.assignee_id as string,
      name: row.assignee_name as string,
    },
    priority: row.priority as "high" | "medium" | "low",
    status: row.status as "pending" | "in-progress" | "done" | "delegated",
    createdAt: toISO(row.created_at as Date)!,
    dueDate: toISO(row.due_date as Date | null) ?? undefined,
    tags: (row.tags as string[]) ?? [],
    updatedAt: toISO(row.updated_at as Date | null) ?? undefined,
    delegations: delegations.length > 0 ? delegations : undefined,
  };
}

export async function findAll(filters?: { dueDateFrom?: string; dueDateTo?: string }): Promise<MyTask[]> {
  const tasks = await sql<Record<string, unknown>[]>`
    SELECT * FROM tasks
    WHERE TRUE
    ${filters?.dueDateFrom ? sql`AND due_date >= ${filters.dueDateFrom}::date` : sql``}
    ${filters?.dueDateTo   ? sql`AND due_date <= ${filters.dueDateTo}::date`   : sql``}
    ORDER BY created_at
  `;
  if (tasks.length === 0) return [];

  const ids = tasks.map((t: Record<string, unknown>) => t.id as string);
  const delegRows = await sql<Record<string, unknown>[]>`
    SELECT * FROM task_delegations WHERE task_id = ANY(${ids}) ORDER BY proposed_at
  `;

  const delegByTask = new Map<string, TaskDelegation[]>();
  for (const d of delegRows) {
    const tid = d.task_id as string;
    if (!delegByTask.has(tid)) delegByTask.set(tid, []);
    delegByTask.get(tid)!.push(mapDelegation(d));
  }

  return tasks.map((t: Record<string, unknown>) => mapRow(t, delegByTask.get(t.id as string) ?? []));
}

export async function findById(id: string): Promise<MyTask | null> {
  const [task] = await sql<Record<string, unknown>[]>`SELECT * FROM tasks WHERE id = ${id}`;
  if (!task) return null;
  const delegRows = await sql<Record<string, unknown>[]>`
    SELECT * FROM task_delegations WHERE task_id = ${id} ORDER BY proposed_at
  `;
  return mapRow(task, delegRows.map(mapDelegation));
}

export async function update(id: string, patch: TaskPatch): Promise<MyTask | null> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date() };

  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
  if (patch.tags !== undefined) dbPatch.tags = patch.tags;
  if (patch.assignee !== undefined) {
    dbPatch.assignee_type = patch.assignee.type;
    dbPatch.assignee_id = patch.assignee.id;
    dbPatch.assignee_name = patch.assignee.name;
  }

  const [updated] = await sql<Record<string, unknown>[]>`
    UPDATE tasks SET ${sql(dbPatch)} WHERE id = ${id} RETURNING *
  `;
  if (!updated) return null;
  return mapRow(updated);
}

export async function insert(data: TaskCreate): Promise<MyTask> {
  const id = crypto.randomUUID();
  const [row] = await sql<Record<string, unknown>[]>`
    INSERT INTO tasks
      (id, title, description, created_by_agent, assignee_type, assignee_id, assignee_name,
       priority, status, due_date, tags, created_at)
    VALUES
      (${id}, ${data.title}, ${data.description ?? null}, ${data.createdByAgent},
       ${data.assignee.type}, ${data.assignee.id}, ${data.assignee.name},
       ${data.priority}, ${data.status}, ${data.dueDate ?? null}, ${data.tags}, NOW())
    RETURNING *
  `;
  return mapRow(row);
}

export async function insertMany(tasks: MyTask[]): Promise<void> {
  const rows = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    created_by_agent: t.createdByAgent,
    assignee_type: t.assignee.type,
    assignee_id: t.assignee.id,
    assignee_name: t.assignee.name,
    priority: t.priority,
    status: t.status,
    due_date: t.dueDate ?? null,
    tags: t.tags,
    created_at: t.createdAt,
  }));
  await sql`INSERT INTO tasks ${sql(rows)} ON CONFLICT DO NOTHING`;
}
