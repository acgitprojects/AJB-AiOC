# AiOC Agentic System - Quick Reference & Testing Lookup

**Production Deployment:**
- **URL:** https://aioc.askjary.com
- **Account:** andrew@upnx.asia / `Upnx@2019!`
- **KV ID:** baa20bd090f44070ba79f34a1ebc780e
- **Worker:** ajb-ops-centre

---

## Quick Links to Testing Docs

| Document | Purpose | File |
|----------|---------|------|
| **Agentic Testing Plan** | Comprehensive test scenarios for agentic paradigm | `TESTING_PLAN_AGENTIC.md` |
| **Agentic Bugs** | Critical bugs impacting agent autonomy & coordination | `LOGIC_BUGS_AGENTIC.md` |
| **Legacy Plan** | Original production testing (fixed-agent model) | `TESTING_PLAN_PRODUCTION.md` |
| **Legacy Bugs** | General logic bugs | `LOGIC_BUGS_IDENTIFIED.md` |

---

## System Latency Targets (All System Time, No Network)

```
Operation                    Target P50   Target P95   Target P99
────────────────────────────────────────────────────────────────
Agent registration           < 20ms       < 50ms       < 100ms
Task creation                < 30ms       < 80ms       < 150ms
Workflow proposal validation < 40ms       < 100ms      < 180ms
Agent negotiation round      < 50ms       < 120ms      < 200ms
KV read (user/task/agent)    < 10ms       < 30ms       < 60ms
────────────────────────────────────────────────────────────────
```

---

## Scalability Benchmarks

| Agent Count | Expected Latency Change | Key Metric |
|------------|------------------------|-----------|
| 1 agent | Baseline | — |
| 10 agents | +20% max | P95 < 60ms |
| 100 agents | +80% max | P95 < 144ms |
| 1000 agents | +150% max | P95 < 200ms (target) |

**Pass Criteria:** Latency increases < 2.5x at 1000x scale

---

## Critical Failures to Catch (4 Must-Fix Bugs)

### 🔴 BUG-AG-001: No Agent Registration Endpoint
```
Missing: POST /api/agents
Impact: Agents cannot join system dynamically
Test: curl -X POST http://localhost:3000/api/agents -d '{...}'
Expected: 201 Created or 40x if endpoint missing
Status: 🔴 ENDPOINT MISSING
```

### 🔴 BUG-AG-002: No Workflow Proposal Endpoint
```
Missing: POST /api/workflows
Impact: No workflow negotiation possible
Test: Agent proposes workflow → System rejects (no endpoint)
Status: 🔴 ENDPOINT MISSING
```

### 🔴 BUG-AG-003: Task Mutations Lost (Stateless Workers)
```
File: app/api/tasks/[id]/route.ts
Problem: MY_TASKS in-memory array resets each request
Test: PATCH /api/tasks/123 → refresh → data lost
Status: 🔴 DATA LOSS
Fix: Use KV namespace
```

### 🔴 BUG-AG-004: No Auth on Task Routes
```
File: app/api/tasks/[id]/route.ts
Problem: PATCH /api/tasks/123 works without login
Test: curl -X PATCH http://localhost:3000/api/tasks/123
Expected: 401 Unauthorized
Status: 🔴 UNAUTHORIZED ACCESS
```

---

## Test Execution Phases

### Phase 1: Agent Registry (2 hours)
- [ ] 1.1.1 Single agent baseline
- [ ] 1.1.2 10 agents concurrent registration
- [ ] 1.1.3 100 agents scaling test
- [ ] Measure latency at each level

### Phase 2: System Latency (1.5 hours)
- [ ] Baseline measurements: create, assign, negotiate
- [ ] Load test: 100 concurrent requests
- [ ] Verify P50/P95/P99 targets met

### Phase 3: Workflows & Negotiation (2 hours)
- [ ] Agent proposes workflow
- [ ] System validates transitions
- [ ] Two agents propose conflicts → detect & report
- [ ] Three agents vote on priority

### Phase 4: Agent Coordination (1.5 hours)
- [ ] Delegation handoff (agent → agent)
- [ ] Quorum decisions (majority voting)
- [ ] Agent joins mid-task → workflow evolution
- [ ] Agent goes offline → task reassignment

### Phase 5: Scalability & Stress (2 hours)
- [ ] 100 tasks created simultaneously
- [ ] 50 concurrent workflow proposals
- [ ] 1000 agents in registry
- [ ] Identify performance plateau

### Phase 6: Critical Bugs (2 hours)
- [ ] Race condition in registration
- [ ] Data consistency after crashes
- [ ] Workflow cycle & unreachable state detection
- [ ] Rate limiting on adversarial agent

**Total Time:** ~12 hours (can parallelize some phases)

---

## Agentic System Principles (What to Test)

