/**
 * lib/workflow-store.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Workflow registry CRUD + persistence layer.
 *
 * Workflows are proposed by agents and must be validated before acceptance.
 * Once accepted, they define task state machines for agent coordination.
 *
 * Storage strategy:
 *   - Production (Cloudflare Workers): Cloudflare KV namespace
 *   - Development (Node.js): In-memory cache
 *
 * KV key design:
 *   workflow:{agentId}:{workflowName}  →  Workflow JSON
 *   workflows_index                     →  string[]  (all workflow IDs)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Workflow {
  id: string; // "{agentId}:{workflowName}"
  agentId: string;
  workflowName: string;
  states: string[];
  transitions: Record<string, string[]>; // state -> [next_states]
  rules: Record<string, unknown>;
  isGlobal: boolean; // true = shared, false = agent-specific
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowValidationError {
  type: "cycle" | "unreachable" | "no_transitions" | "invalid_state";
  message: string;
  details: Record<string, unknown>;
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
let _workflowCache: Map<string, Workflow> | null = null;

async function getWorkflowCache(): Promise<Map<string, Workflow>> {
  if (_workflowCache) return _workflowCache;
  _workflowCache = new Map();
  return _workflowCache;
}

/**
 * Validate workflow structure
 * - No cycles
 * - All states reachable from first state
 * - All transitions reference valid states
 */
export function validateWorkflow(
  states: string[],
  transitions: Record<string, string[]>
): WorkflowValidationError[] {
  const errors: WorkflowValidationError[] = [];

  if (!states || states.length === 0) {
    errors.push({
      type: "no_transitions",
      message: "Workflow must have at least one state",
      details: {},
    });
    return errors;
  }

  // Check for cycles using DFS
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycleUtil(state: string): boolean {
    visited.add(state);
    recStack.add(state);

    const nextStates = transitions[state] ?? [];
    for (const next of nextStates) {
      if (!visited.has(next)) {
        if (hasCycleUtil(next)) return true;
      } else if (recStack.has(next)) {
        return true;
      }
    }

    recStack.delete(state);
    return false;
  }

  for (const state of states) {
    if (!visited.has(state) && hasCycleUtil(state)) {
      errors.push({
        type: "cycle",
        message: `Workflow contains cycle involving state '${state}'`,
        details: { state, transitions },
      });
      break; // One cycle error is enough
    }
  }

  // Check reachability from first state
  const reachable = new Set<string>();

  function markReachable(state: string) {
    if (reachable.has(state)) return;
    reachable.add(state);

    const nextStates = transitions[state] ?? [];
    for (const next of nextStates) {
      markReachable(next);
    }
  }

  if (states.length > 0) {
    markReachable(states[0]);

    const unreachable = states.filter(s => !reachable.has(s));
    if (unreachable.length > 0) {
      errors.push({
        type: "unreachable",
        message: `States unreachable from initial state: ${unreachable.join(", ")}`,
        details: { unreachable, initialState: states[0] },
      });
    }
  }

  // Verify all transitions reference valid states
  for (const [state, nextStates] of Object.entries(transitions)) {
    if (!states.includes(state)) {
      errors.push({
        type: "invalid_state",
        message: `Transition references undefined state '${state}'`,
        details: { state },
      });
    }

    for (const next of nextStates) {
      if (!states.includes(next)) {
        errors.push({
          type: "invalid_state",
          message: `State '${state}' transitions to undefined state '${next}'`,
          details: { fromState: state, toState: next },
        });
      }
    }
  }

  return errors;
}

/**
 * Create a new workflow (after validation)
 */
