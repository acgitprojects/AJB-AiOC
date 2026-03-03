# UAT (User Acceptance Testing) Documentation

This folder contains all testing documentation, test plans, results, and QA references for the AiOC (OpenClaw Common Centre) project.

---

## 📋 Quick Navigation

### Phase Test Results
- **[PHASE1_RESULTS_COMPLETE.md](PHASE1_RESULTS_COMPLETE.md)** - Auth & Session Testing (6/6 PASSED ✅)
- **[PHASE2_RESULTS_COMPLETE.md](PHASE2_RESULTS_COMPLETE.md)** - Integration Tests (11/12 PASSED ✅)
- **[PHASE3_PRODUCTION_INTEGRATION_RESULTS.md](PHASE3_PRODUCTION_INTEGRATION_RESULTS.md)** - Production diagnostics & gateway integration

### Test Plans & References
- **[TESTING_PLAN.md](TESTING_PLAN.md)** - Master testing document (150+ test cases, all phases)
- **[TESTING_PLAN_AGENTIC.md](TESTING_PLAN_AGENTIC.md)** - Agent coordination & agentic layer tests
- **[TESTING_PLAN_PRODUCTION.md](TESTING_PLAN_PRODUCTION.md)** - Production environment testing
- **[AGENT_TESTING_TIMELINE.md](AGENT_TESTING_TIMELINE.md)** - Phase 3+ agent engagement schedule with latency targets

### Execution & Tracking
- **[TESTING_EXECUTION_ROADMAP.md](TESTING_EXECUTION_ROADMAP.md)** - 8-phase daily breakdown (Mar 4-13)
- **[TEST_CASE_EXECUTION_TRACKER.md](TEST_CASE_EXECUTION_TRACKER.md)** - 150+ test case tracking with status checkboxes
- **[PHASE1_PRODUCTION_TEST_STATUS.md](PHASE1_PRODUCTION_TEST_STATUS.md)** - Production Phase 1 checklist

### QA References
- **[QA_QUICK_REFERENCE.md](QA_QUICK_REFERENCE.md)** - Quick lookup for test endpoints, credentials, environment setup
- **[QA_REFERENCE_AGENTIC.md](QA_REFERENCE_AGENTIC.md)** - Agent system QA reference (agent IDs, capabilities, workflow rules)

### Sprint Documentation
- **[SPRINT1_SECURITY_FIXES.md](SPRINT1_SECURITY_FIXES.md)** - Sprint 1 security hardening summary
- **[SPRINT2_COMPLETE_AGENTIC_LAYER.md](SPRINT2_COMPLETE_AGENTIC_LAYER.md)** - Sprint 2 agent layer completion
- **[SPRINT2_PHASE2_RATELIMIT_HEALTH.md](SPRINT2_PHASE2_RATELIMIT_HEALTH.md)** - Rate limiting & health monitoring
- **[SPRINT2_PHASE3_DELEGATION_COMPLETE.md](SPRINT2_PHASE3_DELEGATION_COMPLETE.md)** - Task delegation system

### Known Issues
- **[LOGIC_BUGS_AGENTIC.md](LOGIC_BUGS_AGENTIC.md)** - Agent coordination edge cases identified
- **[LOGIC_BUGS_IDENTIFIED.md](LOGIC_BUGS_IDENTIFIED.md)** - All bugs found during QA
- **[TEST_RESULTS_AGENTIC.md](TEST_RESULTS_AGENTIC.md)** - Detailed agentic layer test results

---

## 🎯 Current Status

### Completed ✅
- **Phase 1:** Authentication & Session (6/6 tests PASSED)
- **Phase 2:** Integration Tests (11/12 tests PASSED, 1 warning)
- **Production Diagnostics:** Complete (identified HTTP 500 issues needing CF/instance debugging)

### In Progress 🔄
- **Phase 3:** Agent Coordination & Responsiveness (ready for local dev environment)
- **Phase 4-8:** Performance, Security, Browsers, Regression

### Blocked ⚠️
- **Production Site:** HTTP 500 on login (requires Cloudflare Workers & instance debugging)
- **Remote Gateway:** Unreachable from Codespaces (likely offline or firewalled)

---

## 📊 Test Coverage

