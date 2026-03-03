# AiOC Testing Execution Roadmap
**Generated:** March 3, 2026  
**Status:** Ready for Phase 1 Execution  
**Target Completion:** March 13, 2026  

---

## Executive Summary

This document outlines the **daily testing execution roadmap** for rolling out the comprehensive testing plan (TESTING_PLAN.md). It provides:

- ✅ **Phase breakdown** by day with specific test categories
- ✅ **Success criteria** for each phase
- ✅ **Resource requirements** (tools, access, accounts)
- ✅ **Execution checklist** for QA team
- ✅ **Risk mitigation** strategies

---

## 📅 Testing Schedule (10 Working Days)

### Phase 1: Unit Tests & Authentication (March 4)
**Duration:** 1 day  
**Scope:** Auth flows, password hashing, demo mode logic  
**Owner:** QA Lead  

**Tests to Execute:**
- [ ] TC-AUTH-001: Production Account Login
- [ ] TC-AUTH-002: Demo Account Login (Admin)
- [ ] TC-AUTH-003: Demo Account Login (User Role)
- [ ] TC-AUTH-004: Invalid Credentials
- [ ] TC-AUTH-005: Session Persistence
- [ ] TC-AUTH-006: Logout
- [ ] TC-AUTH-007: Password Reset Link (Expired Token)
- [ ] TC-AUTH-008: Unauthorized Route Access
- [ ] TC-SEC-AUTH-001: Session Hijacking (XSS Prevention)
- [ ] TC-SEC-AUTH-002: CSRF Protection
- [ ] TC-SEC-AUTH-003: Session Cookie Flags

**Success Criteria:**
- ✅ All authentication endpoints return correct status codes
- ✅ Session cookies have HttpOnly, Secure, SameSite flags
- ✅ Invalid credentials rejected (< 2s)
- ✅ Demo mode correctly identified and mocks applied
- ✅ No XSS vulnerabilities in auth forms

**Acceptance Tests:**
```bash
# Run authentication tests
./scripts/test-auth.sh

# Expected output:
# ✓ PASS: Production login (andrew@upnx.asia)
# ✓ PASS: Demo login (demo-admin@example.com)
# ✓ PASS: Session persistence across reload
# ✓ PASS: XSS payload sanitized
```

**Deliverable:**
- Test results report: `PHASE1_AUTH_RESULTS_Mar04.md`

---

### Phase 2: Integration Tests (March 5-6)
**Duration:** 2 days  
**Scope:** API endpoints, demo/prod flows, gateway mocking  
**Owner:** QA Lead + Dev  

**Tests to Execute:**

**Day 1 - Authentication & Data Endpoints:**
- [ ] TC-DASH-001: Dashboard Load with Real Gateway
- [ ] TC-DASH-002: Dashboard Load with Demo Mode (no timeout errors)
- [ ] TC-DASH-003: Sidebar Gateway Status Dot
- [ ] TC-DASH-004: Navigation Links from Dashboard
- [ ] TC-DASH-005: Mobile Sidebar Drawer
- [ ] TC-TASK-001 to TC-TASK-006: Task CRUD operations
- [ ] TC-BOARD-001 to TC-BOARD-003: Board endpoints
- [ ] TC-BRIEF-001 to TC-BRIEF-004: Briefing generation (demo mode)
- [ ] TC-CAL-001 to TC-CAL-002: Calendar endpoints
- [ ] TC-CHAT-001 to TC-CHAT-004: Chat interface & API

**Day 2 - Admin & Integrations:**
- [ ] TC-INTEG-001 to TC-INTEG-005: Integrations page & gateway status
- [ ] TC-ADMIN-001 to TC-ADMIN-004: Admin users page & authorization
- [ ] TC-PROF-001 to TC-PROF-005: Profile & settings
- [ ] API endpoint validation (Section 4.1-4.3): All 20 core endpoints

