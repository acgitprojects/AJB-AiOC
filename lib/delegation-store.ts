/**
 * lib/delegation-store.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Task delegation tracking and workflow management
 *
 * Delegation lifecycle:
 *   1. PROPOSED: Source agent requests delegation to target agent
 *   2. PENDING_APPROVAL: Waiting for target agent to accept/reject
 *   3. ACCEPTED: Target agent accepted, ownership transferring
 *   4. ACTIVE: Task now owned by target agent
 *   5. REJECTED: Target agent rejected delegation
 *   6. CANCELLED: Source agent cancelled before acceptance
 *
 * Storage:
 *   delegation:{id}         → Delegation object
 *   delegations_index       → string[] (all delegation IDs)
 *   task:{taskId}:delegations → Delegation[] for task
 * ─────────────────────────────────────────────────────────────────────────────
 */

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

export type DelegationStatus =
  | "PROPOSED"
  | "PENDING_APPROVAL"
  | "ACCEPTED"
  | "ACTIVE"
  | "REJECTED"
  | "CANCELLED";

export interface Delegation {
  id: string; // UUID
  taskId: string;
  sourceAgentId: string; // Agent proposing delegation
  targetAgentId: string; // Agent receiving task
  status: DelegationStatus;
  reason?: string; // Why delegation is needed
  proposedAt: string; // ISO date
  respondedAt?: string; // When target agent responded
  response?: "ACCEPTED" | "REJECTED"; // Target agent's decision
  responseReason?: string; // Why target accepted/rejected
  activatedAt?: string; // When ownership transferred
  cancelledAt?: string; // If cancelled by source
  expiresAt?: string; // Proposal expires if not responded to within 24h
}

// In-memory cache for development
let delegationCache = new Map<string, Delegation>();

async function readDelegation(id: string): Promise<Delegation | null> {
  // Try cache first
  if (delegationCache.has(id)) {
    return delegationCache.get(id) || null;
  }

  // Try KV
  const kv = await getKV();
  if (kv) {
    try {
      const data = await kv.get(`delegation:${id}`);
      if (data) {
        const delegation = JSON.parse(data) as Delegation;
        delegationCache.set(id, delegation);
        return delegation;
      }
    } catch (err) {
      console.error("[delegation-store] Failed to read from KV:", err);
    }
  }

  return null;
}

async function writeDelegation(delegation: Delegation): Promise<void> {
  // Write to cache
  delegationCache.set(delegation.id, delegation);

  // Write to KV
  const kv = await getKV();
  if (kv) {
    try {
      await kv.put(`delegation:${delegation.id}`, JSON.stringify(delegation));
    } catch (err) {
      console.error("[delegation-store] Failed to write to KV:", err);
    }
  }
}

/**
 * Create a new delegation proposal
 */
