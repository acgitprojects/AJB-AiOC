# AiOC Agentic System - Critical Logic Bugs & Missing Features

**Date:** March 3, 2026  
**Scope:** Code audit for agentic paradigm compliance  
**Category Distribution:** 4 Critical (agent autonomy), 6 High (negotiation/coordination), 5 Medium (resilience)  

---

## CRITICAL BUGS: Agent Autonomy & Registry

### BUG-CRIT-AG-001: No Dynamic Agent Registration Endpoint

**What's Missing:**
- Agents cannot self-register at runtime
- No agent discovery mechanism
- System assumes fixed agent roster hardcoded in mockdata

**Location:** No `/api/agents` POST endpoint exists

**Impact on Agentic System:**
```
Expected Behavior:
  New agent joins → POST /api/agents {id, capabilities, rules} → 201 Created
  
Actual Behavior:
  New agent joins → No endpoint available → Agent cannot register
  System never updates agent list
```

**Required Implementation:**
```typescript
// Need: app/api/agents/route.ts
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return unauthorized();
  
  const { id, capabilities, rules } = await req.json();
  
  // Validate agent proposal
  if (!id || !Array.isArray(capabilities)) {
    return NextResponse.json({error: "Invalid agent proposal"}, {status: 400});
  }
  
  // Store in KV: agent:{id}
  // Add to agents_index
  // Broadcast to existing agents: "agent-{id} joined"
  // Return: 201 Created
}
```

---

### BUG-CRIT-AG-002: No Workflow Proposal & Validation Endpoint

**What's Missing:**
- Agents cannot propose workflows
- No workflow conflict detection
- No workflow versioning/history

**Location:** No `/api/workflows` POST/PATCH endpoints exist

**Impact on Agentic System:**
```
Expected: Agent proposes workflow → System validates → Stores with version
Actual: No endpoint, hardcoded New→Progress→Done workflow only
```

**Required Implementation:**
```typescript
// Need: app/api/workflows/route.ts
export async function POST(req: NextRequest) {
  const { agent_id, workflow_name, states, transitions, rules } = await req.json();
  
  // Validate workflow structure
  validateWorkflow(states, transitions); // Detect cycles, unreachable states
  
  // Check for conflicts with existing workflows
  const existing = await getWorkflows();
  const conflicts = detectWorkflowConflicts(transitions, existing);
  
  if (conflicts.length > 0) {
    return NextResponse.json({
      status: 409,
      error: "Workflow conflicts detected",
      conflicts: conflicts
    }, {status: 409});
  }
  
  // Store: workflow:{agent_id}:{workflow_name}
  // Add to workflows_index
  // If new agents exist, notify them of new workflow
  return NextResponse.json({...}, {status: 201});
}
```

---

### BUG-CRIT-AG-003: Task Mutations Don't Persist in Stateless Environment