**Success Criteria:**
- ✅ Dashboard loads < 2s (LCP measured)
- ✅ **No "timeout errors" in demo mode** (CRITICAL)
- ✅ All API endpoints return correct HTTP status codes
- ✅ API responses match expected JSON schema
- ✅ Gateway status banner reflects actual/mocked state
- ✅ Task list filters work correctly
- ✅ No 500 errors in production mode

**Acceptance Tests:**
```bash
# Run API integration tests
./run-agentic-tests.sh

# Expected output:
# Phase 2: Integration Tests - March 5-6
# ✓ GET /api/tasks (200, correct schema)
# ✓ POST /api/chat (202, runId returned)
# ✓ GET /api/openclaw/status (demo: instant response, no timeout)
# ✓ GET /api/agents (200, agents online in demo)
# ✓ Dashboard LCP: 1.8s (under 2s target)
```

**Deliverable:**
- Integration test report: `PHASE2_INTEGRATION_RESULTS_Mar05-06.md`

---

### Phase 3: Sprint 2 Phase 2 Agent Tests (March 7-8)
**Duration:** 1.5 days  
**Scope:** Rate limiting, health monitoring, heartbeat, workflows, consensus, delegation  
**Owner:** Dev + QA  

**Tests to Execute:**

**Day 1 - Agent Registration & Rate Limiting:**
- [ ] TC-AGENT-001: Register New Agent
- [ ] TC-AGENT-002: Rate Limit on Agent Registration (Minute Tier)
- [ ] TC-AGENT-003: Rate Limit Recovery After Window
- [ ] TC-AGENT-004: Custom Rate Limits Per Agent
- [ ] TC-HEALTH-001 to TC-HEALTH-005: Agent health monitoring
- [ ] TC-HB-001 to TC-HB-004: Heartbeat endpoint
- [ ] TC-RATELIMIT-001 to TC-RATELIMIT-004: Rate limit status

**Day 2 - Workflows & Consensus:**
- [ ] TC-WORKFLOW-001 to TC-WORKFLOW-005: Workflow validation & coordination
- [ ] TC-VOTE-001 to TC-VOTE-007: Consensus voting system
- [ ] TC-DELEGATE-001 to TC-DELEGATE-005: Task delegation

**Success Criteria:**
- ✅ Agent registration succeeds (201 Created)
- ✅ Rate limiting enforced at minute/hour/day tiers
- ✅ Heartbeat updates agent health status correctly
- ✅ Health states transition: online → offline (2min) → crashed (5min)
- ✅ Workflow cycle detection prevents invalid state machines
- ✅ Consensus voting calculates majority correctly (≥51%)
- ✅ Task delegation proposal tracking works end-to-end
- ✅ No 429 errors suppressed (rate limits visible to client)

**Acceptance Tests:**
```bash
# Run agentic tests
./run-agentic-tests.sh --phase=agent-coordination

# Expected output:
# Phase 3: Agent Coordination - March 7-8
# ✓ POST /api/agents (201, agent registered)
# ✓ Rate limit enforced (100/min, 500/hour, 10K/day)
# ✓ POST /api/agents/{id}/heartbeat (200, no auth required)
# ✓ GET /api/agents/{id}/health (200, status online/offline/crashed)
# ✓ POST /api/workflows (201, cycle detected if invalid)
# ✓ POST /api/consensus/vote (200, consensus calculated)
# ✓ POST /api/tasks/{id}/delegate (200, delegation proposed)
```

**Deliverable:**
- Agent coordination test report: `PHASE3_AGENT_TESTS_RESULTS_Mar07-08.md`

---

### Phase 4: Performance Tests (March 9)
**Duration:** 1 day  
**Scope:** Lighthouse, API response times, memory, rate limit overhead  
**Owner:** QA Lead + DevOps  

**Tests to Execute:**
- [ ] TC-DASH-001: Dashboard LCP < 2s (Lighthouse audit, Slow 3G)
- [ ] TC-LOGIN-001: Login page FCP < 1.5s
- [ ] TC-TASKS-001: Tasks page LCP < 2s
- [ ] TC-INTEG-001: Integrations page LCP < 2s
- [ ] API response time benchmarks (Postman collection)
  - [ ] `/api/openclaw/status` < 100ms
  - [ ] `/api/agents` < 500ms
  - [ ] `/api/dashboard/stats` < 500ms
  - [ ] `/api/chat` POST < 200ms
