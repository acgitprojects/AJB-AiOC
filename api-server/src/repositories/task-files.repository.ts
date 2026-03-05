import { sql } from "../db/client";
import type { TaskFile } from "@ajb/contract";

function mapRow(r: Record<string, unknown>): TaskFile {
  return {
    id: r.id as string,
    taskId: r.task_id as string,
    fileName: r.file_name as string,
    fileType: r.file_type as string,
    fileSizeBytes: r.file_size_bytes as number | null,
    fileDataB64: r.file_data_b64 as string,
    uploadedBy: r.uploaded_by as string,
    uploadedByName: r.uploaded_by_name as string,
    documentJobId: r.document_job_id as string | null,
    createdAt: (r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)),
  };
}

export async function findByTaskId(taskId: string): Promise<TaskFile[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT * FROM task_files WHERE task_id = ${taskId} ORDER BY created_at ASC
  `;
  return rows.map(mapRow);
}

export async function countByTaskId(taskId: string): Promise<number> {
  const [row] = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM task_files WHERE task_id = ${taskId}
  `;
  return parseInt(row.count, 10);
}

export async function insert(data: {
  id: string;
  taskId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number | null;
  fileDataB64: string;
  uploadedBy: string;
  uploadedByName: string;
  documentJobId: string | null;
}): Promise<TaskFile> {
  const [row] = await sql<Record<string, unknown>[]>`
    INSERT INTO task_files
      (id, task_id, file_name, file_type, file_size_bytes, file_data_b64,
       uploaded_by, uploaded_by_name, document_job_id)
    VALUES
      (${data.id}, ${data.taskId}, ${data.fileName}, ${data.fileType},
       ${data.fileSizeBytes}, ${data.fileDataB64},
       ${data.uploadedBy}, ${data.uploadedByName}, ${data.documentJobId})
    RETURNING *
  `;
  return mapRow(row);
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM task_files WHERE id = ${id}`;
  return (result as unknown as { count: number }).count > 0;
}

export async function findById(id: string): Promise<TaskFile | null> {
  const [row] = await sql<Record<string, unknown>[]>`SELECT * FROM task_files WHERE id = ${id}`;
  return row ? mapRow(row) : null;
}
