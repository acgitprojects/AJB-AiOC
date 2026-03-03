# AiOC Agent-Centric Testing Plan
## Revised Paradigm: Dynamic Agent Registry, Agent-Driven Workflows, System Latency

**Focus:** Testing the application as a truly AGENTIC system with dynamic, rule-agnostic agent coordination  
**Date:** March 3, 2026  
**Revision:** Paradigm Shift from Fixed-Agent to Dynamic-Registry Model  

---

## Executive Summary

The AiOC system is fundamentally an **agent orchestration platform**, not a UI tool with fixed agents. Testing must validate:

1. **Dynamic Agent Discovery** — System handles 1, 10, 100, 1000+ agents seamlessly
2. **System Latency** — Internal processing < 100ms (P50), independent of network
3. **Agent-Proposed Workflows** — Agents define state machines at runtime; system validates/negotiates
4. **Multi-Agent Negotiation** — Quorum decisions, consensus building, conflict resolution
5. **Emergent Behavior** — Unscripted agent interactions and workflow evolution
6. **Scalability Curves** — Performance degradation patterns as agent count grows

---

## Section 1: Dynamic Agent Registry Testing

### 1.1 Agent Count Scalability
Test the system's ability to register, manage, and coordinate agents at various scales.

**Test 1.1.1: Single Agent Baseline**
```
Setup: 1 agent in registry
Task: Create task → assign to agent → complete
Measure:
  - Task creation latency: target < 50ms
  - Agent discovery latency: target < 20ms
  - Task assignment latency: target < 30ms
  - Total round-trip: < 100ms
```

**Test 1.1.2: Low Scale (10 Agents)**
```
Setup: Register 10 agents simultaneously
  - Agent names: bot-001, bot-002, ..., bot-010
  - Each agent self-declares capabilities: {tasks: ["communicate", "schedule"], rules: {...}}
Task: Create 10 tasks, broadcast to all agents
Measure:
  - Registration time per agent: target < 20ms each
  - Broadcast latency: target < 100ms (system, not network)
  - Total time to assign all tasks: target < 200ms
  - KV consistency check (all agents in registry index)
```

**Test 1.1.3: Medium Scale (100 Agents)**
```
Setup: 100 concurrent agent registrations
  - Simulate parallel WebSocket connections
  - Each agent posts: POST /api/agents with {id, capabilities, rules}
Task: Query full registry, broadcast task to random subset
Measure:
  - P50 registration latency: < 30ms
  - P95 registration latency: < 80ms
  - P99 registration latency: < 150ms
  - Registry query latency: < 100ms
  - Memory usage (track via worker logs)
```

**Test 1.1.4: High Scale (1000+ Agents)**
```
Setup: 1000+ agents in registry
  - Staged registration: 100 → 200 → 500 → 1000
  - Monitor system degradation at each milestone
Task: Broadcast task to subset (random 10% of agents)
Measure:
  - Latency degradation curve (should < 2x at 10x scale)
  - Cache efficiency (repeated queries should benefit from caching)
  - KV operation limits (Cloudflare KV: 1000 calls/second)
  - Identify inflection point where performance noticeably degrades
```

---

## Section 2: System Latency Profiling

Measure INTERNAL processing time, excluding network round-trip. Use server-side timing headers.

### 2.1 Baseline Latency Targets
```
Operation                       Target P50    Target P95    Target P99
─────────────────────────────────────────────────────────────────────
Agent registration              < 20ms        < 50ms        < 100ms
Task creation                   < 30ms        < 80ms        < 150ms
Agent task assignment           < 25ms        < 70ms        < 120ms
Workflow validation             < 40ms        < 100ms       < 180ms
Agent negotiation round         < 50ms        < 120ms       < 200ms
KV read (user/task)             < 10ms        < 30ms        < 60ms
KV write (persist state)        < 15ms        < 50ms        < 100ms
Session verification            < 5ms         < 15ms        < 30ms
Authentication (PBKDF2)         < 100ms       < 200ms       < 300ms
```