- [ ] Memory profiling (100 messages)
- [ ] Bundle size analysis (gzipped < 200KB)

**Success Criteria:**
- ✅ Lighthouse Performance Score ≥ 90
- ✅ FCP (First Contentful Paint) < 1.5s
- ✅ LCP (Largest Contentful Paint) < 2s
- ✅ CLS (Cumulative Layout Shift) < 0.1
- ✅ All API endpoints meet target latency
- ✅ Memory usage < 50MB idle, < 100MB after 100 messages
- ✅ JS bundle < 200KB gzipped

**Acceptance Tests:**
```bash
# Run performance tests
npm run lighthouse --throttle=slow-3g

# Run Postman performance collection
postman run AiOC-Performance.json --environment=${BASE_URL}

# Expected output:
# Lighthouse Audit Results:
# ✓ Performance Score: 92 (target: ≥90)
# ✓ FCP: 1.2s (target: <1.5s)
# ✓ LCP: 1.8s (target: <2s)
#
# API Latency Benchmarks:
# ✓ /api/openclaw/status: avg 45ms (target: <100ms)
# ✓ /api/agents: avg 380ms (target: <500ms)
# ✓ /api/chat POST: avg 180ms (target: <200ms)
```

**Deliverable:**
- Performance report: `PHASE4_PERFORMANCE_RESULTS_Mar09.md`
- Lighthouse audit HTML: `lighthouse-report-Mar09.html`
- Memory profiles: `memory-profiles/`

---

### Phase 5: Security Tests (March 10)
**Duration:** 1 day  
**Scope:** CORS, CSP, auth bypass, rate limit edge cases  
**Owner:** Security Lead + QA  

**Tests to Execute:**
- [ ] TC-SEC-AUTH-001 to TC-SEC-AUTH-004: Authentication security
- [ ] TC-SEC-DATA-001 to TC-SEC-DATA-003: Data privacy & authorization
- [ ] TC-SEC-NET-001 to TC-SEC-NET-003: Network security (HTTPS, CORS, headers)
- [ ] Brute force testing (rate limiting)
- [ ] SQL/NoSQL injection tests
- [ ] XSS payload testing (stored & reflected)

**Success Criteria:**
- ✅ Session cookies have HttpOnly, Secure, SameSite flags
- ✅ CORS restricts to intended origins only
- ✅ CSP header present, no unsafe-inline
- ✅ X-Frame-Options: DENY (prevent clickjacking)
- ✅ No plaintext passwords in logs/responses
- ✅ XSS payloads sanitized or escaped
- ✅ Rate limiting prevents brute force (429 after threshold)
- ✅ HTTPS enforced (no HTTP access)

**Acceptance Tests:**
```bash
# Security vulnerability scan
./scripts/security-scan.sh

# Expected output:
# Security Test Results - March 10
# ✓ HTTPS enforced (no HTTP fallback)
# ✓ Session cookie flags: HttpOnly=true, Secure=true, SameSite=Strict
# ✓ CSP header: frame-ancestors 'none'
# ✓ XSS payload sanitized: <script>alert('xss')</script> → [escaped]
# ✓ Brute force protected: 429 after 5 failed attempts
# ✓ CORS: Allowed origins = [https://aioc.askjary.com]
```

**Deliverable:**
- Security audit report: `PHASE5_SECURITY_RESULTS_Mar10.md`
- OWASP Top 10 checklist: `OWASP_Compliance_Mar10.md`

---

### Phase 6: Cross-Browser & Responsive (March 11)
**Duration:** 1 day  
**Scope:** Chrome, Firefox, Safari, Edge + mobile, tablet, desktop  
**Owner:** QA Team  

