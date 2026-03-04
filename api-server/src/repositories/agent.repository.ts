import { sql } from "../db/client";
import type { Agent } from "@ajb/contract";

function mapRow(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as string,
    model: row.model as string,
    status: row.status as "online" | "idle" | "offline",
    skills: (row.skills as string[]) ?? [],
    tasksCompleted: Number(row.tasks_completed ?? 0),
    responseRate: Number(row.response_rate ?? 0),
    avgResponseMs: Number(row.avg_response_ms ?? 0),
    reports: (row.reports as string[]) ?? [],
    reportsTo: (row.reports_to as string | null) ?? null,
  };
}

export async function findAll(): Promise<Agent[]> {
  const rows = await sql<Record<string, unknown>[]>`SELECT * FROM agents ORDER BY name`;
  return rows.map(mapRow);
}

export async function insertMany(agents: Agent[]): Promise<void> {
  const rows = agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    model: a.model,
    status: a.status,
    skills: a.skills,
    tasks_completed: a.tasksCompleted,
    response_rate: a.responseRate,
    avg_response_ms: a.avgResponseMs,
    reports: a.reports,
    reports_to: a.reportsTo ?? null,
  }));
  await sql`INSERT INTO agents ${sql(rows)} ON CONFLICT DO NOTHING`;
}