**Location:** [app/api/tasks/[id]/route.ts](app/api/tasks/[id]/route.ts#L30-L36)

**Issue:**
```typescript
// Modifying MY_TASKS array directly (from memory)
const idx = MY_TASKS.findIndex(t => t.id === id);
MY_TASKS[idx] = updated;  // ← LOST on next statelesss function invocation
```

**Problem:**
- Cloudflare Workers are stateless
- In-memory mutations are lost
- If real gateway offline, tasks appear updated but aren't persisted

**Impact on Agents:**
```
Agent 1: "I'm updating task X"
Agent 2: "Did it work?"
Agent 1: "Yes, deployed!"
[Crash/restart]
Agent 2: "Wait, it's back to pending?"
→ Agent coordination breaks down, no consensus
```

**Fix:** Use Cloudflare KV for task persistence, not in-memory mutations
```typescript
// Store all task updates: task:{taskId} in KV
await KV_NAMESPACE.put(`task:${id}`, JSON.stringify(updated));

// On read, fetch from KV (single source of truth)
const stored = await KV_NAMESPACE.get(`task:${id}`);
```

---

### BUG-CRIT-AG-004: No Authorization on Agent-Mutating Routes

**Location:** [app/api/tasks/[id]/route.ts](app/api/tasks/[id]/route.ts), [app/api/agents](app/api/agents)

**Issue:**
```typescript
export async function PATCH(req: NextRequest, { params }: Params) {
  // ← NO session/auth check
  // Any unauthenticated request can:
  // - Modify any task
  // - Update agent status
  // - Change workflow rules
}
```

**Impact on Agentic System:**
```
Rogue endpoint call: PATCH /api/tasks/123 {status: "Done"}
  - No verification this request is from authorized agent
  - Task modified without audit trail
  - Malicious agent (or human) can sabotage other agents' work
```

**Fix:**
```typescript
const session = await getSession(req);
if (!session || !session.agentId) {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

// Verify agent is registered
const agent = await getAgent(session.agentId);
if (!agent) {
  return NextResponse.json({error: "Agent not found"}, {status: 404});
}

// Proceed with authorization (only agent can modify own tasks)
if (task.assigned_to !== session.agentId && !session.isAdmin) {
  return NextResponse.json({error: "Forbidden"}, {status: 403});
}
```

---

## HIGH SEVERITY: Agent Coordination & Negotiation

### BUG-HIGH-AG-001: No Multi-Agent Consensus Mechanism

**What's Missing:**
- Agents cannot vote on decisions
- No quorum or majority voting
- No resolution for conflicting proposals

**Impact:**
```
Scenario: Two agents propose conflicting workflows
  Casey: "New → Testing → Production"
  Alex: "New → Review → Done"
  Same task assigned to both
  
Expected: System asks agents to vote, reach consensus
Actual: Both proposals accepted, task is in ambiguous state
```

**Required:** Consensus endpoint
```typescript
// POST /api/consensus/vote
// Multiple agents vote on decision
// System calculates: unanimous, majority, deadlock
```

---

### BUG-HIGH-AG-002: No Agent Delegation/Handoff Mechanism

**What's Missing:**
- Agent cannot hand off work to another agent
- No inter-agent communication protocol
- Tasks get stuck with offline agents

**Impact:**
```
Agent 1 (offline): owns 50 tasks
Agents 2-5 (online): waiting for task availability
  
Expected: System automatically delegates Agent 1's tasks
Actual: Tasks remain assigned to offline agent, no action taken
```

**Required:**
```typescript
// GET /api/agents/{agent_id}/availability
// Returns: { available: bool, load: number, estimated_return: timestamp }

// POST /api/tasks/{id}/delegate
// From: Agent 1, To: Agent 2, Reason: "I'm offline"
// Return: 200 OK or 409 Conflict (if agent 2 at capacity)
```

---

### BUG-HIGH-AG-003: No Workflow Conflict Detection

**What's Missing:**
- Two agents can propose workflows with same ID
- Workflow states can be cycles or unreachable
- No validation of workflow graph structure

**Impact:**
```
Agent 1 proposes: {New → In_Progress → Done}
Agent 2 proposes: {New → In_Progress → Done}  // Same structure!
System: stores both as separate workflows? Or overwrites? → Undefined behavior

Agent 3 proposes: {New → Dead_End} (unreachable endpoint)
System: accepts invalid workflow? Or rejects? → Undefined behavior
```

**Fix:** Validate all workflows before acceptance
```typescript
function validateWorkflowGraph(states, transitions) {
  // 1. Detect cycles (DFS)
  if (hasCycle(transitions)) throw new CycleError();
  
  // 2. Verify all states reachable from initial state
  const reachable = reachableStates(states[0], transitions);
  const unreachable = states.filter(s => !reachable.has(s));
  if (unreachable.length > 0) throw new UnreachableError(unreachable);
}
```

---

### BUG-HIGH-AG-004: Agent Failure Cascades Without Notification

**What's Missing:**
- Agent goes offline → no notification to dependent agents
- Tasks remain assigned to dead agent
- Downstream tasks blocked indefinitely

**Impact:**
```
Workflow: Agent A completes task → triggers Agent B → triggers Agent C
Agent B crashes
Agent A: "Task done!"
Agent C: "Waiting for Agent B..."
System: No failure notification, so Agent C waits forever
```

**Fix:**
```typescript
// Heartbeat mechanism
async function checkAgentHealth() {
  const agents = await getAllAgents();
  for (const agent of agents) {
    if (!agent.lastHeartbeat || Date.now() - agent.lastHeartbeat > TIMEOUT) {
      // Agent is dead
      await notifyDependentAgents(agent.id, "agent_down", agent.inProgressTasks);
      await reassignTasks(agent.id);
    }
  }
}
```

---

### BUG-HIGH-AG-005: No Rate Limiting on Agent Operations

**What's Missing:**
- Agent can spam 1000 workflow proposals in 1 second
- No throttling on agent creation
- Adversarial agent can DoS system

**Impact:**
```
Rogue Agent: Creates 1000 workflows/sec
System: Processes all into KV, degrades performance
Other agents: Experience latency spikes, timeouts
```

**Fix:**
```typescript
// Rate limit: 10 operations/sec per agent
const rateLimiter = new RateLimiter({
  max_requests: 10,
  window_ms: 1000
});

if (rateLimiter.isLimited(agent_id)) {
  return NextResponse.json(
    {error: "Rate limit exceeded"},
    {status: 429}
  );
}
```

---

## MEDIUM SEVERITY: Resilience & Edge Cases

### BUG-MED-AG-001: Demo Mode Masks Real Agent Behavior Issues

**Location:** [lib/openclaw.ts](lib/openclaw.ts#L178-L186), [app/api/openclaw/status/route.ts](app/api/openclaw/status/route.ts)

**Issue:**
```typescript
// When DEMO_MODE=true, all gateway responses are mocked
if (process.env.DEMO_MODE === "true") {
  return { connected: true };  // ← Always returns success
}
```

**Impact on Agent Testing:**
```
In production: Real gateway responds with latency, errors, slowdowns
In demo mode: Instant success responses hide real problems
  - Agent doesn't learn to handle timeouts
  - System latency targets seem met but are fake
  - Production deployment fails, "works in dev!"
```

**Fix:**
```typescript
// Demo mode: Simulate realistic behavior, not instant success
if (process.env.DEMO_MODE === "true") {
  // Simulate network latency: 50-200ms
  await new Promise(r => setTimeout(r, Math.random() * 150 + 50));
  
  // Randomly fail 5% of requests
  if (Math.random() < 0.05) {
    throw new Error("Simulated gateway timeout");
  }
  
  // Return realistic response
  return { connected: true, latency_ms: response_time };
}
```

---

### BUG-MED-AG-002: Tasks Don't Track Which Workflow They Belong To

**Location:** [lib/mock-data.ts](lib/mock-data.ts) - Task schema

**Issue:**
```typescript
type MyTask = {
  id: string;
  title: string;
  status: string;  // ← No workflow_id field!
  // Missing: workflow_id, created_by_agent, assigned_to_agent, etc.
}
```

**Impact:**
```
Task has status: "In_Progress"
But which agent's workflow is this from?
  - Agent A's workflow: New → In_Progress → Done
  - Agent B's workflow: New → Review → Testing → In_Progress
System cannot validate transitions without knowing workflow
```

**Fix:**
```typescript
type AgentTask = {
  id: string;
  title: string;
  workflow_id: string;  // ← Add reference
  workflow_agent: string;  // ← Which agent owns this workflow?
  state: string;
  created_by: string;  // ← Which agent created this?
  assigned_to: string;  // ← Assigned to which agent?
  created_at: timestamp;
  updated_at: timestamp;
  audit_trail: [{action, timestamp, agent_id, details}];
}
```

---

### BUG-MED-AG-003: No Audit Trail for Agent Actions

**What's Missing:**
- Agent A modifies task → no record of who did what
- Workflow changes → no history
- Impossible to debug agent behavior or replay scenarios

**Impact:**
```
Investigation: "Why is task stuck in 'Review'?"
System: "Beats me, no audit trail"
Agent coordination problems impossible to debug
```

**Fix:**
```typescript
// Every agent action creates audit entry
await logAgentAction({
  agent_id: session.agentId,
  action: "task_transition",
  details: {
    task_id: id,
    from_state: old_status,
    to_state: new_status,
    workflow_id: task.workflow_id,
  },
  timestamp: Date.now(),
  signature: sign(action_details, AUDIT_SECRET)
});
```

---

### BUG-MED-AG-004: Workflow Transitions Not Validated at Runtime

**Location:** [app/api/tasks/[id]/route.ts](app/api/tasks/[id]/route.ts#L30-L50)

**Issue:**
```typescript
// No validation that transition is allowed
const updated = { ...MY_TASKS[idx], ...body };
// If body contains {status: "Invalid_State"}, accepted without check
```

**Impact:**
```
Agent 1: "I'm moving task from 'New' → 'Testing'"
Task's workflow: New → Review → Done (no 'Testing' defined!)
System: Accepts transition anyway → Task in undefined state
Agent 2: "What state should I expect?" → System doesn't know
```

**Fix:**
```typescript
const workflow = await getWorkflow(task.workflow_id);
const allowed = workflow.transitions[task.status] || [];

if (!allowed.includes(new_status)) {
  return NextResponse.json({
    error: "Invalid transition",
    current_state: task.status,
    allowed_states: allowed,
    requested_state: new_status
  }, {status: 400});
}
```

---

### BUG-MED-AG-005: Session Secret Defaults to Weak Value if Not Set

**Location:** [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L32)

**Issue:**
```typescript
const secret = process.env.DASHBOARD_SESSION_SECRET || "aioc";  // ← "aioc" is weak!
```

**Impact:**
```
If DASHBOARD_SESSION_SECRET undefined:
  Session token = HMAC-SHA256("session_data", "aioc")
  Weak secret → tokens can be forged
  Attacker: Signs own token with secret "aioc"
  System: Accepts forged token as valid
```

**Fix:**
```typescript
const secret = process.env.DASHBOARD_SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "DASHBOARD_SESSION_SECRET not configured or too short (min 32 chars). " +
    "Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}
```

---

## Testing Priorities for Agentic System

### Must Test Before Production:
1. ✅ Agent registry CRUD operations (missing endpoint)
2. ✅ Workflow proposal & validation (missing endpoint)
3. ✅ Task persistence in KV (currently losing data)
4. ✅ Authorization on agent-mutating routes (missing checks)
5. ✅ Workflow conflict detection (no validation)
6. ✅ Agent coordination & consensus (missing mechanism)
7. ✅ Rate limiting on adversarial agents (missing)

### Should Fix Before Production:
2. Agent health checking & auto-delegation
3. Audit trail for all agent actions
4. Workflow transition validation at runtime
5. Realistic demo mode latency simulation
6. Session secret hardening

### Recommended Remediation Order:
**Sprint 1 (Critical):**
- Implement `/api/agents` POST/GET/DELETE endpoints
- Implement `/api/workflows` POST/GET/PUT endpoints
- Fix task persistence (KV instead of in-memory)
- Add auth checks to task routes

**Sprint 2 (High):**
- Implement workflow validation & conflict detection
- Add consensus/voting mechanism
- Implement delegation handoff
- Add rate limiting

**Sprint 3 (Medium):**
- Implement audit trails
- Add agent health checking
- Fix demo mode to simulate realistic latency
- Harden session secrets

---

## No Regression Testing Checklist

Before each deployment, verify:

- [ ] No new race conditions in agent operations
- [ ] All agent routes require authentication
- [ ] Task data persists across worker restarts
- [ ] Workflow transitions validated
- [ ] Rate limiting blocks spam agents
- [ ] Demo mode realistic, not instant success
- [ ] Audit trails created for all agent actions
- [ ] System latency < 150ms P95 (not including network)

