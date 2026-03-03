# AiOC Test Case Execution Tracker
**Generated:** March 3, 2026  
**Updated:** [To be updated daily]  
**Status:** Ready for Execution  

---

## Quick Summary

**Total Test Cases:** 150+  
**Estimated Execution Time:** 35-40 hours (parallelizable to 3-4 days)  
**Pass Target:** ≥ 95% pass rate  
**Critical Issues Target:** 0 (must-fix before production)  

---

## Phase 1: Authentication & Session (March 4)

**Duration:** 4-5 hours  
**Tests:** 11  

### Authentication Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-AUTH-001 | Production Account Login | 200 OK, session | ⬜ | — | — |
| TC-AUTH-002 | Demo Account Login (Admin) | 200 OK, demo mode | ⬜ | — | — |
| TC-AUTH-003 | Demo Account Login (User) | 403 redirect (implicit) | ⬜ | — | — |
| TC-AUTH-004 | Invalid Credentials | 401 error | ⬜ | — | — |
| TC-AUTH-005 | Session Persistence | Cookie survives F5 | ⬜ | — | — |
| TC-AUTH-006 | Logout | Session cleared | ⬜ | — | — |
| TC-AUTH-007 | Expired Reset Token | Error message | ⬜ | — | — |
| TC-AUTH-008 | Unauthorized Route Access | Redirect to /login | ⬜ | — | — |
| TC-SEC-AUTH-001 | XSS Prevention | Script not executed | ⬜ | — | — |
| TC-SEC-AUTH-002 | CSRF Protection | Request rejected | ⬜ | — | — |
| TC-SEC-AUTH-003 | Cookie Flags | HttpOnly, Secure, SameSite | ⬜ | — | — |

**Execution Steps:**
```bash
# Day: March 4
cd /workspaces/OpenClaw-Common-Centre

# Test 1: Production login
curl -X POST https://aioc.askjary.com/api/auth/login \
  -d '{"email":"andrew@upnx.asia","password":"Upnx@2019!"}' \
  -H "Content-Type: application/json" \
  --include

# Expected: 200 OK, Set-Cookie header present

# Test 2: Demo login
curl -X POST https://aioc.askjary.com/api/auth/login \
  -d '{"email":"demo-admin@example.com","password":"Demo@12345"}' \
  -H "Content-Type: application/json" \
  --include

# Expected: 200 OK, session cookie set

# Test 3: Session persistence
# a) Login
COOKIE=$(curl -s -c - https://aioc.askjary.com/api/auth/login ... | grep session)
# b) Reload page
curl -b "$COOKIE" https://aioc.askjary.com/api/users/me
# Expected: User data returned (session valid)

# Test 4: XSS payload
curl -X POST https://aioc.askjary.com/api/chat \
  -d '{"message":"<script>alert(\"xss\")</script>"}' \
  --cookie "$COOKIE" \
  -H "Content-Type: application/json"
# Expected: Payload sanitized (script escaped)
```

**Pass Criteria:**
- ✅ 11/11 tests pass
- ✅ All endpoints respond < 200ms
- ✅ No 5xx errors
- ✅ Cookie flags verified

**Result:** ⬜ Pending

---

## Phase 2: Integration Tests (March 5-6)

**Duration:** 8-10 hours  
**Tests:** 35+  

### Dashboard Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-DASH-001 | Dashboard Load (Real Gateway) | < 2s LCP | ⬜ | Lighthouse report | — |
| TC-DASH-002 | Dashboard Load (Demo Mode) | No timeout errors | ⬜ | Network tab | — |
| TC-DASH-003 | Gateway Status Dot | Pulsing (online) | ⬜ | Screenshot | — |
| TC-DASH-004 | Navigation Links | All 10 links work | ⬜ | Click test | — |
| TC-DASH-005 | Mobile Sidebar | Hamburger visible | ⬜ | Mobile viewport | — |

