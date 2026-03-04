/**
 * lib/task-store.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Task CRUD + persistence layer.
 *
 * Storage strategy:
 *   - Production (Cloudflare Workers): Cloudflare KV namespace
 *   - Development (Node.js):           In-memory cache (MY_TASKS)
 *
 * KV key design:
 *   task:{taskId}       →  Task JSON
 *   tasks_index         →  string[]  (all known taskIds)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { MyTask } from "@/lib/mock-data";

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>;
}

async function getKV(): Promise<KVNamespace | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kv = (ctx as any).env?.USERS_KV as KVNamespace | undefined;
    return kv ?? null;
  } catch {
    return null;
  }
}

// In-memory cache for development
let _taskCache: Map<string, MyTask> | null = null;

async function getTaskCache(): Promise<Map<string, MyTask>> {
  if (_taskCache) return _taskCache;
  _taskCache = new Map();
  // Initialize from mock data on first access
  const { MY_TASKS } = await import("@/lib/mock-data");
  MY_TASKS.forEach(task => _taskCache!.set(task.id, { ...task }));
  return _taskCache;
}

/**
 * Get a single task by ID
 */
export async function getTask(id: string): Promise<MyTask | null> {
  const kv = await getKV();
  
  if (kv) {
    // Production: read from KV
    const raw = await kv.get(`task:${id}`);
    return raw ? JSON.parse(raw) as MyTask : null;
  } else {
    // Development: read from cache
    const cache = await getTaskCache();
    return cache.get(id) ?? null;
  }
}

/**
 * Get all tasks (with optional filtering)
 */
export async function getAllTasks(filterFn?: (t: MyTask) => boolean): Promise<MyTask[]> {
  const kv = await getKV();
  
  if (kv) {
    // Production: list all from KV
    try {
      const result = await kv.list({ prefix: "task:" });
      const tasks: MyTask[] = [];
      
      for (const key of result.keys) {
        const raw = await kv.get(key.name);
        if (raw) {
          const task = JSON.parse(raw) as MyTask;
          if (!filterFn || filterFn(task)) {
            tasks.push(task);
          }
        }
      }
      
      return tasks;
    } catch (err) {
      console.error("[task-store] Failed to list tasks:", err);
      return [];
    }
  } else {
    // Development: return from cache
    const cache = await getTaskCache();
    const tasks = Array.from(cache.values());
    return filterFn ? tasks.filter(filterFn) : tasks;
  }
}

/**
 * Update a task
 */
export async function updateTask(id: string, updates: Partial<Omit<MyTask, 'id'>>): Promise<MyTask | null> {
  const kv = await getKV();
  
  // First, get the existing task
  let task = await getTask(id);
  if (!task) return null;
  
  // Apply updates
  const updated: MyTask = {
    ...task,
    ...updates,
    id: task.id, // Never modify ID
  };
  
  if (kv) {
    // Production: persist to KV
    try {
      await kv.put(`task:${id}`, JSON.stringify(updated));
    } catch (err) {
      console.error("[task-store] Failed to update task in KV:", err);
      throw new Error("Failed to persist task update");
    }
  } else {
    // Development: update cache
    const cache = await getTaskCache();
    cache.set(id, updated);
  }
  
  return updated;
}

/**
 * Create a new task
 */
export async function createTask(task: MyTask): Promise<MyTask> {
  const kv = await getKV();
  
  if (kv) {
    // Production: persist to KV
    try {
      await kv.put(`task:${task.id}`, JSON.stringify(task));
      
      // Update index
      const indexRaw = await kv.get("tasks_index");
      const index = indexRaw ? JSON.parse(indexRaw) as string[] : [];
      if (!index.includes(task.id)) {
        index.push(task.id);
        await kv.put("tasks_index", JSON.stringify(index));
      }
    } catch (err) {
      console.error("[task-store] Failed to create task in KV:", err);
      throw new Error("Failed to persist new task");
    }
  } else {
    // Development: update cache
    const cache = await getTaskCache();
    cache.set(task.id, task);
  }
  
  return task;
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<boolean> {
  const kv = await getKV();
  
  if (kv) {
    // Production: remove from KV
    try {
      await kv.delete(`task:${id}`);
      
      // Update index
      const indexRaw = await kv.get("tasks_index");
      const index = indexRaw ? JSON.parse(indexRaw) as string[] : [];
      const newIndex = index.filter(t => t !== id);
      await kv.put("tasks_index", JSON.stringify(newIndex));
    } catch (err) {
      console.error("[task-store] Failed to delete task from KV:", err);
      return false;
    }
  } else {
    // Development: update cache
    const cache = await getTaskCache();
    cache.delete(id);
  }
  
  return true;
}
