/**
 * lib/agent-store.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Agent registry CRUD + persistence layer.
 *
 * Storage strategy:
 *   - Production (Cloudflare Workers): Cloudflare KV namespace
 *   - Development (Node.js): In-memory cache
 *
 * KV key design:
 *   agent:{agentId}     →  Agent JSON
 *   agents_index        →  string[]  (all known agentIds)
 *   agent:status:{id}   →  Agent status + heartbeat
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Agent {
  id: string;
  name: string;
  capabilities: string[]; // e.g., ["communicate", "schedule", "report"]
  rules: Record<string, unknown>; // Agent-defined workflow rules
  status: "online" | "idle" | "offline" | "crashed";
  lastHeartbeat: number; // Unix ms
  createdAt: string;
  updatedAt: string;
}

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
let _agentCache: Map<string, Agent> | null = null;

async function getAgentCache(): Promise<Map<string, Agent>> {
  if (_agentCache) return _agentCache;
  _agentCache = new Map();
  return _agentCache;
}

/**
 * Register a new agent
 */
export async function registerAgent(agentData: Omit<Agent, "createdAt" | "updatedAt" | "lastHeartbeat" | "status">): Promise<Agent> {
  const kv = await getKV();
  const now = new Date().toISOString();

  const agent: Agent = {
    ...agentData,
    status: "online",
    lastHeartbeat: Date.now(),
    createdAt: now,
    updatedAt: now,
  };

  if (kv) {
    // Production: persist to KV
    try {
      await kv.put(`agent:${agent.id}`, JSON.stringify(agent));

      // Update index
      const indexRaw = await kv.get("agents_index");
      const index = indexRaw ? JSON.parse(indexRaw) as string[] : [];
      if (!index.includes(agent.id)) {
        index.push(agent.id);
        await kv.put("agents_index", JSON.stringify(index));
      }
    } catch (err) {
      console.error("[agent-store] Failed to register agent in KV:", err);
      throw new Error("Failed to register agent");
    }
  } else {
    // Development: update cache
    const cache = await getAgentCache();
    cache.set(agent.id, agent);
  }

  return agent;
}

/**
 * Get a single agent by ID
 */
export async function getAgent(id: string): Promise<Agent | null> {
  const kv = await getKV();

  if (kv) {
    const raw = await kv.get(`agent:${id}`);
    return raw ? JSON.parse(raw) as Agent : null;
  } else {
    const cache = await getAgentCache();
    return cache.get(id) ?? null;
  }
}

/**
 * Get all agents (with optional filtering)
 */
export async function getAllAgents(filterFn?: (a: Agent) => boolean): Promise<Agent[]> {
  const kv = await getKV();

  if (kv) {
    try {
      const result = await kv.list({ prefix: "agent:" });
      const agents: Agent[] = [];

      for (const key of result.keys) {
        // Skip status keys
        if (key.name.includes("agent:status:")) continue;

        const raw = await kv.get(key.name);
        if (raw) {
          const agent = JSON.parse(raw) as Agent;
          if (!filterFn || filterFn(agent)) {
            agents.push(agent);
          }
        }
      }

      return agents;
    } catch (err) {
      console.error("[agent-store] Failed to list agents:", err);
      return [];
    }
  } else {
    const cache = await getAgentCache();
    const agents = Array.from(cache.values());
    return filterFn ? agents.filter(filterFn) : agents;
  }
}

/**
 * Update an agent (heartbeat, status, rules)
 */
export async function updateAgent(id: string, updates: Partial<Omit<Agent, "id" | "createdAt">>): Promise<Agent | null> {
  const kv = await getKV();

  // Get existing agent
  let agent = await getAgent(id);
  if (!agent) return null;

  // Apply updates
  const updated: Agent = {
    ...agent,
    ...updates,
    id: agent.id, // Never modify ID
    updatedAt: new Date().toISOString(),
  };

  if (kv) {
    try {
      await kv.put(`agent:${id}`, JSON.stringify(updated));
    } catch (err) {
      console.error("[agent-store] Failed to update agent in KV:", err);
      throw new Error("Failed to update agent");
    }
  } else {
    const cache = await getAgentCache();
    cache.set(id, updated);
  }

  return updated;
}

/**
 * Update agent heartbeat (called periodically by agents)
 */
export async function heartbeat(id: string): Promise<Agent | null> {
  return updateAgent(id, {
    lastHeartbeat: Date.now(),
    status: "online",
  });
}

/**
 * Deregister an agent
 */
export async function deregisterAgent(id: string): Promise<boolean> {
  const kv = await getKV();

  if (kv) {
    try {
      await kv.delete(`agent:${id}`);

      // Update index
      const indexRaw = await kv.get("agents_index");
      const index = indexRaw ? JSON.parse(indexRaw) as string[] : [];
      const newIndex = index.filter(a => a !== id);
      await kv.put("agents_index", JSON.stringify(newIndex));
    } catch (err) {
      console.error("[agent-store] Failed to deregister agent from KV:", err);
      return false;
    }
  } else {
    const cache = await getAgentCache();
    cache.delete(id);
  }

  return true;
}

/**
 * Get agent count
 */
export async function agentCount(): Promise<number> {
  const agents = await getAllAgents();
  return agents.length;
}

/**
 * Check agent health (return true if last heartbeat < 5 min ago)
 */
export async function isAgentHealthy(id: string, timeoutMs: number = 5 * 60 * 1000): Promise<boolean> {
  const agent = await getAgent(id);
  if (!agent) return false;

  const ageMs = Date.now() - agent.lastHeartbeat;
  return ageMs < timeoutMs;
}