### Task Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-TASK-001 | View Tasks List | Renders without error | ⬜ | Page load | — |
| TC-TASK-002 | Create Task | Task added to UI | ⬜ | Task appears | — |
| TC-TASK-003 | View Task Detail | Detail page loads | ⬜ | /tasks/[id] | — |
| TC-TASK-004 | Task Status Filter | Filter works | ⬜ | Filtered list | — |
| TC-TASK-005 | GET /api/tasks | 200 OK, correct schema | ⬜ | JSON response | — |
| TC-TASK-006 | GET /api/tasks/[id] | 200 OK, single task | ⬜ | JSON response | — |

### Board Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-BOARD-001 | Board View Load | No errors | ⬜ | Page load | — |
| TC-BOARD-002 | Board Columns | Standard columns visible | ⬜ | Layout | — |
| TC-BOARD-003 | GET /api/board | 200 OK, correct schema | ⬜ | JSON response | — |

### Briefing Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-BRIEF-001 | Fetch Existing Briefing | Mock data displays | ⬜ | Page load | — |
| TC-BRIEF-002 | Generate Briefing | No timeout errors | ⬜ | Response time | — |
| TC-BRIEF-003 | GET /api/briefing | 200 OK | ⬜ | JSON response | — |
| TC-BRIEF-004 | POST /api/briefing | 202 with runId | ⬜ | HTTP status + JSON | — |

### Calendar Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-CAL-001 | Calendar View Load | Calendar visible | ⬜ | Page load | — |
| TC-CAL-002 | GET /api/calendar | 200 OK | ⬜ | JSON response | — |

### Chat & Agent Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-CHAT-001 | Chat Interface Load | No errors | ⬜ | Page load | — |
| TC-CHAT-002 | Send Message (Demo) | Instant response | ⬜ | Response time | — |
| TC-CHAT-003 | POST /api/chat | 202 with runId | ⬜ | HTTP status + JSON | — |
| TC-CHAT-004 | GET /api/agents | 200 OK, agents online | ⬜ | JSON response | — |

### Integration Page Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-INTEG-001 | Integrations Page Load | No errors | ⬜ | Page load | — |
| TC-INTEG-002 | Gateway Banner (Prod) | Status reflected | ⬜ | Banner color | — |
| TC-INTEG-003 | Gateway Banner (Demo) | Shows "online" | ⬜ | Banner text | — |
| TC-INTEG-004 | IM Tools Badges | Status correct | ⬜ | Badge labels | — |
| TC-INTEG-005 | Integration Cards Expand | Animation smooth | ⬜ | Expand test | — |

### Admin Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-ADMIN-001 | Admin Users List | Users displayed | ⬜ | Page load | — |
| TC-ADMIN-002 | Demo User Can't Access | Redirect to dashboard | ⬜ | Redirect | — |
| TC-ADMIN-003 | GET /api/users | 200 OK | ⬜ | JSON response | — |
| TC-ADMIN-004 | GET /api/users/[id] | 200 OK | ⬜ | JSON response | — |

### Profile Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-PROF-001 | View Profile | User data displayed | ⬜ | Page load | — |
| TC-PROF-002 | Update Profile | Changes persisted | ⬜ | Data verification | — |
| TC-PROF-003 | Change Password | New password works | ⬜ | Login test | — |
| TC-PROF-004 | GET /api/users/me | 200 OK | ⬜ | JSON response | — |
| TC-PROF-005 | POST /api/users/me/password | 200 OK | ⬜ | HTTP status | — |

**Phase 2 Result:** ⬜ Pending (35+ tests)

---

## Phase 3: Sprint 2 Phase 2 - Agent Coordination (March 7-8)

**Duration:** 6-8 hours  
**Tests:** 35+  

### Agent Registration & Rate Limiting

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-AGENT-001 | Register New Agent | 201 Created | ⬜ | HTTP status | — |
| TC-AGENT-002 | Rate Limit (Minute) | 429 on 101st | ⬜ | HTTP status | — |
| TC-AGENT-003 | Rate Limit Recovery | Success after 61s | ⬜ | HTTP status | — |
| TC-AGENT-004 | Custom Rate Limits | Applied correctly | ⬜ | Response data | — |