### 2.2 Latency Measurement Methodology
```
Client-Side (Browser DevTools):
  - Measure Network tab timing
  - BUT: Use server-side headers to separate network from processing
  
Server-Side (Add Timing Headers):
  - X-Processing-Time: (ms from route handler start to response ready)
  - X-KV-Time: (ms spent in KV operations)
  - X-Agent-Time: (ms spent in agent negotiation/calls)
  
Expected Breakdown:
  Total Network RTT = Network Latency + Server Processing
  Focus: Minimize Server Processing
```

### 2.3 Load Testing Latency
```
Condition: 100 concurrent requests
  - Ramp up: 10 req/s → 50 req/s over 60 seconds
  - Sustain: 50 req/s for 60 seconds
  - Ramp down: 50 req/s → 0 over 30 seconds

Target Under Load:
  - P50: < 80ms (baseline < 30ms, so acceptable 2.6x increase)
  - P95: < 150ms (baseline < 80ms, so acceptable 1.9x increase)
  - P99: < 300ms (baseline < 150ms, so acceptable 2x increase)
  - No requests should exceed 500ms
```

---

## Section 3: Agent-Driven Workflow Testing

Workflows should be proposed by agents at runtime, not hardcoded globally.

### 3.1 Workflow Proposal & Validation

**Test 3.1.1: Agent Proposes Workflow**
```
Agent (Casey) submits workflow proposal:
{
  "agent_id": "casey",
  "workflow_name": "devops_pipeline",
  "states": ["New", "Testing", "Staging", "Production"],
  "transitions": {
    "New": ["Testing"],
    "Testing": ["Staging", "New"],
    "Staging": ["Production", "stagingIssue"],
    "Production": [],
    "stagingIssue": ["Staging"]
  },
  "rules": {
    "auto_testing": true,
    "require_staging": true,
    "production_approval": "manual"
  }
}

Expected Response: 201 Created, workflow registered
Verify:
  - Workflow stored in KV under "workflow:casey:devops_pipeline"
  - Other agents can query available workflows
  - Tasks can be assigned to this workflow
```

**Test 3.1.2: Validate Workflow Against State Machine**
```
Task: Move task from "Testing" → "Unknown_State"
Expected: 400 Bad Request (invalid state transition)

Task: Move task through valid path: New → Testing → Staging → Production
Expected: 200 OK at each step
Verify: Audit log records all state changes
```

**Test 3.1.3: Check Hardcoded Global Workflow Still Exists (Fallback)**
```
If no agent-specific workflow exists, system should have default:
  New → Progress → Review → Done (or similar)

Verify: Tasks without explicit workflow use fallback
Query: GET /api/workflows/default
Expected: Return global fallback workflow
```

---

## Section 4: Multi-Agent Negotiation Scenarios

Agents should negotiate rules, priorities, and workflows. System validates consensus.

### 4.1 Workflow Conflict Resolution

**Test 4.1.1: Two Agents Propose Conflicting Workflows**
```
Agent 1 (Jary): Proposes "New → InProgress → Done"
Agent 2 (Casey): Proposes "New → Testing → Production → Done"

Same task assigned to both agents.
Expected: System detects conflict, returns 409 Conflict
Response should include:
  - Conflicting workflows
  - Option to: (a) use agent1's workflow, (b) use agent2's workflow, (c) merge, (d) create new

Human/Admin reconciliation required
```

**Test 4.1.2: Three Agents Vote on Task Priority**
```
Task: "Deploy database migration"
Agents: Jary (Urgency: HIGH), Casey (Urgency: MEDIUM), Riley (Urgency: LOW)

Query: POST /api/tasks/{id}/vote-priority with agent votes
Expected: System calculates priority:
  - Mode (HIGH appears 1x, MEDIUM 1x, LOW 1x) → need tiebreaker
  - If no clear majority, escalate to query human
  - If clear majority, update task priority

Measure: Voting round-trip latency < 200ms
```