**Tests to Execute:**
- [ ] Desktop (> 1024px): Chrome 130, Firefox 131, Safari 17, Edge 131
- [ ] Tablet (768-1024px): iPad landscape + portrait
- [ ] Mobile (< 768px): iPhone 14/15, Android 14+
- [ ] All test pages: login, dashboard, tasks, board, briefing, calendar, agent, integrations, profile
- [ ] Responsive features: hamburger menu, sidebar drawer, touch interactions

**Success Criteria:**
- ✅ All pages render correctly on Chrome, Firefox, Safari, Edge
- ✅ No console errors on any browser
- ✅ Mobile layout (< 768px): hamburger menu visible, no horizontal scroll
- ✅ Buttons tap-friendly (≥ 44px), text readable
- ✅ Touch interactions responsive (no lag)
- ✅ Tablet layout: sidebar toggles at 768px breakpoint
- ✅ Desktop layout: full sidebar visible, expand on hover

**Acceptance Tests:**
```bash
# Run cross-browser tests (BrowserStack or local)
./scripts/test-browsers.sh

# Expected output:
# Cross-Browser Test Results - March 11
# ✓ Chrome 130: All 10 pages pass (no console errors)
# ✓ Firefox 131: All 10 pages pass
# ✓ Safari 17: All 10 pages pass
# ✓ Edge 131: All 10 pages pass
# ✓ Mobile (390px): Hamburger menu visible, responsive drawer works
# ✓ Tablet (800px): Content centered, sidebar toggleable
# ✓ Desktop (1440px): Full sidebar, hover expand works
```

**Deliverable:**
- Cross-browser report: `PHASE6_CROSSBROWSER_RESULTS_Mar11.md`
- Screenshots: `screenshots/`

---

### Phase 7: Cloudflare Workers Tests (March 12)
**Duration:** 1 day  
**Scope:** KV ops, asset serving, worker logs, agent data persistence  
**Owner:** DevOps + QA  

**Tests to Execute:**
- [ ] TC-CF-KV-001 to TC-CF-KV-003: KV namespace operations (read/write/index)
- [ ] TC-CF-PERF-001 to TC-CF-PERF-003: Worker performance, geography routing, logs
- [ ] TC-CF-ASSET-001 to TC-CF-ASSET-002: Static asset caching & freshness
- [ ] Verify KV keys exist: `users_*`, `sessions_*`, `agents_*`, `workflows_*`
- [ ] Check Cloudflare worker logs for errors

**Success Criteria:**
- ✅ User data persisted in KV across worker restarts
- ✅ Session cookies survive worker redeployment
- ✅ KV index (`users_index`, `agents_index`) consistent with records
- ✅ Cold start time < 50ms
- ✅ Geographic latency < 200ms from any region
- ✅ No 500-level errors in worker logs
- ✅ Static assets cached (Cache-Control headers correct)
- ✅ New assets fetched after deployment (no stale assets)

**Acceptance Tests:**
```bash
# Test KV persistence
curl -H "Cookie: $SESSION_COOKIE" https://aioc.askjary.com/api/users/me
# Expected: User data returned (KV read success)

# Check worker logs
wrangler tail --env=production
# Expected: No errors, clean logs

# Verify asset caching
curl -I https://aioc.askjary.com/_next/static/...
# Expected: Cache-Control: public, max-age=31536000
```

**Deliverable:**
- Cloudflare workers report: `PHASE7_CF_WORKERS_RESULTS_Mar12.md`
- KV consistency audit: `KV_CONSISTENCY_AUDIT_Mar12.json`

---

### Phase 8: Regression & Sign-Off (March 13)
**Duration:** 1 day  
**Scope:** Full flows, smoke tests, agent coordination, final QA  
**Owner:** QA Team + Dev Lead  

**Tests to Execute:**
- [ ] TC-REG-001: Full Authentication Flow
- [ ] TC-REG-002: Full Demo Mode Flow
- [ ] TC-REG-003: Full Production Mode Flow (if gateway available)
- [ ] Smoke tests (all 10 pages load, no 5xx errors)
- [ ] Agent coordination end-to-end (register → heartbeat → health check → vote → delegate)
- [ ] Critical bug regression: Verify LOGIC_BUGS_IDENTIFIED.md fixes remain fixed
- [ ] Sign-off checklist

