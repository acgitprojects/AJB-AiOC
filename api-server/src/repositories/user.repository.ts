import { sql } from "../db/client";
import type { User } from "@ajb/contract";

function toISO(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : d;
}

function mapRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as "admin" | "user",
    alertsEnabled: row.alerts_enabled as boolean,
    alertEmail: (row.alert_email as string | null) ?? undefined,
    createdAt: toISO(row.created_at as Date),
  };
}

export async function findAll(): Promise<User[]> {
  const rows = await sql<Record<string, unknown>[]>`SELECT * FROM users ORDER BY created_at`;
  return rows.map(mapRow);
}

export async function findByEmail(email: string): Promise<User | null> {
  const [row] = await sql<Record<string, unknown>[]>`SELECT * FROM users WHERE email = ${email}`;
  return row ? mapRow(row) : null;
}

export async function findFirst(): Promise<User | null> {
  const [row] = await sql<Record<string, unknown>[]>`SELECT * FROM users ORDER BY created_at LIMIT 1`;
  return row ? mapRow(row) : null;
}

export async function findById(id: string): Promise<User | null> {
  const [row] = await sql<Record<string, unknown>[]>`SELECT * FROM users WHERE id = ${id}`;
  return row ? mapRow(row) : null;
}

export async function create(
  user: Omit<User, "createdAt"> & { createdAt?: string },
): Promise<User> {
  const [row] = await sql<Record<string, unknown>[]>`
    INSERT INTO users (id, name, email, role, alerts_enabled, alert_email)
    VALUES (${user.id}, ${user.name}, ${user.email}, ${user.role}, ${user.alertsEnabled}, ${user.alertEmail ?? null})
    RETURNING *
  `;
  return mapRow(row);
}

export async function update(id: string, patch: Partial<Omit<User, "id" | "createdAt">>): Promise<User | null> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.email !== undefined) dbPatch.email = patch.email;
  if (patch.role !== undefined) dbPatch.role = patch.role;
  if (patch.alertsEnabled !== undefined) dbPatch.alerts_enabled = patch.alertsEnabled;
  if (patch.alertEmail !== undefined) dbPatch.alert_email = patch.alertEmail;

  if (Object.keys(dbPatch).length === 0) return findById(id);

  const [row] = await sql<Record<string, unknown>[]>`
    UPDATE users SET ${sql(dbPatch)} WHERE id = ${id} RETURNING *
  `;
  return row ? mapRow(row) : null;
}

export async function remove(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM users WHERE id = ${id}`;
  return result.count > 0;
}

export async function getPasswordHash(userId: string): Promise<string | null> {
  const [row] = await sql<{ password_hash: string }[]>`
    SELECT password_hash FROM user_passwords WHERE user_id = ${userId}
  `;
  return row?.password_hash ?? null;
}

export async function setPasswordHash(userId: string, hash: string): Promise<void> {
  await sql`
    INSERT INTO user_passwords (user_id, password_hash) VALUES (${userId}, ${hash})
    ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `;
}

export async function insertUserWithPassword(
  user: Omit<User, "createdAt">,
  passwordHash: string,
): Promise<void> {
  await sql`
    INSERT INTO users (id, name, email, role, alerts_enabled)
    VALUES (${user.id}, ${user.name}, ${user.email}, ${user.role}, ${user.alertsEnabled})
    ON CONFLICT DO NOTHING
  `;
  await sql`
    INSERT INTO user_passwords (user_id, password_hash) VALUES (${user.id}, ${passwordHash})
    ON CONFLICT DO NOTHING
  `;
}