### Agent Health Monitoring

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-HEALTH-001 | Check Health (Online) | status: online | ⬜ | JSON response | — |
| TC-HEALTH-002 | Check Health (Offline) | status: offline, 121s wait | ⬜ | Alert level | — |
| TC-HEALTH-003 | Check Health (Crashed) | status: crashed, 301s wait | ⬜ | Alert level | — |
| TC-HEALTH-004 | Health Loop Runs | Logs appear every 30s | ⬜ | Logs | — |
| TC-HEALTH-005 | Get Critical Agents | Returns critical only | ⬜ | Filtered list | — |

### Heartbeat Endpoint

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-HB-001 | Heartbeat (No Auth) | 200 OK | ⬜ | HTTP status | — |
| TC-HB-002 | Heartbeat Updates | Timestamp updated | ⬜ | Time comparison | — |
| TC-HB-003 | Heartbeat Sets Online | Status becomes online | ⬜ | Health check | — |
| TC-HB-004 | Heartbeat Audit Log | ~20% sampled | ⬜ | Log review | — |

### Rate Limit Status

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-RATELIMIT-001 | Get Rate Status | Metrics returned | ⬜ | JSON response | — |
| TC-RATELIMIT-002 | Missing agentId | 400 error | ⬜ | HTTP status | — |
| TC-RATELIMIT-003 | Requires Auth | 401 error | ⬜ | HTTP status | — |
| TC-RATELIMIT-004 | Rate Limit Reset | Counters reset | ⬜ | Metrics check | — |

### Workflow Coordination

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-WORKFLOW-001 | Create Valid Workflow | 201 Created | ⬜ | HTTP status | — |
| TC-WORKFLOW-002 | Reject Cycle | 400 with error | ⬜ | HTTP status + error | — |
| TC-WORKFLOW-003 | Unreachable States | 400 with error | ⬜ | Validation error | — |
| TC-WORKFLOW-004 | Detect Conflicts | Warnings returned | ⬜ | Response data | — |
| TC-WORKFLOW-005 | Update Workflow | 200 OK | ⬜ | HTTP status | — |

### Consensus Voting

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-VOTE-001 | Cast Vote | 200 OK, vote recorded | ⬜ | JSON response | — |
| TC-VOTE-002 | Consensus Passed | Status: PASSED (75%) | ⬜ | Consensus status | — |
| TC-VOTE-003 | Consensus Rejected | Status: REJECTED (75%) | ⬜ | Consensus status | — |
| TC-VOTE-004 | Abstain Ignored | Not counted in threshold | ⬜ | Calculation | — |
| TC-VOTE-005 | Change Vote | Vote updated | ⬜ | Consensus recalc | — |
| TC-VOTE-006 | Voting Rate Limit | 429 on 101st | ⬜ | HTTP status | — |
| TC-VOTE-007 | Get Proposal Votes | Votes & consensus | ⬜ | JSON response | — |

### Task Delegation

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-DELEGATE-001 | Propose Delegation | 200 OK, status PENDING | ⬜ | JSON response | — |
| TC-DELEGATE-002 | Accept Delegation | Status changes to ACCEPTED | ⬜ | Task update | — |
| TC-DELEGATE-003 | Reject Delegation | Status changes to REJECTED | ⬜ | Task update | — |
| TC-DELEGATE-004 | Invalid Action | 400 error | ⬜ | HTTP status | — |
| TC-DELEGATE-005 | No Pending | 400 error | ⬜ | HTTP status | — |

**Phase 3 Result:** ⬜ Pending (35+ tests)

---

## Phase 4: Performance (March 9)

**Duration:** 4-6 hours  
**Tests:** 15+  

### Page Load Performance

| ID | Test Case | Target | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-PERF-LOGIN | Login FCP | < 1.5s | ⬜ | Lighthouse | — |
| TC-PERF-DASH | Dashboard LCP | < 2s | ⬜ | Lighthouse | — |
| TC-PERF-TASKS | Tasks LCP | < 2s | ⬜ | Lighthouse | — |
| TC-PERF-INTEG | Integrations LCP | < 2s | ⬜ | Lighthouse | — |

### API Response Times

| ID | Endpoint | Target | Status | P50 | P95 | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-API-STATUS | /api/openclaw/status | < 100ms | ⬜ | — | — | — |
| TC-API-AGENTS | /api/agents | < 500ms | ⬜ | — | — | — |
| TC-API-STATS | /api/dashboard/stats | < 500ms | ⬜ | — | — | — |
| TC-API-CHAT | /api/chat POST | < 200ms | ⬜ | — | — | — |

