# Agent Testing Timeline - When & What

**Current Status:** Phase 1-2 COMPLETE (Authentication & Production API integration)

---

## 🎯 Agent Engagement, Responsiveness & Behavior Testing Schedule

### **Phase 3: Agent Coordination & Responsiveness** (March 7-8)
**⏰ Starting in ~4 days in the official roadmap**

This is where **agent engagement, behavior, and responsiveness** will be thoroughly tested:

#### **3.1 Agent Registration & Lifecycle**
- ✅ Register new agents dynamically
- ✅ Test agent discovery
- ✅ Verify agent capabilities advertisement
- ⏱️ **Measure:** Agent registration latency (target: < 20ms)

#### **3.2 Agent Health Monitoring & Responsiveness**
- ✅ Test heartbeat mechanism (agents proving they're alive)
- ✅ Monitor agent status transitions: online → offline → crashed
- ⏱️ **Measure:** Health check latency, status update delays
- ⏱️ **Responsiveness:** How quickly system detects agent failures
- **Timeline:** Online (< 2s), Offline (2-5min detection), Crashed (> 5min detection)

#### **3.3 Agent Messaging & Chat Interaction**
From Phase 2, we already tested:
```
✅ POST /api/chat - Send message to agent
✅ GET /api/agents - List all agents
Response time: 276-302ms average (good for development)
```

Phase 3 will extend this with:
- Agent response time tracking (how fast agent replies)
- Message queue handling
- Concurrent agent interactions
- Error handling & retry logic

#### **3.4 Workflow Negotiation (Agent Behavior)**
- ✅ Agents propose workflows with custom rules
- ✅ System validates workflow correctness (cycle detection, reachability)
- ✅ Multiple agents negotiate shared state
- **Measure:** Workflow validation latency, consensus building time

#### **3.5 Consensus Voting (Multi-Agent Behavior)**
- ✅ Cast votes on proposals (AGREE/DISAGREE/ABSTAIN)
- ✅ Track consensus: PASSED (≥51% agree), REJECTED, PENDING
- **Test Agent Behavior:** Do agents vote correctly? Are results aggregated properly?

#### **3.6 Task Delegation (Agent Coordination)**
- ✅ Propose task delegation to another agent
- ✅ Accept/reject proposals
- ✅ Track delegation lifecycle
- **Measure:** Time from proposal to acceptance/rejection

---

## 📊 What Gets Tested - Detailed Breakdown

### Agent Engagement Tests (Phase 3)

| Test | Focus | Measures | Timeline |
|------|-------|----------|----------|
| **Agent Registration** | Can agents self-register? | Registration latency, uniqueness, capabilities | < 20ms per agent |
| **Heartbeat Reception** | Do agents stay connected? | Heartbeat latency, update frequency | Every 30s nominal |
| **Health Status** | System knows agent state? | Online/offline/crashed detection time | 0-5 min depending on state |
| **Chat Messaging** | Agent receives & responds? | Message delivery, response time, queue handling | < 200ms end-to-end (local) |
| **Workflow Acceptance** | Agent validates workflows? | Validation logic, cycle detection | < 40ms |
| **Voting Participation** | Agent votes on proposals? | Vote counting, consensus calculation | < 50ms per vote round |
| **Delegation Handling** | Agent accepts tasks? | Proposal, acceptance, rejection tracking | < 100ms per state change |

### Responsiveness Metrics (Phase 3 Extensions)

```
Agent Registration:     P50: 20ms   P95: 50ms    P99: 100ms
Agent Discovery:        P50: 10ms   P95: 30ms    P99: 60ms
Heartbeat Processing:   P50: 5ms    P95: 20ms    P99: 50ms     (per heartbeat)
Task Assignment:        P50: 30ms   P95: 80ms    P99: 150ms
Workflow Validation:    P50: 40ms   P95: 100ms   P99: 180ms
Voting Round:           P50: 50ms   P95: 120ms   P99: 200ms
```

### Behavior Tests (Phase 3)

1. **Registration Behavior**
   - Does agent appear in registry immediately?
   - Can second agent with same ID register? (should be prevented)
   - Are capabilities indexed for matching?

2. **Health Behavior**
   - Does heartbeat reset "online" status?
   - Does ~2-min no-heartbeat mark as "offline"?
   - Does ~5-min no-heartbeat mark as "crashed"?
   - Are critical agents logged/alerted?

3. **Chat Behavior**
   - Does agent receive message?
   - Is response routed back to initiator?
   - Are RunIDs tracked for correlation?
   - What happens if agent is offline? (error handling)

4. **Coordination Behavior**
   - Do agents propose workflows correctly?
   - Are cycles detected and rejected?
   - Can agents negotiate rules?
   - Is consensus calculated correctly (≥51% threshold)?

5. **Delegation Behavior**
   - Does target agent receive proposal?
   - Can agent accept/reject?
   - Is original owner notified?
   - Does task transfer or stay with original?

---

## Timeline: When Each Agent Feature Tested

```
Week 1 (Mar 3-6):
  ✅ Phase 1: Auth (DONE)
  ✅ Phase 2: Production APIs (DONE)

Week 2 (Mar 7-13):
  🔲 Phase 3: Agent Coordination & Responsiveness (NEXT - THIS PHASE)
     - Agent registration & lifecycle
     - Health monitoring & responsiveness
     - Chat & messaging behavior
     - Workflow negotiation
     - Consensus voting
     - Task delegation
  
  🔲 Phase 4: Performance (latency targets, memory, bundle size)
  🔲 Phase 5: Security (CORS, auth bypass, rate limits)
  🔲 Phase 6: Cross-browser (Chrome, Firefox, Safari)
  🔲 Phase 7: CF Workers (KV persistence, asset serving)
  🔲 Phase 8: Regression & sign-off
```

---

## Quick Reference: Agent Test Cases (Phase 3)

**All test cases from [TESTING_PLAN.md](TESTING_PLAN.md) Section 5:**

### Agent Tests (35+ test cases)
- **TC-AGENT-001-004:** Agent registration & rate limits
- **TC-HEALTH-001-005:** Health monitoring & status transitions
- **TC-HB-001-004:** Heartbeat endpoint behavior
- **TC-RATELIMIT-001-004:** Rate limit tracking per agent
- **TC-WORKFLOW-001-005:** Workflow validation & negotiation
- **TC-VOTE-001-007:** Consensus voting & agreement calculation
- **TC-DELEGATE-001-005:** Task delegation & acceptance

---

## How to Run Phase 3 When Ready

```bash
# Phase 3: Agent Coordination Tests
./run-agentic-tests.sh --phase=agent-coordination

# Or manually run specific agent test
./run-agentic-tests.sh --test=TC-AGENT-001

# Watch agent registration & health logs
tail -f ./logs/agent-health.log
```

---

## Agent Engagement Scenarios (Phase 3 What-If)

### Scenario 1: Single Agent Does Work
```
1. Agent "alice" registers  → 15ms
2. System records alice: online
3. User sends chat message  → 250ms round-trip
4. Alice processes & replies → 180ms response time
5. Total engagement: ~450ms (acceptable for demo mode)
```

### Scenario 2: Agent Delegation
```
1. Alice proposes task to bob   → 50ms
2. Bob receives notification    → 30ms
3. Bob accepts               → 40ms
4. Alice notified of acceptance → 20ms
Total coordination: ~140ms
```

### Scenario 3: Multi-Agent Consensus  
```
1. System proposes "close ticket"
2. Alice votes AGREE         → 45ms
3. Bob votes AGREE           → 48ms
4. Carol votes ABSTAIN       → 42ms
5. Consensus calculated: PASSED (2/2) → 10ms
Total negotiation: ~245ms
```

---

## Expected Results (Phase 3 Goals)

| Metric | Target | Success Criteria |
|--------|--------|------------------|
| Agent registration latency | < 20ms P50 | Pass if: *most* registrations < 20ms |
| Health check detection | < 2min online, < 5min offline/crashed | Pass if: status transitions within windows |
| Chat responsiveness | < 200ms P50 | Pass if: 50% of chats reply in < 200ms |
| Workflow validation | < 40ms | Pass if: cycles detected & rejected within 40ms |
| Consensus calculation | < 50ms per round | Pass if: voting + aggregation < 50ms |
| Rate limiting | 429 after threshold | Pass if: 100/min limit enforced exactly |

---

## Summary: Agent Engagement Testing Path

✅ **Phase 1-2 (Done):** User authentication & API endpoints work  
🔜 **Phase 3 (Next):** Agent life cycle, health, messaging, coordination  
   - You'll see: Agent registration, heartbeats, voting, delegation
   - You'll measure: Agent response times, consensus speed, coordination latency
   - You'll verify: Agents behave as expected (vote, accept tasks, stay alive)

📈 **Phase 4-8 (Later):** Performance, security, browsers, regression

---

**Ready to proceed to Phase 3?** Agent engagement testing will be the deepest dive into agent behavior so far!