**Test 4.1.3: Agent Delegation & Quorum**
```
Scenario: Agent Alex cannot complete task, requests delegation to other agents
POST /api/tasks/{id}/delegate
{
  "from_agent": "alex",
  "reason": "requires_devops_expertise",
  "candidate_agents": ["casey", "jordan"]
}

Expected:
  1. Query candidate agents for availability
  2. Candidates respond with [yes/no/conditional]
  3. First to accept claims task
  4. Losers notified of delegated outcome
  
Measure: quorum assembly < 500ms
```

### 4.2 Consensus Building

**Test 4.2.1: Workflow Renegotiation Mid-Process**
```
Scenario: 5 agents have agreed on workflow: New → Progress → Done
Mid-task, new agent (Morgan) joins cluster
Morgan proposes: New → Review → Testing → Progress → Done

Expected:
  1. System queries existing agents: "Merge new workflow?"
  2. Agents can: accept, propose alternative, or request human arbitration
  3. If consensus, apply merged workflow to in-flight tasks
  
Edge Case: One agent rejects merge
  - System escalates: "Workflow conflict needs human decision"
  - Existing agents continue under old workflow
  - New agent can work under new workflow (separate workflow instance)
```

**Test 4.2.2: Timeout in Consensus**
```
Setup: 3 agents in quorum, need agreement on task assignment
  Agent 1: responds in 50ms
  Agent 2: timeout (no response for 150ms)
  Agent 3: responds in 80ms

Expected behavior:
  - P50 consensus time: 50ms (agent 1 responds)
  - With P95 latency: wait up to 150ms for agent 3
  - If agent 2 times out, proceed with 2-of-3 consensus
  
Verify: Timeout setting < 500ms (configurable)
```

---

## Section 5: Emerging Behavior & Unscripted Scenarios

### 5.1 Multi-Agent Task Coordination
```
Scenario: Complex task requires multiple agent skills
Task: "Analyze deployment logs AND contact support team"
  - Requires: dev-ops + communication skills
  - Available agents: Casey (dev-ops only), Riley (communication only)

Expected:
  1. System identifies skill gap
  2. Proposes task split: subtask_A → Casey, subtask_B → Riley
  3. Agents coordinate: Casey completes first, notifies Riley
  4. Riley receives context from Casey (async handoff)
  5. Final aggregate task status: Complete

Measure: Multi-agent choreography latency < 300ms for handoff
```

### 5.2 Workflow Evolution as Agents Join/Leave
```
Initial: 2 agents (Jary, Casey) running workflow: New → Done

Step 1: 3rd agent (Alex) joins
  - Query: "What workflow should I join?"
  - Response: "Current: New → Done" (auto-discovery)
  - Alex proposes: "New → Review → Done"
  - Agents negotiate, agree to: "New → Review → Done"
  - All in-flight tasks updated to new workflow

Step 2: Casey leaves (goes offline)
  - Expected: System handles agent removal gracefully
  - Casey's in-progress tasks: reassigned to remaining agents
  - Workflow remains: New → Review → Done

Measure: Each transition latency < 200ms
```

### 5.3 Adversarial Scenarios
```
Test 5.3.1: Agent Proposes Infinite Loop Workflow
Agent submits: {A → B → A} 
Expected: System detects cycle, rejects with 400 Bad Request
Response: "Workflow contains cycle: A → B → A"

Test 5.3.2: Agent Proposes Unreachable State
Agent submits: {New → Done, but also Dead_End → ?}
Expected: System detects unreachable state "Dead_End"
Response: 400 Bad Request "State 'Dead_End' unreachable from New"

Test 5.3.3: Agent Spams Workflow Creation
Agent creates 1000 workflows in 1 second
Expected: 
  - Rate limit: max 10/second per agent
  - Excess requests return 429 Too Many Requests
  - Oldest workflows auto-pruned after N days (configurable)
```

---

## Section 6: Scalability & Stress Testing

### 6.1 Concurrent Operations

**Test 6.1.1: 100 Tasks Created Simultaneously**
```
Setup: 10 agents, each creates 10 tasks in parallel
Expected:
  - Total time: < 1 second
  - Each task assigned to agent without collision
  - All tasks appear in KV index
  
Measure:
  - Create latency: P95 < 100ms
  - Index consistency check post-creation
```