### Memory & Bundle

| ID | Metric | Target | Status | Actual | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-MEM-IDLE | Idle memory | < 50MB | ⬜ | — | — |
| TC-MEM-MSGS | After 100 messages | < 100MB | ⬜ | — | — |
| TC-BUNDLE | JS gzipped | < 200KB | ⬜ | — | — |

**Phase 4 Result:** ⬜ Pending (15+ tests)

---

## Phase 5: Security (March 10)

**Duration:** 4-5 hours  
**Tests:** 12  

### Security Tests

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-SEC-XSS-001 | XSS Injection | Script not executed | ⬜ | Console check | — |
| TC-SEC-CSRF-001 | CSRF Protection | Request rejected | ⬜ | HTTP status | — |
| TC-SEC-COOKIE-001 | Cookie Flags | HttpOnly, Secure, SameSite | ⬜ | DevTools | — |
| TC-SEC-AUTH-BRUTE | Brute Force | Rate limited | ⬜ | 429 after N | — |
| TC-SEC-DATA-USER | User Data Isolation | Other user data blocked | ⬜ | 403/404 | — |
| TC-SEC-DATA-TASK | Task Data Isolation | Cross-user blocked | ⬜ | 404 | — |
| TC-SEC-PWD | Password Storage | Hashed (PBKDF2) | ⬜ | KV inspection | — |
| TC-SEC-HTTPS | HTTPS Enforcement | No HTTP | ⬜ | Redirect | — |
| TC-SEC-CORS | CORS Headers | Restrictive | ⬜ | Response headers | — |
| TC-SEC-CSP | CSP Header | Present and restrictive | ⬜ | Response headers | — |
| TC-SEC-XFO | X-Frame-Options | DENY | ⬜ | Response headers | — |
| TC-SEC-INPUT | Input Validation | Sanitized | ⬜ | No SQL injection | — |

**Phase 5 Result:** ⬜ Pending (12 tests)

---

## Phase 6: Cross-Browser & Responsive (March 11)

**Duration:** 6-8 hours  
**Tests:** 20+  

### Browser Tests

| Browser | Tests | Status | Issues | Blocker |
|---------|-------|--------|--------|---------|
| Chrome 130 | 10 pages | ⬜ | — | — |
| Firefox 131 | 10 pages | ⬜ | — | — |
| Safari 17 | 10 pages | ⬜ | — | — |
| Edge 131 | 10 pages | ⬜ | — | — |

### Responsive Tests

| Breakpoint | Tests | Status | Issues | Blocker |
|------------|-------|--------|--------|---------|
| Mobile (< 768px) | 10 pages | ⬜ | — | — |
| Tablet (768-1024px) | 10 pages | ⬜ | — | — |
| Desktop (> 1024px) | 10 pages | ⬜ | — | — |

**Phase 6 Result:** ⬜ Pending (40+ effective tests)

---

## Phase 7: Cloudflare Workers (March 12)

**Duration:** 3-4 hours  
**Tests:** 10  

### KV Operations

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-CF-KV-001 | User Data Persistence | KV updated correctly | ⬜ | KV inspection | — |
| TC-CF-KV-002 | Session Persistence | Survives restart | ⬜ | Session test | — |
| TC-CF-KV-003 | Index Consistency | Index matches records | ⬜ | KV audit | — |

### Worker Performance

| ID | Test Case | Target | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-CF-COLD | Cold Start | < 50ms | ⬜ | Logs | — |
| TC-CF-GEO | Geography Routing | < 200ms | ⬜ | Latency test | — |
| TC-CF-LOGS | Worker Logs | No 500-level errors | ⬜ | Logs review | — |

### Asset Serving

| ID | Test Case | Expected | Status | Evidence | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-CF-CACHE | Static Caching | 304 on reload | ⬜ | HTTP status | — |
| TC-CF-FRESH | Asset Freshness | New assets fetched | ⬜ | Cache headers | — |

**Phase 7 Result:** ⬜ Pending (10 tests)

---

## Phase 8: Regression & Sign-Off (March 13)