**Success Criteria (PASS Criteria from TESTING_PLAN.md):**
- ✅ All authentication flows work (production + demo)
- ✅ No "timeout" errors in demo mode
- ✅ Dashboard loads < 2s
- ✅ API endpoints return correct schema
- ✅ Gateway status reflects actual state
- ✅ Security headers present
- ✅ No console errors
- ✅ Mobile responsive (< 768px)
- ✅ Cross-browser compatible
- ✅ KV persistence working
- ✅ Rate limiting enforced (429 after limit)
- ✅ Agent health monitoring works (online/offline/crashed)
- ✅ Heartbeat endpoint accessible without auth
- ✅ Workflow validation prevents cycles
- ✅ Consensus voting calculates majority correctly
- ✅ Task delegation proposal tracking working

**Acceptance Tests:**
```bash
# Run full regression suite
./scripts/regression-suite.sh

# Expected output:
# Regression Test Results - March 13
# ✓ PASS: Authentication Flow (login → dashboard → logout)
# ✓ PASS: Demo Mode Flow (no timeout errors)
# ✓ PASS: Production Mode Flow
# ✓ PASS: Smoke Tests (10 pages + no 5xx errors)
# ✓ PASS: Agent Coordination E2E
# ✓ PASS: Rate Limiting Enforced
# ✓ PASS: Critical Bugs Fixed
#
# Overall Status: ✅ READY FOR PRODUCTION
```

**Sign-Off Checklist:**
- [ ] QA Lead: All phases completed, no blockers
- [ ] Dev Lead: No critical bugs, code review complete
- [ ] Product Manager: Feature scope met, business goals satisfied
- [ ] DevOps: Deployment ready, monitoring in place

**Deliverable:**
- Final regression report: `PHASE8_REGRESSION_RESULTS_Mar13.md`
- Sign-off document: `SIGN_OFF_APPROVAL_Mar13.md`
- Executive summary: `TESTING_FINAL_REPORT_Mar4-13.md`

---

## 🛠️ Resource Checklist

### Required Access & Credentials

| Resource | Status | Notes |
|----------|--------|-------|
| Production URL | ✅ https://aioc.askjary.com | Live deployment |
| Production Account | ✅ andrew@upnx.asia / Upnx@2019! | Admin account |
| Demo Accounts | ✅ demo-admin@example.com, demo-user@example.com | Pre-configured |
| Cloudflare Dashboard | ✅ Workers KV namespace ID: baa20bd090f44070ba79f34a1ebc780e | Monitoring access |
| Worker Logs | ✅ `wrangler tail` CLI | Real-time logs |

### Required Tools

| Tool | Installation | Purpose |
|------|--------------|---------|
| **Postman** | https://www.postman.com/downloads/ | API testing, collections |
| **Chrome DevTools** | Built-in to Chrome | Performance, memory profiling |
| **Lighthouse CLI** | `npm install -g @lhci/cli@*` | Automated performance audits |
| **curl / REST Client** | Built-in to Linux | Quick API tests |
| **Wrangler CLI** | `npm install -g @cloudflare/wrangler` | Worker logs & KV inspection |
| **BrowserStack** (optional) | https://www.browserstack.com/ | Cross-browser testing on real devices |

### Test Data Available

```
Production Account:
  Email:    andrew@upnx.asia
  Password: Upnx@2019!
  Role:     admin
  Status:   Active ✅

Demo Accounts:
  Email:    demo-admin@example.com
  Password: Demo@12345
  Role:     admin
  
  Email:    demo-user@example.com
  Password: Demo@12345
  Role:     user
```

---

## 🚨 Risk Mitigation

### High-Risk Areas (Watch Out)