**Test 6.1.2: 50 Concurrent Workflow Proposals**
```
Setup: 50 agents simultaneously propose workflows
Expected:
  - All 50 stored in KV
  - No merge conflicts or lost writes
  - Lookup any workflow: < 50ms

Validation:
  - Count KV entries: expect 50 workflow:* keys
  - Iterate through all, validate JSON
```

### 6.2 Storage & Memory Limits

**Test 6.2.1: KV Capacity**
```
Cloudflare KV Limits:
  - 1000 reads/second
  - 100 writes/second
  - Value size: 25 MB max
  - Namespace size: unlimited (but costs per GB)

Test: Create tasks until approaching 100 writes/second limit
Expected:
  - Monitor write latency degradation
  - Identify when latency exceeds target (> 200ms)
  - Set alert threshold at 80% capacity (80 writes/sec)
```

**Test 6.2.2: Session/User Data Growth**
```
Scenario: 1000 user sessions active
  - Each session: ~1 KB (token, metadata, preferences)
  - Total: ~1 MB user session data in KV
  
Task: Verify all sessions retrievable, none lost
Expected:
  - Session lookup latency: < 20ms even at scale
  - No KV fragmentation issues
```

---

## Section 7: Critical Bug Hunting

### 7.1 Agent Registry Consistency

**Test 7.1.1: Race Condition in Agent Registration**
```
Scenario: 2 agents register simultaneously with same ID
Agent 1: POST /api/agents {id: "agent-001", ...}
Agent 2: POST /api/agents {id: "agent-001", ...} (same ID, different metadata)

Expected: One succeeds (201), one fails (409 Conflict)
Bug Risk: Both writes succeed, creating duplicate → lookup ambiguity
Verify: agents_index has exactly 1 entry for "agent-001"
```

**Test 7.1.2: Agent Deregistration + Concurrent Task Assignment**
```
Scenario: Agent goes offline while task is assigned to it
Event 1: DELETE /api/agents/agent-001
Event 2: POST /api/tasks (attempting to assign to agent-001)

Expected: Task assignment fails (404 Agent Not Found)
Bug Risk: Task persists in "assigned to agent-001" without validation
Verify: Task not created, no orphaned task state
```

### 7.2 Workflow Validation Gaps

**Test 7.2.1: Workflow Allows Invalid Transitions Post-Creation**
```
Workflow created: {New → Progress → Done}
Task in Progress state
Attempt: Transition to "Invalid_State"
Expected: 400 Bad Request
Bug Risk: Transition accepted, task enters inconsistent state
Verify: Task remains in Progress, no state change
```

**Test 7.2.2: Task Persists with Non-Existent Workflow**
```
Scenario: Workflow deleted, but task still references it
Task created under "workflow-123"
DELETE /api/workflows/workflow-123
Query: GET /api/tasks/{task_id}

Expected: Task details with warning: "Workflow not found"
Bug Risk: Task returns error, orphaned state
Better: Task should auto-migrate to default workflow
Verify: Behavior is consistent and documented
```

### 7.3 Agent Autonomy Violations

**Test 7.3.1: Hardcoded Rules Override Agent Proposal**
```
Global default: New → Progress → Done (hardcoded)
Agent proposes: New → Review → Production
Task follows agent workflow: New → Review
Query: Check task state machine

Bug Risk: System still enforces global New → Progress → Done
Expected: Task respects agent workflow, not global default
Verify: Audit log shows which workflow was applied
```

---

## Section 8: Test Execution Plan

### Phase 1: Foundation (Day 1)
- [ ] 1.1.1 Single agent baseline (< 20 min)
- [ ] 2.1 Establish latency baselines (< 30 min)
- [ ] 3.1.1 Agent proposes first workflow (< 30 min)

### Phase 2: Scale Testing (Day 2)
- [ ] 1.1.2 10 agents (< 1 hour)
- [ ] 1.1.3 100 agents (< 1 hour)
- [ ] Identify performance plateau