**Duration:** 4-5 hours  
**Tests:** 20+  

### Full User Flows

| ID | Test Case | Expected | Status | Result | Blocker |
|----|-----------|-----------|---------|---------| ---|
| TC-SMOKE-001 | All 10 pages load | No 5xx errors | ⬜ | — | — |
| TC-SMOKE-002 | Authentication flow | Complete login → logout | ⬜ | — | — |
| TC-SMOKE-003 | Demo mode flow | No timeouts | ⬜ | — | — |
| TC-SMOKE-004 | Production flow | Gateway status correct | ⬜ | — | — |
| TC-SMOKE-005 | Agent E2E | Register → vote → delegate | ⬜ | — | — |

### Regression Checks

| Critical Bug | Test Case | Status | Fixed? | Blocker |
|--------------|-----------|--------|--------|---------|
| Timeout in demo | TC-DEMO-003 | ⬜ | — | — |
| Rate limit bypass | TC-AGENT-002 | ⬜ | — | — |
| Health not updating | TC-HEALTH-001 | ⬜ | — | — |
| Cycle not detected | TC-WORKFLOW-002 | ⬜ | — | — |
| Poor performance | TC-PERF-DASH | ⬜ | — | — |

### Sign-Off Checklist

| Role | Item | Status | Reviewed By |
|------|------|--------|-------------|
| QA | All phases complete | ⬜ | — |
| QA | No blockers remain | ⬜ | — |
| Dev | Code review done | ⬜ | — |
| Dev | No critical bugs | ⬜ | — |
| Product | Feature scope met | ⬜ | — |
| DevOps | Deployment ready | ⬜ | — |

**Phase 8 Result:** ⬜ Pending

---

## 📊 Overall Progress

```
Phase 1: Auth ...................[                    ] 0% (0/11)
Phase 2: Integration ............[                    ] 0% (0/35)
Phase 3: Agent .....................[                    ] 0% (0/35)
Phase 4: Performance ............[                    ] 0% (0/15)
Phase 5: Security ................[                    ] 0% (0/12)
Phase 6: Cross-Browser ...........[                    ] 0% (0/40)
Phase 7: CF Workers .............[                    ] 0% (0/10)
Phase 8: Regression .............[                    ] 0% (0/20)
                                      ─────────────────────────
Total Progress ....................[                    ] 0% (0/178)
```

**Legend:**
- ⬜ Not Started
- 🟨 In Progress
- ✅ Passed
- ❌ Failed / Blocked

---

## Daily Update Template

**Use this daily to track progress:**

```markdown
## Testing Progress - [DATE]

### Completed Tests Today
- [ ] Test ID: Result (Pass/Fail/Blocked)
- [ ] Test ID: Result

### Open Issues
- [ ] Issue 1: [Description] (Blocker: Yes/No)
- [ ] Issue 2: [Description]

### Next: [TESTS]
- [ ] Test ID
- [ ] Test ID

### Notes
[Key observations]
```

---

## Legend & Definitions

**Status Icons:**
- ⬜ Not Started
- 🟨 In Progress (currently executing)
- ✅ Passed (all assertions met)
- ❌ Failed (assertion failed, may retry)
- 🚫 Blocked (dependency not ready, cannot proceed)

**Evidence Types:**
- Lighthouse report
- HTTP status code
- JSON response
- DevTools screenshot
- Network tab
- Logs
- Page load verification

**Blocker Severity:**
- **Critical:** Blocks entire phase from proceeding (must fix immediately)
- **High:** Blocks specific feature, workaround exists
- **Medium:** Test fails but doesn't block other tests
- **Low:** Non-functional test result

---

## Tips for Execution

1. **Mark as In-Progress (🟨):** Start test before making assertion
2. **Record Evidence:** Screenshot or log response for each test
3. **Document Blockers:** If test fails, note the cause and severity
4. **Update Daily:** Keep tracker fresh for standup meetings
5. **Parallelize:** Run browser tests in parallel, sequential for API tests

---

**Ready to begin Phase 1 on March 4. Execute using:**
```bash
./scripts/test-auth.sh  # Phase 1
./run-agentic-tests.sh  # Phase 2+
```