export async function createWorkflow(
  agentId: string,
  workflowName: string,
  states: string[],
  transitions: Record<string, string[]>,
  rules: Record<string, unknown> = {}
): Promise<Workflow | { error: WorkflowValidationError[] }> {
  // Validate structure first
  const validationErrors = validateWorkflow(states, transitions);
  if (validationErrors.length > 0) {
    return { error: validationErrors };
  }

  const kv = await getKV();
  const now = new Date().toISOString();
  const workflowId = `${agentId}:${workflowName}`;

  const workflow: Workflow = {
    id: workflowId,
    agentId,
    workflowName,
    states,
    transitions,
    rules,
    isGlobal: false, // Starts as agent-specific
    createdAt: now,
    updatedAt: now,
  };

  if (kv) {
    try {
      await kv.put(`workflow:${workflowId}`, JSON.stringify(workflow));

      // Update index
      const indexRaw = await kv.get("workflows_index");
      const index = indexRaw ? JSON.parse(indexRaw) as string[] : [];
      if (!index.includes(workflowId)) {
        index.push(workflowId);
        await kv.put("workflows_index", JSON.stringify(index));
      }
    } catch (err) {
      console.error("[workflow-store] Failed to create workflow in KV:", err);
      return { error: [{ type: "invalid_state", message: "Failed to persist workflow", details: {} }] };
    }
  } else {
    const cache = await getWorkflowCache();
    cache.set(workflowId, workflow);
  }

  return workflow;
}

/**
 * Get a workflow by ID
 */
export async function getWorkflow(id: string): Promise<Workflow | null> {
  const kv = await getKV();

  if (kv) {
    const raw = await kv.get(`workflow:${id}`);
    return raw ? JSON.parse(raw) as Workflow : null;
  } else {
    const cache = await getWorkflowCache();
    return cache.get(id) ?? null;
  }
}

/**
 * Get all workflows (with optional filtering)
 */
export async function getAllWorkflows(filterFn?: (w: Workflow) => boolean): Promise<Workflow[]> {
  const kv = await getKV();

  if (kv) {
    try {
      const result = await kv.list({ prefix: "workflow:" });
      const workflows: Workflow[] = [];

      for (const key of result.keys) {
        const raw = await kv.get(key.name);
        if (raw) {
          const workflow = JSON.parse(raw) as Workflow;
          if (!filterFn || filterFn(workflow)) {
            workflows.push(workflow);
          }
        }
      }

      return workflows;
    } catch (err) {
      console.error("[workflow-store] Failed to list workflows:", err);
      return [];
    }
  } else {
    const cache = await getWorkflowCache();
    const workflows = Array.from(cache.values());
    return filterFn ? workflows.filter(filterFn) : workflows;
  }
}

/**
 * Get workflows for a specific agent
 */
export async function getAgentWorkflows(agentId: string): Promise<Workflow[]> {
  return getAllWorkflows(w => w.agentId === agentId);
}

/**
 * Check for workflow conflicts with existing workflows
 * Returns list of conflicting workflows
 */
export async function detectWorkflowConflicts(
  newStates: string[],
  newTransitions: Record<string, string[]>
): Promise<Workflow[]> {
  const allWorkflows = await getAllWorkflows();

  const conflicts: Workflow[] = [];

  // Simple conflict detection: if states/transitions differ significantly
  for (const existing of allWorkflows) {
    // Different number of states or transitions = conflict
    if (
      existing.states.length !== newStates.length ||
      Object.keys(existing.transitions).length !== Object.keys(newTransitions).length
    ) {
      conflicts.push(existing);
    }
  }

  return conflicts;
}

/**
 * Update a workflow's rules (for consensus/negotiation)
 */
export async function updateWorkflowRules(
  id: string,
  newRules: Record<string, unknown>
): Promise<Workflow | null> {
  const kv = await getKV();

  let workflow = await getWorkflow(id);
  if (!workflow) return null;

  const updated: Workflow = {
    ...workflow,
    rules: newRules,
    updatedAt: new Date().toISOString(),
  };

  if (kv) {
    try {
      await kv.put(`workflow:${id}`, JSON.stringify(updated));
    } catch (err) {
      console.error("[workflow-store] Failed to update workflow rules:", err);
      throw new Error("Failed to update workflow");
    }
  } else {
    const cache = await getWorkflowCache();
    cache.set(id, updated);
  }

  return updated;
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string): Promise<boolean> {
  const kv = await getKV();

  if (kv) {
    try {
      await kv.delete(`workflow:${id}`);

      // Update index
      const indexRaw = await kv.get("workflows_index");
      const index = indexRaw ? JSON.parse(indexRaw) as string[] : [];
      const newIndex = index.filter(w => w !== id);
      await kv.put("workflows_index", JSON.stringify(newIndex));
    } catch (err) {
      console.error("[workflow-store] Failed to delete workflow from KV:", err);
      return false;
    }
  } else {
    const cache = await getWorkflowCache();
    cache.delete(id);
  }

  return true;
}