1. **No Fixed Agent Roster** ✓ Test: System handles 1, 10, 100, 1000 agents
2. **No Hardcoded Workflow** ✓ Test: Each agent proposes own state machine
3. **Consensus-Driven** ✓ Test: Two agents vote, system respects majority
4. **Agent Autonomy** ✓ Test: Agents decide tasks→agents, not human UI
5. **Emergent Behavior** ✓ Test: New agent joins → workflow evolves
6. **Graceful Degradation** ✓ Test: At 1000 agents, latency ∝ log²(N), not O(N)

---

## Real Device Testing Checklist

**What to Test Physically:**
- [ ] Open aioc.askjary.com in Safari on iPhone 14
- [ ] Log in (verify SSL cert valid for askjary.com)
- [ ] Create task → assign to agent → complete
- [ ] Scroll chat history smoothly (60fps)
- [ ] Check browser DevTools: X-Processing-Time header exists
- [ ] Measure: Chat send → response < 500ms (including network)

**What NOT to Test (Network-Dependent):**
- Don't test network throttle (Slow 4G) — agent system is independent of network
- Do test: System latency via X-Processing-Time header

---

## API Endpoints Summary

**Must Exist for Agentic System:**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| /api/agents | POST | Register new agent | 🔴 Missing |
| /api/agents | GET | List all agents | 🔴 Missing |
| /api/agents/{id} | DELETE | Agent deregistration | 🔴 Missing |
| /api/workflows | POST | Agent proposes workflow | 🔴 Missing |
| /api/workflows | GET | Query available workflows | 🔴 Missing |
| /api/tasks/{id}/delegate | POST | Hand off to another agent | 🔴 Missing |
| /api/consensus/vote | POST | Agent votes on decision | 🔴 Missing |
| /api/tasks/{id} | GET | Get task (auth required) | ✅ Exists |
| /api/tasks/{id} | PATCH | Update task (auth missing!) | ⚠️  Exists but broken |
| /api/auth/login | POST | Authenticate | ✅ Exists |

**Total Status:** 6 critical missing endpoints for agentic system

---

## Instrumentation & Observability

**Add These Headers to All Responses:**
```
X-Processing-Time-Ms: 42
X-Agent-Query-Count: 3  
X-KV-Operations: 2 (reads), 1 (writes)
X-Workflow-Validation-Ms: 8
```

**Log Template:**
```json
{
  "timestamp": "2026-03-03T15:30:45Z",
  "operation": "task_assign",
  "agent_count": 25,
  "duration_ms": 48,
  "workflow_id": "agent:casey:devops",
  "status": "success"
}
```

---

## Debugging Guide

**Q: "Why is task assignment latency slow?"**
A: Check X-Processing-Time header
- If > 100ms: Look at X-Agent-Query-Count (too many agent lookups?)
- If > 80ms: Check X-KV-Operations (too many KV calls?)

**Q: "Why do agents report different task status?"**
A: DATA LOSS BUG (BUG-AG-003)
- Tasks stored in-memory MY_TASKS
- Check:```
- Agent A reads task → status = "Done"
- Worker restarts
- Agent B reads task → status = "New" (from re-import)
- Fix: Use KV for persistence
```

**Q: "Can I modify tasks without logging in?"**
A: AUTH BUG (BUG-AG-004)
- Try: `curl -X PATCH aioc.askjary.com/api/tasks/123`
- If succeeds: Authorization missing!
- Fix: Add session check before PATCH

---

## Critical Questions to Answer

Before deployment, answer these:

1. **Agent Registration:** Can system handle agents joining simultaneously? (Race condition safe?)
2. **Workflow Conflicts:** Does system detect when two agents propose incompatible workflows?
3. **Consensus:** If 3 agents vote on priority, does system respect majority decision?
4. **Latency:** What is P95 latency with 100 concurrent agents?
5. **Persistence:** If server crashes, are all tasks/workflows preserved in KV?
6. **Security:** Can anonymous user modify tasks? Or vote on decisions?
7. **Rate Limit:** Can rogue agent spam 1000 API calls/second without throttling?
8. **Scalability:** What's the inflection point where performance degrades? (100? 1000? 10000 agents?)

**Answers:**
1. [ ] Yes - checked race conditions
2. [ ] Yes - tested conflict detection
3. [ ] Yes - verified consensus mechanism
4. [ ] Measured: P95 = ___ ms
5. [ ] Yes - KV persistence verified
6. [ ] No - auth enforced
7. [ ] No - rate limiting active
8. [ ] Inflection at: ___ agents

---

## Pre-Deployment Checklist

- [ ] All 6 missing endpoints implemented
- [ ] All 4 critical bugs fixed (no data loss, auth enforced)
- [ ] Agent registration race-condition safe
- [ ] Workflow validation prevents cycles/unreachable states
- [ ] Rate limiting blocks spam agents
- [ ] Latency targets met: P95 < 120ms at 100 agents
- [ ] Audit trail created for all agent actions
- [ ] Demo mode off in production
- [ ] Session secret 32+ chars (enforced at startup)
- [ ] KV namespace configured & tested