### Phase 3: Negotiation (Day 3)
- [ ] 4.1.1 Workflow conflicts (< 1 hour)
- [ ] 4.1.2 Voting scenarios (< 1 hour)
- [ ] 4.1.3 Delegation & quorum (< 1 hour)

### Phase 4: Emergent Behavior (Day 4)
- [ ] 5.1 Multi-agent coordination (< 1.5 hours)
- [ ] 5.2 Workflow evolution (< 1.5 hours)
- [ ] 5.3 Adversarial scenarios (< 1 hour)

### Phase 5: Stress Testing (Day 5)
- [ ] 6.1.1 100 concurrent tasks (< 45 min)
- [ ] 6.1.2 50 concurrent workflows (< 1 hour)
- [ ] 6.2 Storage limits (< 1 hour)

### Phase 6: Critical Bugs (Day 6)
- [ ] 7.1.1 Race conditions (< 1 hour)
- [ ] 7.1.2 Deregistration safety (< 1 hour)
- [ ] 7.2 Workflow gaps (< 1 hour)
- [ ] 7.3 Agent autonomy (< 1.5 hours)

---

## Section 9: Metrics & Success Criteria

### 9.1 System Latency
- [ ] P50 < 50ms for agent operations
- [ ] P95 < 120ms for agent operations
- [ ] P99 < 200ms for agent operations

### 9.2 Scalability
- [ ] 10 agents: latency increase < 1.2x
- [ ] 100 agents: latency increase < 1.8x
- [ ] 1000 agents: latency increase < 2.5x
- [ ] Identify and document plateau/inflection point

### 9.3 Workflow Management
- [ ] All workflow proposals stored successfully
- [ ] Conflict detection working (409 on collision)
- [ ] Workflow validation prevents invalid transitions
- [ ] Orphaned tasks handled gracefully

### 9.4 Agent Coordination
- [ ] Consensus quorum: < 500ms assembly
- [ ] Delegation handoff: < 200ms
- [ ] Task reassignment on agent removal: < 500ms
- [ ] No task loss or duplication

### 9.5 No Critical Regressions
- [ ] No race conditions in registration/deregistration
- [ ] No unauthorized task modifications
- [ ] Session tokens remain secure (PBKDF2, HttpOnly cookies)
- [ ] KV data consistency verified

---

## Section 10: Instrumentation & Logging

### 10.1 Timing Headers
Add to all API responses:
```
X-Processing-Time-Ms: 42
X-Agent-Query-Count: 3
X-KV-Operations: 2 (reads), 1 (writes)
X-Workflow-Validation-Ms: 8
```

### 10.2 Structured Logging
Log every operation:
```json
{
  "timestamp": "2026-03-03T15:30:45Z",
  "operation": "task_assign",
  "agent_count": 25,
  "duration_ms": 48,
  "workflow_id": "casey:devops_pipeline",
  "status": "success"
}
```

### 10.3 Real-Time Monitoring
- Dashboard: Current agent count, workflows registered, tasks in flight
- Alerts: If P95 latency > 150ms or P99 > 300ms
- Trace: Sample 1% of requests for full execution path

---

## Appendix A: Production Account Credentials

| Field | Value |
|---|---|
| Email | `andrew@upnx.asia` |
| Password | `Upnx@2019!` |
| Role | admin |
| Purpose | Testing & validation |

---

## Appendix B: Cloudflare Deployment
```
Worker:         ajb-ops-centre
Domain:         aioc.askjary.com
KV Namespace:   baa20bd090f44070ba79f34a1ebc780e
Region:         Global CDN
```

---

## Appendix C: Agentic System Principles

1. **No Hardcoded Agent List** — Agents are discovered at runtime
2. **No Hardcoded Workflow** — Each agent can propose own rules
3. **Consensus-Driven** — Conflicts resolved through agent negotiation
4. **Autonomy-First** — System enables agent decision-making, doesn't dictate
5. **Emergent Behavior** — System behavior emerges from agent interactions
6. **Scalability** — Performance degrades gracefully, not catastrophically