| Risk | Mitigation |
|------|------------|
| Demo mode timeout errors | Test early (Phase 2), verify AbortSignal timeout not triggered |
| KV consistency issues | Run consistency audit daily, verify index keys match records |
| Rate limiting false positives | Test edge cases (exactly 100, exactly 101 requests) |
| Performance regression | Compare Phase 4 baseline with Phase 8 results |
| Cross-browser issues | Test on real devices + BrowserStack (don't skip Safari) |
| Gateway dependency | Use demo mode for testing when real gateway unavailable |

### Rollback Plan

If critical failures in Phase X:
1. **Phase 1 (Auth) fails:** Do not proceed to Phase 2. Fix auth issues first.
2. **Phase 2 (APIs) fails:** Do not proceed to Phase 3. Investigate timeout errors, API schemas.
3. **Phase 3 (Agent) fails:** Do not proceed to Phase 4. Verify rate limiting, health monitoring logic.
4. **Phase 4+ fails:** Can iterate Phase 4+ independently; Phase 1-3 must pass before proceeding.

---

## 📊 Success Metrics Summary

| Metric | Target | Critical? |
|--------|--------|-----------|
| All authentication flows working | 100% | ✅ YES |
| No "timeout errors" in demo mode | 100% | ✅ YES |
| Dashboard LCP | < 2s | ✅ YES |
| API endpoints correct status | 100% | ✅ YES |
| Rate limiting enforced | 100% | ✅ YES |
| Security headers present | 100% | ✅ YES |
| Cross-browser compatibility | 100% (Chrome, Firefox, Safari, Edge) | ✅ YES |
| Mobile responsive | 100% (< 768px) | ✅ YES |
| KV persistence working | 100% | ✅ YES |
| Agent coordination functional | 100% (register → heartbeat → vote → delegate) | ✅ YES |

**Overall Pass Criteria:** ≥ 95% of test cases pass; all critical metrics met.

---

## 📝 Daily Standup Template

**Use this template for daily progress updates:**

```markdown
## Testing Standup - [DATE]

### Completed Today
- [ ] Test Phase: [PHASE_NAME]
- Test count: [X/Y] passed
- Issues found: [COUNT]

### Blockers
- [ ] (None) OR [Issue 1, Issue 2]

### Next Steps
- [ ] Execute [NEXT_PHASE]
- [ ] Investigate [BLOCKER]

### Notes
- [Key observation 1]
- [Key observation 2]
```

---

## 📋 Execution Commands

### Quick Reference

```bash
# Start Phase 1 (Auth)
./scripts/test-auth.sh

# Start Phase 2 (Integration)
./run-agentic-tests.sh

# Start Phase 3 (Agent Coordination)
./run-agentic-tests.sh --phase=agent-coordination

# Start Phase 4 (Performance)
npm run lighthouse --throttle=slow-3g

# Start Phase 5 (Security)
./scripts/security-scan.sh

# Start Phase 6 (Cross-Browser)
./scripts/test-browsers.sh

# Start Phase 7 (CF Workers)
./scripts/test-cf-workers.sh

# Start Phase 8 (Regression)
./scripts/regression-suite.sh

# View all results
ls -la PHASE*_RESULTS_*.md
```

---

## 📈 Status Tracking

**Use this table to track Phase completion:**

| Phase | Dates | Status | % Complete | Issues | Sign-Off |
|-------|-------|--------|-----------|--------|----------|
| 1: Auth | Mar 4 | ⬜ Not Started | 0% | — | — |
| 2: Integration | Mar 5-6 | ⬜ Not Started | 0% | — | — |
| 3: Agent Tests | Mar 7-8 | ⬜ Not Started | 0% | — | — |
| 4: Performance | Mar 9 | ⬜ Not Started | 0% | — | — |
| 5: Security | Mar 10 | ⬜ Not Started | 0% | — | — |
| 6: Cross-Browser | Mar 11 | ⬜ Not Started | 0% | — | — |
| 7: CF Workers | Mar 12 | ⬜ Not Started | 0% | — | — |
| 8: Regression | Mar 13 | ⬜ Not Started | 0% | — | — |

---

**Next Step:** Begin Phase 1 (Authentication Tests) on March 4. Use the testing execution commands above to start.
