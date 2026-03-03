/**
 * lib/user-store.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * User CRUD + reset-token store.
 *
 * Storage strategy:
 *   - Production (Cloudflare Workers): Cloudflare KV namespace `USERS_KV`
 *   - Development (Node.js):           data/users.json  (gitignored)
 *
 * KV key design:
 *   user:{email}        →  User JSON
 *   users_index         →  string[]  (all known emails)
 *   reset:{token}       →  ResetToken JSON  (TTL 3600 s in KV, checked in dev)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | "user";
  alertsEnabled: boolean;
  alertEmail?: string;   // override for alert notifications
  createdAt: string;
  updatedAt: string;
}

export interface ResetToken {
  email: string;
  token: string;
  expiresAt: number; // Unix ms
}

// ─── KV namespace type (minimal) ─────────────────────────────────────────────

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

// ─── KV helper (Cloudflare production) ───────────────────────────────────────

async function getKV(): Promise<KVNamespace | null> {
  try {
    // Dynamic import so the module resolves without error in Node.js dev
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kv = (ctx as any).env?.USERS_KV as KVNamespace | undefined;
    return kv ?? null;
  } catch {
    return null;
  }
}

// ─── File-based store (Node.js dev fallback) ──────────────────────────────────

interface DevStore {
  users: Record<string, User>;          // keyed by email
  resetTokens: Record<string, ResetToken>; // keyed by token
}

let _cache: DevStore | null = null;

async function readDevStore(): Promise<DevStore> {
  if (_cache) return _cache;
  try {
    const path = await import("path");
    const { readFile } = await import("fs/promises");
    const file = path.join(process.cwd(), "data", "users.json");
    const raw = await readFile(file, "utf-8");
    _cache = JSON.parse(raw) as DevStore;
    return _cache;
  } catch {
    _cache = { users: {}, resetTokens: {} };
    return _cache;
  }
}

async function writeDevStore(store: DevStore): Promise<void> {
  _cache = store;
  try {
    const path = await import("path");
    const { writeFile, mkdir } = await import("fs/promises");
    const dir = path.join(process.cwd(), "data");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "users.json"),
      JSON.stringify(store, null, 2),
      "utf-8",
    );
  } catch (e) {
    console.error("[user-store] Failed to persist dev store:", e);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {
  const kv = await getKV();
  if (kv) {
    const indexRaw = await kv.get("users_index");
    const emails: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    const users = await Promise.all(
      emails.map(async e => {
        const raw = await kv.get(`user:${e}`);
        return raw ? (JSON.parse(raw) as User) : null;
      }),
    );
    return users.filter(Boolean) as User[];
  }

  const store = await readDevStore();
  return Object.values(store.users);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const kv = await getKV();
  if (kv) {
    const raw = await kv.get(`user:${email.toLowerCase()}`);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  const store = await readDevStore();
  return store.users[email.toLowerCase()] ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const all = await getAllUsers();
  return all.find(u => u.id === id) ?? null;
}

export async function createUser(
  data: Omit<User, "id" | "createdAt" | "updatedAt">,
): Promise<User> {
  const now = new Date().toISOString();
  const user: User = {
    ...data,
    email: data.email.toLowerCase(),
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const kv = await getKV();
  if (kv) {
    const indexRaw = await kv.get("users_index");
    const emails: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    if (!emails.includes(user.email)) emails.push(user.email);
    await kv.put("users_index", JSON.stringify(emails));
    await kv.put(`user:${user.email}`, JSON.stringify(user));
    return user;
  }

  const store = await readDevStore();
  store.users[user.email] = user;
  await writeDevStore(store);
  return user;
}

export async function updateUser(
  email: string,
  patch: Partial<Omit<User, "id" | "email" | "createdAt">>,
): Promise<User | null> {
  const existing = await getUserByEmail(email);
  if (!existing) return null;

  const updated: User = {
    ...existing,
    ...patch,
    email: existing.email,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const kv = await getKV();
  if (kv) {
    await kv.put(`user:${email.toLowerCase()}`, JSON.stringify(updated));
    return updated;
  }

  const store = await readDevStore();
  store.users[email.toLowerCase()] = updated;
  await writeDevStore(store);
  return updated;
}

export async function deleteUser(email: string): Promise<boolean> {
  const kv = await getKV();
  if (kv) {
    const indexRaw = await kv.get("users_index");
    const emails: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    const newEmails = emails.filter(e => e !== email.toLowerCase());
    await kv.put("users_index", JSON.stringify(newEmails));
    await kv.delete(`user:${email.toLowerCase()}`);
    return true;
  }

  const store = await readDevStore();
  if (!store.users[email.toLowerCase()]) return false;
  delete store.users[email.toLowerCase()];
  await writeDevStore(store);
  return true;
}

export async function userCount(): Promise<number> {
  const users = await getAllUsers();
  return users.length;
}

// ─── Reset tokens ─────────────────────────────────────────────────────────────

export async function saveResetToken(rt: ResetToken): Promise<void> {
  const kv = await getKV();
  if (kv) {
    const ttl = Math.max(1, Math.floor((rt.expiresAt - Date.now()) / 1000));
    await kv.put(`reset:${rt.token}`, JSON.stringify(rt), {
      expirationTtl: ttl,
    });
    return;
  }

  const store = await readDevStore();
  store.resetTokens[rt.token] = rt;
  await writeDevStore(store);
}

export async function getResetToken(token: string): Promise<ResetToken | null> {
  const kv = await getKV();
  if (kv) {
    const raw = await kv.get(`reset:${token}`);
    if (!raw) return null;
    const rt = JSON.parse(raw) as ResetToken;
    if (Date.now() > rt.expiresAt) return null;
    return rt;
  }

  const store = await readDevStore();
  const rt = store.resetTokens[token] ?? null;
  if (!rt) return null;
  if (Date.now() > rt.expiresAt) return null;
  return rt;
}

export async function deleteResetToken(token: string): Promise<void> {
  const kv = await getKV();
  if (kv) {
    await kv.delete(`reset:${token}`);
    return;
  }

  const store = await readDevStore();
  delete store.resetTokens[token];
  await writeDevStore(store);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}