| Phase | Tests | Status | Passed | Notes |
|-------|-------|--------|--------|-------|
| Phase 1 | 6 | ✅ PASSED | 6/6 | Auth & sessions working |
| Phase 2 | 12 | ✅ PASSED | 11/12 | 1 warning (POST task = 405) |
| Phase 3 | 35+ | 🔄 Ready | — | Agent coordination (local env ready) |
| Phase 4 | 12 | ⏳ Pending | — | Performance baseline |
| Phase 5 | 14 | ⏳ Pending | — | Security testing |
| Phase 6 | 8 | ⏳ Pending | — | Cross-browser |
| Phase 7 | 6 | ⏳ Pending | — | Cloudflare Workers |
| Phase 8 | 10 | ⏳ Pending | — | Regression & sign-off |
| **Total** | **~103** | | **17/12** | **Test plan documented** |

---

## 🚀 How to Use This Folder

### For QA Engineers
1. Start with **QA_QUICK_REFERENCE.md** for environment setup
2. Review **TESTING_PLAN.md** for complete test inventory
3. Use **TEST_CASE_EXECUTION_TRACKER.md** to mark tests as you execute them
4. Consult **PHASE1/2/3_RESULTS_COMPLETE.md** for already-tested scenarios

### For Developers
1. Read **TESTING_PLAN_AGENTIC.md** to understand agent system requirements
2. Review **LOGIC_BUGS_IDENTIFIED.md** for known issues to fix
3. Check **AGENT_TESTING_TIMELINE.md** for latency targets and behavior tests
4. Use **QA_REFERENCE_AGENTIC.md** for agent IDs and capabilities

### For Project Managers
1. Review **TESTING_EXECUTION_ROADMAP.md** for overall schedule
2. Check **PHASE1/2_RESULTS_COMPLETE.md** for pass rates and risk assessment
3. Refer to **SPRINT1/2 documentation** for completion status
4. Use **TEST_CASE_EXECUTION_TRACKER.md** to monitor daily progress

---

## 🔧 Environment Setup (From QA Reference)

### Local Dev
```bash
# Start dev server
npm run dev

# Login credentials
Email: andrew@upnx.asia
Password: Upnx@2019!

# API Server (Instance B)
http://localhost:3000

# Mock Gateway
http://localhost:5000
```

### Production
```bash
# Production URL
https://aioc.askjary.com

# Same credentials (andrew@upnx.asia)

# Note: Currently returning HTTP 500 (under investigation)
```

---

## 📈 Test Execution Commands

```bash
# Phase 1: Auth tests (COMPLETED)
./run-agentic-tests.sh --phase=auth

# Phase 2: Integration tests (COMPLETED)
./run-agentic-tests.sh --phase=integration

# Phase 3: Agent coordination (READY)
./run-agentic-tests.sh --phase=agent-coordination

# All phases (sequential)
./run-agentic-tests.sh --all
```

---

## 🎓 Key Metrics & Targets

### Performance Targets (From AGENT_TESTING_TIMELINE.md)
- Agent registration: < 20ms P50
- Health detection: < 2min online, < 5min offline/crashed
- Chat responsiveness: < 200ms P50
- Workflow validation: < 40ms
- Consensus calculation: < 50ms per round
- Task delegation: < 100ms state change

### Security Requirements (From TESTING_PLAN.md)
- ✅ HttpOnly cookies for session protection
- ✅ SameSite=lax for CSRF prevention
- ✅ PBKDF2 password hashing (NIST approved)
- ✅ 32+ character session secrets
- ✅ Rate limiting: 100/min, 500/hour, 10K/day per agent

### Availability Goals
- Dashboard load: < 500ms
- API endpoints: < 200ms P95
- Chat latency: < 500ms end-to-end (local)
- Gateway uptime: 99.9% (production)

---

## 📞 Resources

- **GitHub:** https://github.com/acgitprojects/AJB-AiOC (branch: production)
- **OpenClaw Docs:** https://github.com/openclaw/openclaw
- **Integration Guide:** [docs/INTEGRATION.md](../docs/INTEGRATION.md)
- **API Server:** [api-server/README.md](../api-server/README.md)

---

## 📝 Recent Changes

**Last Update:** March 3, 2026

- ✅ Phase 1 execution complete (auth tests)
- ✅ Phase 2 execution complete (integration tests)
- ✅ Production diagnostics complete (issues identified)
- ✅ Agent testing timeline created
- ✅ All testing docs organized into UAT folder

**Next:** Proceed with Phase 3 (local or production) or debug production issues.

---

**Maintained by:** QA & Development Team  
**Last Reviewed:** March 3, 2026  
**Version:** Phase 3 Ready