export async function createDelegation(
  taskId: string,
  sourceAgentId: string,
  targetAgentId: string,
  reason?: string
): Promise<Delegation> {
  const { randomUUID } = await import("crypto");
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h expiry

  const delegation: Delegation = {
    id,
    taskId,
    sourceAgentId,
    targetAgentId,
    status: "PROPOSED",
    reason,
    proposedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await writeDelegation(delegation);
  return delegation;
}

/**
 * Get delegation by ID
 */
export async function getDelegation(id: string): Promise<Delegation | null> {
  return readDelegation(id);
}

/**
 * Get all delegations for a task
 */
export async function getTaskDelegations(
  taskId: string
): Promise<Delegation[]> {
  const kv = await getKV();

  try {
    if (kv) {
      const data = await kv.get(`task:${taskId}:delegations`);
      if (data) {
        return JSON.parse(data) as Delegation[];
      }
    }
  } catch (err) {
    console.error("[delegation-store] Failed to read task delegations:", err);
  }

  // Return from cache
  const delegations: Delegation[] = [];
  for (const delegation of delegationCache.values()) {
    if (delegation.taskId === taskId) {
      delegations.push(delegation);
    }
  }
  return delegations;
}

/**
 * Get pending delegations for a target agent
 */
export async function getPendingDelegationsForAgent(
  agentId: string
): Promise<Delegation[]> {
  const kv = await getKV();
  const delegations: Delegation[] = [];

  try {
    if (kv) {
      const list = await kv.list({ prefix: "delegation:" });
      for (const key of list.keys) {
        const data = await kv.get(key.name);
        if (data) {
          const delegation = JSON.parse(data) as Delegation;
          if (
            delegation.targetAgentId === agentId &&
            (delegation.status === "PROPOSED" ||
              delegation.status === "PENDING_APPROVAL")
          ) {
            delegations.push(delegation);
          }
        }
      }
      return delegations;
    }
  } catch (err) {
    console.error(
      "[delegation-store] Failed to list delegations from KV:",
      err
    );
  }

  // Fall back to cache
  for (const delegation of delegationCache.values()) {
    if (
      delegation.targetAgentId === agentId &&
      (delegation.status === "PROPOSED" || delegation.status === "PENDING_APPROVAL")
    ) {
      delegations.push(delegation);
    }
  }
  return delegations;
}

/**
 * Accept a delegation
 */
export async function acceptDelegation(
  id: string,
  responseReason?: string
): Promise<Delegation> {
  const delegation = await readDelegation(id);

  if (!delegation) {
    throw new Error(`Delegation ${id} not found`);
  }

  const now = new Date().toISOString();
  delegation.status = "ACCEPTED";
  delegation.response = "ACCEPTED";
  delegation.responseReason = responseReason;
  delegation.respondedAt = now;
  delegation.activatedAt = now;

  await writeDelegation(delegation);
  return delegation;
}

/**
 * Reject a delegation
 */
export async function rejectDelegation(
  id: string,
  responseReason?: string
): Promise<Delegation> {
  const delegation = await readDelegation(id);

  if (!delegation) {
    throw new Error(`Delegation ${id} not found`);
  }

  const now = new Date().toISOString();
  delegation.status = "REJECTED";
  delegation.response = "REJECTED";
  delegation.responseReason = responseReason;
  delegation.respondedAt = now;

  await writeDelegation(delegation);
  return delegation;
}

/**
 * Cancel a delegation (by source agent)
 */
export async function cancelDelegation(id: string): Promise<Delegation> {
  const delegation = await readDelegation(id);

  if (!delegation) {
    throw new Error(`Delegation ${id} not found`);
  }

  if (delegation.status !== "PROPOSED" && delegation.status !== "PENDING_APPROVAL") {
    throw new Error(
      `Cannot cancel delegation in status ${delegation.status}`
    );
  }

  const now = new Date().toISOString();
  delegation.status = "CANCELLED";
  delegation.cancelledAt = now;

  await writeDelegation(delegation);
  return delegation;
}

/**
 * Mark delegation as ACTIVE (ownership transferred)
 */
export async function activateDelegation(id: string): Promise<Delegation> {
  const delegation = await readDelegation(id);

  if (!delegation) {
    throw new Error(`Delegation ${id} not found`);
  }

  if (delegation.status !== "ACCEPTED") {
    throw new Error(`Cannot activate delegation in status ${delegation.status}`);
  }

  const now = new Date().toISOString();
  delegation.status = "ACTIVE";
  delegation.activatedAt = now;

  await writeDelegation(delegation);
  return delegation;
}

/**
 * Get all delegations (paginated)
 */
export async function getAllDelegations(
  limit: number = 100,
  offset: number = 0
): Promise<{ delegations: Delegation[]; total: number }> {
  const kv = await getKV();
  const delegations: Delegation[] = [];

  try {
    if (kv) {
      const list = await kv.list({ prefix: "delegation:" });
      for (const key of list.keys) {
        const data = await kv.get(key.name);
        if (data) {
          delegations.push(JSON.parse(data) as Delegation);
        }
      }
      return {
        delegations: delegations.slice(offset, offset + limit),
        total: delegations.length,
      };
    }
  } catch (err) {
    console.error("[delegation-store] Failed to list all delegations:", err);
  }

  // Fall back to cache
  const cached = Array.from(delegationCache.values());
  return {
    delegations: cached.slice(offset, offset + limit),
    total: cached.length,
  };
}

/**
 * Get delegation statistics
 */
export async function getDelegationStats(): Promise<{
  proposed: number;
  pendingApproval: number;
  accepted: number;
  active: number;
  rejected: number;
  cancelled: number;
  total: number;
}> {
  const { delegations, total } = await getAllDelegations(10000);

  return {
    proposed: delegations.filter(d => d.status === "PROPOSED").length,
    pendingApproval: delegations.filter(
      d => d.status === "PENDING_APPROVAL"
    ).length,
    accepted: delegations.filter(d => d.status === "ACCEPTED").length,
    active: delegations.filter(d => d.status === "ACTIVE").length,
    rejected: delegations.filter(d => d.status === "REJECTED").length,
    cancelled: delegations.filter(d => d.status === "CANCELLED").length,
    total,
  };
}
