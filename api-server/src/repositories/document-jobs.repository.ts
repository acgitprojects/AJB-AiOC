import { sql } from "../db/client";

export type DocJobStatus = "pending" | "processing" | "completed" | "failed";
export type DocJobType = "word" | "excel" | "ppt";

export interface DocJobMessage {
  role: string;
  text: string;
  ts: string;
}

export interface DocumentJob {
  id: string;
  type: DocJobType;
  title: string | null;
  prompt: string;
  status: DocJobStatus;
  agentId: string | null;
  sessionKey: string | null;
  agentMessages: DocJobMessage[];
  fileName: string | null;
  fileDataB64: string | null;
  errorMsg: string | null;
  createdAt: string;
  completedAt: string | null;
}

function mapRow(r: Record<string, unknown>): DocumentJob {
  const createdAt = r.created_at as Date;
  const completedAt = r.completed_at as Date | null;
  return {
    id: r.id as string,
    type: r.type as DocJobType,
    title: r.title as string | null,
    prompt: r.prompt as string,
    status: r.status as DocJobStatus,
    agentId: r.agent_id as string | null,
    sessionKey: r.session_key as string | null,
    agentMessages: (r.agent_messages as DocJobMessage[]) ?? [],
    fileName: r.file_name as string | null,
    fileDataB64: r.file_data_b64 as string | null,
    errorMsg: r.error_msg as string | null,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
    completedAt: completedAt ? (completedAt instanceof Date ? completedAt.toISOString() : String(completedAt)) : null,
  };
}

export async function createJob(opts: {
  id: string;
  type: DocJobType;
  title: string | null;
  prompt: string;
  agentId: string;
  sessionKey: string;
}): Promise<DocumentJob> {
  const rows = await sql`
    INSERT INTO document_jobs (id, type, title, prompt, agent_id, session_key)
    VALUES (${opts.id}, ${opts.type}, ${opts.title}, ${opts.prompt}, ${opts.agentId}, ${opts.sessionKey})
    RETURNING id, type, title, prompt, status, agent_id, session_key,
              agent_messages, file_name, file_data_b64, error_msg, created_at, completed_at
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function updateStatus(id: string, status: DocJobStatus): Promise<void> {
  await sql`UPDATE document_jobs SET status = ${status} WHERE id = ${id}`;
}

export async function appendMessage(id: string, msg: DocJobMessage): Promise<void> {
  await sql`
    UPDATE document_jobs
    SET agent_messages = agent_messages || ${JSON.stringify([msg])}::jsonb
    WHERE id = ${id}
  `;
}

export async function complete(id: string, fileName: string, fileDataB64: string): Promise<void> {
  await sql`
    UPDATE document_jobs
    SET status = 'completed', file_name = ${fileName}, file_data_b64 = ${fileDataB64},
        completed_at = NOW()
    WHERE id = ${id}
  `;
}

export async function fail(id: string, errorMsg: string): Promise<void> {
  await sql`
    UPDATE document_jobs
    SET status = 'failed', error_msg = ${errorMsg}
    WHERE id = ${id}
  `;
}

export async function findAll(): Promise<DocumentJob[]> {
  const rows = await sql`
    SELECT id, type, title, prompt, status, agent_id, session_key,
           agent_messages, file_name, file_data_b64, error_msg, created_at, completed_at
    FROM document_jobs
    ORDER BY created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function findById(id: string): Promise<DocumentJob | null> {
  const rows = await sql`
    SELECT id, type, title, prompt, status, agent_id, session_key,
           agent_messages, file_name, file_data_b64, error_msg, created_at, completed_at
    FROM document_jobs
    WHERE id = ${id}
  `;
  if (!rows.length) return null;
  return mapRow(rows[0] as never);
}
