# AiOC (aioc.askjary.com) – Comprehensive Testing Plan

**Document Version:** 1.0  
**Date:** March 3, 2026  
**Status:** Ready for QA  
**Environment:** Production (Cloudflare Workers) + Demo Mode  

---

## 1. Executive Summary

This testing plan covers functional, integration, performance, and security testing for the AiOC (OpenClaw Common Centre) application deployed on Cloudflare Workers. The app supports two user modes: **production multi-user** (andrew@upnx.asia) and **demo mode** (guest demo accounts).

**Key Testing Objectives:**
- Verify all CRUD operations across dashboard, tasks, board, calendar, pipeline, briefing
- Ensure demo mode gracefully handles missing gateway without timeout errors
- Validate authentication/session management with real and demo accounts
- Test all API endpoints under normal and degraded conditions
- Verify Cloudflare Workers deployment (KV namespace, CORS, caching)
- Performance baseline: < 2s full page load, < 500ms API response

---

## 2. Test Environment Setup

### 2.1 Credentials

| Account Type | Email | Password | Purpose |
|---|---|---|---|
| Production Admin | `andrew@upnx.asia` | `Upnx@2019!` | Real account testing |
| Demo Admin | `demo-admin@example.com` | `Demo@12345` | Demo mode testing |
| Demo User | `demo-user@example.com` | `Demo@12345` | Role-based testing |

### 2.2 Test URLs

```
Production:     https://aioc.askjary.com
                https://www.aioc.askjary.com
Workers Dev:    https://ajb-ops-centre.celery-static-2k.workers.dev
Local Dev:      http://localhost:3000
```

### 2.3 Browsers & Devices

- **Desktop:** Chrome 130, Firefox 131, Safari 17
- **Tablet:** iPad (landscape + portrait)
- **Mobile:** iPhone 14/15 (landscape + portrait), Android 14+

### 2.4 Tools Required

- Postman / REST Client (API testing)
- Lighthouse (performance audit)
- Chrome DevTools (network profiling, memory)
- Cloudflare Dashboard (KV monitoring, deployment logs)
- Network throttling simulator (slow 3G, 4G)

---

## 3. Test Categories & Scope

### 3.1 Authentication & User Management (Unit + Integration Tests)

#### TC-AUTH-001: Production Account Login
- **Steps:**
  1. Navigate to https://aioc.askjary.com/login
  2. Enter email: `andrew@upnx.asia`
  3. Enter password: `Upnx@2019!`
  4. Click "Sign in"
- **Expected:** Redirects to `/dashboard`, session cookie set, user info visible in profile
- **Acceptance:** Login succeeds, session persists on page reload

#### TC-AUTH-002: Demo Account Login (Admin)
- **Steps:**
  1. Navigate to /login
  2. Enter email: `demo-admin@example.com`
  3. Enter password: `Demo@12345`
  4. Click "Sign in"
- **Expected:** Redirects to `/dashboard`, demo mode applied (gateway mocked as "online")
- **Acceptance:** Gateway status always shows "online" in demo mode

#### TC-AUTH-003: Demo Account Login (User Role)
- **Steps:**
  1. Login with `demo-user@example.com` / `Demo@12345`
  2. Verify role restrictions (no `admin/users` page if not admin)
- **Expected:** User role cannot access `/admin/users`, redirects to `/dashboard`
- **Acceptance:** Role-based access control enforced

#### TC-AUTH-004: Invalid Credentials
- **Steps:**
  1. Enter `andrew@upnx.asia` + wrong password
  2. Click "Sign in"
- **Expected:** Error message: "Invalid credentials", no session set
- **Acceptance:** Error displayed, no auth bypass

#### TC-AUTH-005: Session Persistence
- **Steps:**
  1. Login with production account
  2. Reload page (F5)
  3. Close browser tab, reopen https://aioc.askjary.com
- **Expected:** Still logged in (HttpOnly session cookie valid)
- **Acceptance:** Session survives reload and new tab

#### TC-AUTH-006: Logout
- **Steps:**
  1. Login successfully
  2. Click "Sign out" in sidebar
- **Expected:** Redirects to `/login`, session cleared, cannot access protected routes
- **Acceptance:** All cookies/session removed

#### TC-AUTH-007: Password Reset Link (Expired Token)
- **Steps:**
  1. Go to `/forgot-password`, enter email
  2. (Simulate: generate reset token, wait 1 hour or manually expire)
  3. Click reset link
- **Expected:** "Token expired or invalid" error
- **Acceptance:** Expired tokens rejected

#### TC-AUTH-008: Unauthorized Route Access
- **Steps:**
  1. Logout completely
  2. Try to access `/dashboard` directly
- **Expected:** Redirects to `/login`
- **Acceptance:** Protected routes block unauthenticated users

### 3.2 Dashboard (Functional Tests)

#### TC-DASH-001: Dashboard Load with Real Gateway
- **Steps:**
  1. Start OpenClaw gateway locally or access prod API
  2. Login with production account
  3. Observe `/dashboard` page load
- **Expected:** Shows task count, active agents (10/10 if gateway online), gateway online indicator
- **Acceptance:** All KPIs render within 2s, no errors in console

#### TC-DASH-002: Dashboard Load with Demo Mode
- **Steps:**
  1. Login with `demo-admin@example.com`
  2. Navigate to `/dashboard`
- **Expected:** Shows mock task count (0-10), gateway status "online" (mocked), no timeout errors
- **Acceptance:** Dashboard loads instantly, no "The operation was aborted due to timeout" errors

#### TC-DASH-003: Sidebar Gateway Status Dot
- **Steps:**
  1. Login (production or demo)
  2. Hover over sidebar (desktop)
  3. View gateway status indicator
- **Expected:** Green pulsing dot (online) or static gray (offline, unreachable)
- **Acceptance:** Dot reflects actual/mocked gateway status; animation smooth

#### TC-DASH-004: Navigation Links from Dashboard
- **Steps:**
  1. Click each nav link: Tasks, Board, Briefing, etc.
- **Expected:** Routes to correct page (e.g., `/tasks`, `/board`)
- **Acceptance:** All 10 nav items functional, no 404s

#### TC-DASH-005: Mobile Sidebar Drawer
- **Steps:**
  1. Resize to mobile (< 1024px)
  2. Click hamburger menu
  3. Click "Dashboard" link
- **Expected:** Drawer closes, navigates to dashboard
- **Acceptance:** Mobile UX works, drawer toggles properly

### 3.3 Tasks (CRUD Tests)

#### TC-TASK-001: View Tasks List
- **Steps:**
  1. Login, navigate to `/tasks`
- **Expected:** Displays mock tasks or live tasks (if gateway online)
- **Acceptance:** Task list renders without errors

#### TC-TASK-002: Create Task (Demo Mode)
- **Steps:**
  1. Login with demo account
  2. (If create UI exists) Click "New Task"
  3. Fill in task details, save
- **Expected:** Task added to UI (may be mock data in demo)
- **Acceptance:** No errors, UI reflects new task

#### TC-TASK-003: View Task Detail
- **Steps:**
  1. Click on a task in `/tasks`
  2. Navigate to `/tasks/[id]`
- **Expected:** Shows task details (title, description, status, assignee)
- **Acceptance:** Task page loads without errors

#### TC-TASK-004: Task Status Filter
- **Steps:**
  1. On `/tasks`, filter by status (e.g., "Open", "In Progress", "Closed")
- **Expected:** List shows only tasks matching status
- **Acceptance:** Filtering logic works correctly

#### TC-TASK-005: API Endpoint `/api/tasks`
- **Steps:**
  1. Call `GET /api/tasks` with valid session
- **Expected:** Returns task array or mock data (in demo mode), 200 OK
- **Acceptance:** Correct JSON structure, no 500 errors

#### TC-TASK-006: API Endpoint `/api/tasks/[id]`
- **Steps:**
  1. Call `GET /api/tasks/[id]` with valid task ID
- **Expected:** Returns task object with full details, 200 OK
- **Acceptance:** Response format matches expected schema

### 3.4 Board (Functional Tests)

#### TC-BOARD-001: Board View Load
- **Steps:**
  1. Navigate to `/board`
- **Expected:** Displays kanban or grid board layout
- **Acceptance:** Board renders without errors

#### TC-BOARD-002: Board Columns/Stages
- **Steps:**
  1. View `/board`
  2. Count visible columns (e.g., "Todo", "In Progress", "Done")
- **Expected:** Standard Agile/Kanban columns visible
- **Acceptance:** Layout is logical and readable

#### TC-BOARD-003: API `/api/board`
- **Steps:**
  1. Call `GET /api/board`
- **Expected:** Returns board data or mock data, 200 OK
- **Acceptance:** Correct JSON structure

### 3.5 Briefing (Integration Tests)

#### TC-BRIEF-001: Fetch Existing Briefing (Demo Mode)
- **Steps:**
  1. Login with demo account
  2. Navigate to `/briefing`
- **Expected:** Shows mock briefing (email triage, schedule, tasks, headlines)
- **Acceptance:** Mock data displays correctly, no timeout errors

#### TC-BRIEF-002: Generate Briefing Trigger (Demo Mode)
- **Steps:**
  1. Click "Generate Briefing" button
- **Expected:** Returns mock briefing with "generating" status; no gateway timeout
- **Acceptance:** Request succeeds with 202/200, no 502 errors

#### TC-BRIEF-003: API `GET /api/briefing`
- **Steps:**
  1. Call `GET /api/briefing`
- **Expected:** Returns briefing JSON with fields: greeting, sections, generatedAt
- **Acceptance:** Correct schema, no errors

#### TC-BRIEF-004: API `POST /api/briefing`
- **Steps:**
  1. Call `POST /api/briefing` (trigger generation)
- **Expected:** Returns 202 with "generating" status (demo mode) or real runId (prod)
- **Acceptance:** Correct HTTP status (202 or 200), no timeout

### 3.6 Calendar (Functional Tests)

#### TC-CAL-001: Calendar View Load
- **Steps:**
  1. Navigate to `/calendar`
- **Expected:** Displays monthly/weekly calendar view
- **Acceptance:** Calendar renders, dates visible

#### TC-CAL-002: API `/api/calendar`
- **Steps:**
  1. Call `GET /api/calendar`
- **Expected:** Returns events array or mock data, 200 OK
- **Acceptance:** Correct JSON format

### 3.7 Chat & Agent Communication (Integration Tests)

#### TC-CHAT-001: Chat Interface Load
- **Steps:**
  1. Navigate to `/agent` (chat page)
- **Expected:** Chat input box and message list visible
- **Acceptance:** UI renders without errors

#### TC-CHAT-002: Send Message (Demo Mode)
- **Steps:**
  1. Type a message in chat input
  2. Press Enter or click Send
- **Expected:** Message sent, API call succeeds (202), UI shows "generating" state
- **Acceptance:** No type errors, request completes without timeout

#### TC-CHAT-003: API `POST /api/chat`
- **Steps:**
  1. Call `POST /api/chat` with `{ message: "Hello", agentId: "hooks" }`
- **Expected:** Returns 202 with `{ ok: true, runId: "..." }`
- **Acceptance:** Correct response code (202), valid runId format

#### TC-CHAT-004: API /api/agents List
- **Steps:**
  1. Call `GET /api/agents`
- **Expected:** Returns array of agent objects with status (online/offline)
- **Expected (Demo):** All agents marked "offline" (gateway mocked down, then returns online if mock active)
- **Acceptance:** Agents render with status, no errors

### 3.8 Integrations Page (Functional + Integration)

#### TC-INTEG-001: Integrations Page Load
- **Steps:**
  1. Navigate to `/integrations`
- **Expected:** Gateway status banner + IM tools + integration cards load
- **Acceptance:** Page renders without errors

#### TC-INTEG-002: Gateway Status Banner (Production)
- **Steps:**
  1. Login with production account
  2. View `/integrations`
  3. (If real gateway running) Observe banner
- **Expected:** Shows "OpenClaw gateway is running" (green) if reachable; "not reachable" (amber) if offline
- **Acceptance:** Banner color and message reflect actual gateway state

#### TC-INTEG-003: Gateway Status Banner (Demo Mode)
- **Steps:**
  1. Login with demo account
  2. View `/integrations`
- **Expected:** Shows "OpenClaw gateway is running" (green), version "demo"
- **Acceptance:** Demo mode always shows gateway as online

#### TC-INTEG-004: IM Tools Badges
- **Steps:**
  1. View `/integrations`
  2. Observe Telegram (connected), Slack (roadmap), WeCom (roadmap)
- **Expected:** Each tool shows correct status badge
- **Acceptance:** Status labels accurate

#### TC-INTEG-005: Integration Cards Expand/Collapse
- **Steps:**
  1. Click on an integration card (e.g., BuildOS)
  2. Expand to see details
- **Expected:** Details panel opens/closes smoothly
- **Acceptance:** Animation smooth, no console errors

### 3.9 Admin Users Page (Authorization Tests)

#### TC-ADMIN-001: Admin Users List Load
- **Steps:**
  1. Login with production admin (`andrew@upnx.asia`)
  2. Navigate to `/admin/users`
- **Expected:** Displays list of users with email, name, role
- **Acceptance:** User list renders with correct data

#### TC-ADMIN-002: Demo Admin Cannot Access
- **Steps:**
  1. Login with demo account
  2. Try to access `/admin/users`
- **Expected:** Redirects to `/dashboard` (403 implicit)
- **Acceptance:** Demo accounts blocked from admin pages

#### TC-ADMIN-003: API `/api/users` (List)
- **Steps:**
  1. Call `GET /api/users` (production admin session)
- **Expected:** Returns array of user objects
- **Acceptance:** Correct schema, no auth errors

#### TC-ADMIN-004: API `/api/users/[id]` (Get Single)
- **Steps:**
  1. Call `GET /api/users/{userId}`
- **Expected:** Returns single user object, 200 OK
- **Acceptance:** Correct response format

### 3.10 Profile & Settings (User Tests)

#### TC-PROF-001: View Profile
- **Steps:**
  1. Login
  2. Navigate to `/profile` or click profile icon
- **Expected:** Shows user email, name, role
- **Acceptance:** Profile data displays correctly

#### TC-PROF-002: Update Profile (if feature enabled)
- **Steps:**
  1. Edit name/settings on profile page
- **Expected:** Changes saved, persisted across reload
- **Acceptance:** Profile updates reflected in UI and backend

#### TC-PROF-003: Change Password
- **Steps:**
  1. Go to `/profile` or `/settings`
  2. Enter current password, new password
  3. Save
- **Expected:** Password changed, next login requires new password
- **Acceptance:** Old password rejected, new password works

#### TC-PROF-004: API `/api/users/me`
- **Steps:**
  1. Call `GET /api/users/me` (with session)
- **Expected:** Returns current user object
- **Acceptance:** Correct user data returned

#### TC-PROF-005: API POST `/api/users/me/password`
- **Steps:**
  1. Call `POST /api/users/me/password` with old + new password
- **Expected:** Returns `{ ok: true }`, password changed
- **Acceptance:** Subsequent login with new password works

---

## 4. API Endpoint Tests (Full Coverage)

### 4.1 Authentication Routes

| Endpoint | Method | Expected Status | Notes |
|---|---|---|---|
| `/api/auth/login` | POST | 200/401 | Valid/invalid credentials |
| `/api/auth/logout` | DELETE | 200 | Clear session |
| `/api/auth/forgot-password` | POST | 200 | Send reset email |
| `/api/auth/reset-password` | POST | 200/400 | Reset with token |

### 4.2 Data Routes

| Endpoint | Method | Expected Status | Demo Mode Behavior |
|---|---|---|---|
| `/api/agents` | GET | 200 | Returns mock agents, all offline initially, then online if gateway mocked |
| `/api/dashboard/stats` | GET | 200 | Returns mock stats (0 active agents if real gateway offline) |
| `/api/tasks` | GET | 200 | Returns mock tasks |
| `/api/tasks/[id]` | GET | 200 | Returns single task or 404 |
| `/api/board` | GET | 200 | Returns board data |
| `/api/briefing` | GET | 200 | Returns mock briefing |
| `/api/briefing` | POST | 202/200 | Triggers briefing generation (demo: mock response) |
| `/api/calendar` | GET | 200 | Returns events |
| `/api/pipeline` | GET | 200 | Returns pipeline stages |
| `/api/chat` | POST | 202 | Fire message to agent (demo: mock runId) |
| `/api/openclaw/status` | GET | 200 | Gateway health check (demo: always { connected: true, version: "demo" }) |

### 4.3 User Routes

| Endpoint | Method | Expected Status | Auth |
|---|---|---|---|
| `/api/users` | GET | 200 | Admin only |
| `/api/users/[id]` | GET | 200 | Admin only |
| `/api/users/[id]` | PUT | 200 | Admin only |
| `/api/users/[id]` | DELETE | 200 | Admin only |
| `/api/users/alerts` | POST | 200 | User or admin |
| `/api/users/me` | GET | 200 | Any authenticated |
| `/api/users/me/password` | POST | 200 | Any authenticated |

### 4.4 Agent Coordination Routes (Sprint 2)

| Endpoint | Method | Expected Status | Notes |
|---|---|---|---|
| `/api/agents` | GET | 200 | List all registered agents (auth required) |
| `/api/agents` | POST | 201/429 | Register new agent (rate-limited) |
| `/api/agents/[id]` | GET | 200 | Get agent details |
| `/api/agents/[id]` | DELETE | 200 | Deregister agent |
| `/api/agents/[id]/heartbeat` | POST | 200 | Record agent lifesign (no auth) |
| `/api/agents/[id]/health` | GET | 200 | Get agent health status (auth required) |
| `/api/workflows` | GET | 200 | List workflows (auth required) |
| `/api/workflows` | POST | 201/400 | Create workflow with validation (auth required) |
| `/api/workflows/[id]` | GET | 200 | Get workflow details |
| `/api/workflows/[id]` | PATCH | 200 | Update workflow rules (agent negotiation) |
| `/api/workflows/[id]` | DELETE | 200 | Delete workflow |
| `/api/consensus/vote` | GET | 200 | Get proposal votes (auth required) |
| `/api/consensus/vote` | POST | 200/429 | Record agent vote (rate-limited) |
| `/api/tasks/[id]/delegate` | POST | 200 | Propose task delegation (auth required) |
| `/api/tasks/[id]/delegate` | PATCH | 200 | Accept/reject delegation proposal |
| `/api/ratelimit/status` | GET | 200 | Get agent rate limit metrics (auth required) |

---

## 5. Agent Coordination & Rate Limiting Tests (Sprint 2 Phase 2)

### 5.1 Agent Registration & Rate Limiting

#### TC-AGENT-001: Register New Agent
- **Steps:**
  1. POST `/api/agents` with `{ "id": "alice", "name": "Alice", "capabilities": ["communicate", "report"] }`
  2. Verify response `{ ok: true, agent: {...} }`
- **Expected:** Agent created in KV, returns 201 Created
- **Acceptance:** Agent retrieved via GET /api/agents

#### TC-AGENT-002: Rate Limit on Agent Registration (Minute Tier)
- **Steps:**
  1. POST `/api/agents` rapidly 101 times (same agent ID or different)
  2. Observe 101st request
- **Expected:** First 100 succeed (201), 101st returns 429 Too Many Requests
- **Response Format:**
  ```json
  {
    "error": "Rate limit exceeded",
    "retryAfter": "2026-03-03T12:05:00Z",
    "limitType": "minute"
  }
  ```
- **Acceptance:** Rate limiting enforced at minute tier

#### TC-AGENT-003: Rate Limit Recovery After Window
- **Steps:**
  1. Hit rate limit (429 response)
  2. Wait 61 seconds
  3. POST `/api/agents` again
- **Expected:** Request succeeds (201) after rate limit window reset
- **Acceptance:** Sliding window correctly allows new requests

#### TC-AGENT-004: Custom Rate Limits Per Agent
- **Test:** Verify system can override DEFAULT_LIMITS for high-priority agents
- **Expected:** Can call checkRateLimit(agentId, { minuteLimit: 50, hourLimit: 200 })
- **Acceptance:** Custom limits apply to specific agents

### 5.2 Agent Health Monitoring

#### TC-HEALTH-001: Check Agent Health (Online)
- **Steps:**
  1. Register agent "alice"
  2. POST `/api/agents/alice/heartbeat` immediately
  3. GET `/api/agents/alice/health`
- **Expected:** Returns status "online", lastHeartbeat < 2 seconds ago, alertLevel "ok"
- **Response Format:**
  ```json
  {
    "ok": true,
    "health": {
      "agentId": "alice",
      "status": "online",
      "lastHeartbeat": 1741012800000,
      "secondsSinceHeartbeat": 5,
      "alertLevel": "ok"
    }
  }
  ```
- **Acceptance:** Heartbeat recorded and reflected in health check

#### TC-HEALTH-002: Check Agent Health (Offline Warning)
- **Steps:**
  1. Register agent "bob"
  2. Wait 121 seconds (> 2 minute threshold) without sending heartbeat
  3. GET `/api/agents/bob/health`
- **Expected:** status "offline", alertLevel "warning"
- **Acceptance:** Health state transitions correctly

#### TC-HEALTH-003: Check Agent Health (Crashed Critical)
- **Steps:**
  1. Register agent "charlie"
  2. Wait 301 seconds (> 5 minute threshold) without heartbeat
  3. GET `/api/agents/charlie/health`
- **Expected:** status "crashed", alertLevel "critical"
- **Acceptance:** Critical state detected and logged

#### TC-HEALTH-004: Health Check Loop Runs Periodically
- **Steps:**
  1. Observe system logs for 90 seconds
  2. Verify `[agent-health]` messages appear every ~30 seconds
- **Expected:** Health check loop runs at configured interval
- **Acceptance:** Background job functioning correctly

#### TC-HEALTH-005: Get Critical Agents
- **Steps:**
  1. Create multiple agents with various health states
  2. Call getCriticalAgents() (internal function test)
- **Expected:** Returns only agents with alertLevel "critical"
- **Acceptance:** Filtering works correctly

### 5.3 Agent Heartbeat Endpoint

#### TC-HB-001: Record Heartbeat (No Auth Required)
- **Steps:**
  1. POST `/api/agents/alice/heartbeat` (no session cookie)
- **Expected:** Returns 200 with `{ ok: true, timestamp: "..." }`
- **Acceptance:** Agents can heartbeat without authentication

#### TC-HB-002: Heartbeat Updates Last Heartbeat Timestamp
- **Steps:**
  1. Get current time T0
  2. POST `/api/agents/alice/heartbeat`
  3. Call GET `/api/agents/alice/health`
  4. Verify lastHeartbeat is close to T0
- **Expected:** lastHeartbeat within 100ms of heartbeat call
- **Acceptance:** Timestamp updated accurately

#### TC-HB-003: Heartbeat Sets Status to "online"
- **Steps:**
  1. Agent health check shows "offline"
  2. POST `/api/agents/alice/heartbeat`
  3. GET `/api/agents/alice/health` immediately
- **Expected:** status changes from "offline" to "online"
- **Acceptance:** Heartbeat resets online status

#### TC-HB-004: Heartbeat Audit Logging (Sampled)
- **Steps:**
  1. Send 5 heartbeats rapidly
  2. Check audit log
- **Expected:** ~1 heartbeat logged (20% sample rate to avoid spam)
- **Acceptance:** Audit logging present but not overwhelming

### 5.4 Rate Limit Status Endpoint

#### TC-RATELIMIT-001: Get Rate Limit Status
- **Steps:**
  1. GET `/api/ratelimit/status?agentId=alice` (with session)
- **Expected:** Returns metrics object with minute/hour/day breakdown
- **Response Format:**
  ```json
  {
    "ok": true,
    "agentId": "alice",
    "rateLimit": {
      "minute": { "used": 45, "limit": 100, "remaining": 55 },
      "hour": { "used": 250, "limit": 500, "remaining": 250 },
      "day": { "used": 2500, "limit": 10000, "remaining": 7500 }
    }
  }
  ```
- **Acceptance:** Metrics accurately reflect usage

#### TC-RATELIMIT-002: Rate Limit Status Missing agentId
- **Steps:**
  1. GET `/api/ratelimit/status` (no query parameter)
- **Expected:** Returns 400 with error "Missing required query parameter: agentId"
- **Acceptance:** Parameter validation working

#### TC-RATELIMIT-003: Rate Limit Status Requires Auth
- **Steps:**
  1. GET `/api/ratelimit/status?agentId=alice` (no session)
- **Expected:** Returns 401 Unauthorized
- **Acceptance:** Auth check enforced

#### TC-RATELIMIT-004: Rate Limit Reset (Admin Operation)
- **Steps:**
  1. Call resetRateLimits(agentId) (internal/admin endpoint)
  2. GET `/api/ratelimit/status?agentId=alice`
- **Expected:** All used counters reset to 0
- **Acceptance:** Admin can clear rate limits

### 5.5 Workflow Coordination

#### TC-WORKFLOW-001: Create Valid Workflow
- **Steps:**
  1. POST `/api/workflows` with states: ["pending", "in-progress", "done"] and valid transitions
  2. Verify response `{ ok: true, workflow: {...} }`
- **Expected:** Workflow created, 201 Created
- **Acceptance:** Workflow persisted in KV

#### TC-WORKFLOW-002: Reject Workflow with Cycle
- **Steps:**
  1. POST `/api/workflows` with transitions that create cycle: pending → in-progress → pending
- **Expected:** Returns 400 with validationErrors: `["Cycle detected: ..."]`
- **Acceptance:** Cycle detection working

#### TC-WORKFLOW-003: Reject Workflow with Unreachable States
- **Steps:**
  1. POST `/api/workflows` with states [A, B, C] but transitions only connect A→B (C unreachable)
- **Expected:** Returns 400 with error about unreachable states
- **Acceptance:** Reachability analysis enforced

#### TC-WORKFLOW-004: Detect Workflow Conflicts
- **Steps:**
  1. Create workflow with states [pending, done]
  2. Create another workflow with overlapping states [pending, in-progress, done]
  3. Check for conflicts
- **Expected:** Returns warnings about conflicting workflows
- **Acceptance:** Conflict detection works

#### TC-WORKFLOW-005: Update Workflow Rules (Agent Negotiation)
- **Steps:**
  1. Create workflow
  2. PATCH `/api/workflows/[id]` with new rules
- **Expected:** Rules updated, 200 OK
- **Acceptance:** Workflow rules updated for consensus

### 5.6 Consensus Voting System

#### TC-VOTE-001: Cast Vote on Proposal
- **Steps:**
  1. POST `/api/consensus/vote` with `{ proposalId: "p1", agentId: "alice", vote: "AGREE" }`
- **Expected:** Returns 200 with vote object and current consensus
- **Response Format:**
  ```json
  {
    "ok": true,
    "vote": { "proposalId": "p1", "agentId": "alice", "vote": "AGREE", "timestamp": "..." },
    "consensus": {
      "status": "PENDING",
      "totalVotes": 1,
      "agreedCount": 1,
      "disagreedCount": 0,
      "abstainedCount": 0,
      "agreementPercentage": 100
    }
  }
  ```
- **Acceptance:** Vote recorded and consensus calculated

#### TC-VOTE-002: Consensus Passed (≥51%)
- **Steps:**
  1. POST vote AGREE from alice, bob, charlie (3 agents)
  2. POST vote DISAGREE from dave (1 agent)
  3. Check consensus status
- **Expected:** status "PASSED" (3 AGREE / 4 total = 75%)
- **Acceptance:** Consensus threshold calculated correctly

#### TC-VOTE-003: Consensus Rejected (≥51% disagree)
- **Steps:**
  1. POST vote AGREE from alice (1)
  2. POST vote DISAGREE from bob, charlie, dave (3 agents)
  3. Check consensus
- **Expected:** status "REJECTED" (3 DISAGREE / 4 total = 75%)
- **Acceptance:** Rejection threshold works

#### TC-VOTE-004: Consensus Abstain Ignored
- **Steps:**
  1. POST vote AGREE from alice
  2. POST vote ABSTAIN from bob, charlie
  3. Check consensus
- **Expected:** status "PENDING" (1 AGREE / 1 DISAGREE, abstentions not counted)
- **Acceptance:** Abstentions excluded from threshold calculation

#### TC-VOTE-005: Agent Can Change Vote
- **Steps:**
  1. POST vote AGREE from alice
  2. POST vote DISAGREE from alice (same proposalId, agentId)
  3. Check consensus
- **Expected:** Vote updated, consensus recalculated
- **Acceptance:** Vote switching works

#### TC-VOTE-006: Voting Rate Limit
- **Steps:**
  1. Post votes 101 times rapidly from same agent
- **Expected:** First 100 succeed, 101st returns 429
- **Acceptance:** Rate limiting enforced on voting

#### TC-VOTE-007: Get Proposal Votes
- **Steps:**
  1. Cast several votes on proposal "p1"
  2. GET `/api/consensus/vote?proposalId=p1`
- **Expected:** Returns proposal with all votes and consensus
- **Acceptance:** Vote retrieval works

### 5.7 Task Delegation

#### TC-DELEGATE-001: Propose Task Delegation
- **Steps:**
  1. POST `/api/tasks/[id]/delegate` with `{ targetAgentId: "bob", reason: "Too busy" }`
- **Expected:** Returns 200 with delegation status "PENDING"
- **Response Format:**
  ```json
  {
    "ok": true,
    "task": { ...updated task with delegations array... },
    "delegation": {
      "from": "alice",
      "to": "bob",
      "status": "PENDING",
      "proposedAt": "2026-03-03T12:00:00Z",
      "message": "Delegation proposal sent to bob"
    }
  }
  ```
- **Acceptance:** Delegation proposal recorded

#### TC-DELEGATE-002: Accept Delegation
- **Steps:**
  1. Propose delegation to bob
  2. PATCH `/api/tasks/[id]/delegate?action=accept` as bob (agent)
- **Expected:** Delegation status changes to "ACCEPTED", acceptedAt timestamp set
- **Acceptance:** Delegation accepted and tracked

#### TC-DELEGATE-003: Reject Delegation
- **Steps:**
  1. Propose delegation to bob
  2. PATCH `/api/tasks/[id]/delegate?action=reject` as bob
- **Expected:** Delegation status "REJECTED", task reverts to original owner
- **Acceptance:** Rejection handled correctly

#### TC-DELEGATE-004: Delegation Invalid Action
- **Steps:**
  1. PATCH `/api/tasks/[id]/delegate?action=invalid`
- **Expected:** Returns 400 with error "Missing or invalid 'action' query parameter"
- **Acceptance:** Input validation working

#### TC-DELEGATE-005: No Pending Delegation to Accept
- **Steps:**
  1. PATCH `/api/tasks/[id]/delegate?action=accept` on task with no pending delegation
- **Expected:** Returns 400 with error "No pending delegation for this task"
- **Acceptance:** Edge case handled

---

## 6. Performance Testing

### 6.1 Page Load Performance

| Page | Target | Tool |
|---|---|---|
| `/login` | < 1.5s (FCP) | Lighthouse |
| `/dashboard` | < 2s (LCP) | Lighthouse |
| `/tasks` | < 2s (LCP) | Lighthouse |
| `/integrations` | < 2s (LCP) | Lighthouse |

**Test Procedure:**
1. Run Lighthouse in Chrome DevTools
2. Throttle to "Slow 3G"
3. Measure First Contentful Paint (FCP), Largest Contentful Paint (LCP)
4. Target: Green (90+) performance score

### 6.2 API Response Times

| Endpoint | Target | Notes |
|---|---|---|
| `/api/openclaw/status` | < 100ms (demo) | Demo: instant, no network call |
| `/api/agents` | < 500ms | May include gateway call |
| `/api/dashboard/stats` | < 500ms | Parallel calls |
| `/api/chat` POST | < 200ms | Fire-and-forget, return runId immediately |

**Test Procedure:**
1. Use Postman / REST client
2. Make 10 requests to each endpoint
3. Calculate average response time
4. Verify all < target

### 6.3 Memory & Resource Usage

| Metric | Target |
|---|---|
| Initial Page Load (JS Bundle) | < 200KB (gzipped) |
| Memory Usage (idle) | < 50MB |
| Memory Usage (after 100 messages) | < 100MB |

**Test Procedure:**
1. Open DevTools Timeline/Performance tab
2. Record page load
3. Check JS bundle size (Network tab)
4. Monitor memory (Performance memory graph)

---

## 7. Security Testing

### 7.1 Authentication Security

#### TC-SEC-AUTH-001: Session Hijacking (XSS Prevention)
- **Test:** Attempt to inject `<script>alert(document.cookie)</script>` in any input
- **Expected:** Script sanitized, not executed
- **Acceptance:** DevTools console shows no errors, cookie not exposed

#### TC-SEC-AUTH-002: CSRF Protection
- **Test:** Submit form without CSRF token (if applicable)
- **Expected:** Request rejected with 403 or similar
- **Acceptance:** CSRF handled or Next.js default protection active

#### TC-SEC-AUTH-003: Session Cookie Flags
- **Test:** Check session cookie in DevTools → Application → Cookies
- **Expected:** HttpOnly flag set, Secure flag set (HTTPS), SameSite=Strict
- **Acceptance:** All security flags present

#### TC-SEC-AUTH-004: Brute Force Protection (Optional)
- **Test:** Submit wrong password 10+ times in rapid succession
- **Expected:** Rate limiting or temporary lockout
- **Acceptance:** No complete account lockout (to prevent DoS), but slowing or temporary block

### 7.2 Data Privacy

#### TC-SEC-DATA-001: User Data Endpoint Authorization
- **Test:** Login as demo user, try `GET /api/users` (admin-only endpoint)
- **Expected:** 403 Forbidden or silent failure
- **Acceptance:** User cannot access admin data

#### TC-SEC-DATA-002: Task Data Isolation
- **Test:** Login as User A, try to access User B's task via `/api/tasks/[other-user-task-id]`
- **Expected:** 404 or 403
- **Acceptance:** No cross-user data leakage

#### TC-SEC-DATA-003: Password Hash Storage
- **Test:** Inspect KV namespace in Cloudflare (if possible), verify password field
- **Expected:** Should be hashed (pbkdf2:...), never plaintext
- **Acceptance:** Passwords hashed with PBKDF2

### 7.3 Network Security

#### TC-SEC-NET-001: HTTPS Enforcement
- **Test:** Try to access http://aioc.askjary.com (plain HTTP)
- **Expected:** Redirects to https://aioc.askjary.com
- **Acceptance:** No unencrypted traffic

#### TC-SEC-NET-002: CORS Headers
- **Test:** Make cross-origin API call from browser (different domain)
- **Expected:** CORS rejection or correct allow headers
- **Acceptance:** Only intended origins allowed

#### TC-SEC-NET-003: Security Headers (CSP, X-Frame-Options, etc.)
- **Test:** Check response headers in DevTools Network tab
- **Expected:** Headers like `X-Frame-Options: DENY`, `Content-Security-Policy` present
- **Acceptance:** Security headers present and restrictive

---

## 8. Demo Mode Specific Tests

### 8.1 Demo Mode Activation Path

#### TC-DEMO-001: Demo Mode Environment Variable
- **Test:** Verify `DEMO_MODE=true` in wrangler.toml (production deployment)
- **Expected:** Cloudflare workers env bindings include `DEMO_MODE="true"`
- **Acceptance:** Demo mode active in production

#### TC-DEMO-002: Demo Credentials Work
- **Test:** Login with `demo-admin@example.com` / `Demo@12345`
- **Expected:** Login succeeds, user marked as demo admin
- **Acceptance:** All demo accounts functional

### 8.2 Demo Mode Mocked Gateway Behavior

#### TC-DEMO-003: No Timeout Errors
- **Test:**
  1. With real gateway offline, login to demo account
  2. Navigate to `/dashboard`, `/integrations`, `/tasks`
  3. Trigger `/api/chat`, `/api/briefing` POST requests
- **Expected:** All pages/APIs respond immediately (< 1s), no AbortSignal timeout errors
- **Acceptance:** "The operation was aborted due to timeout" error never occurs

#### TC-DEMO-004: getGatewayStatus() Returns Mocked Response
- **Test:** Call `GET /api/openclaw/status` as demo user
- **Expected:** Returns `{ connected: true, version: "demo", gatewayUrl: "...", ... }`
- **Acceptance:** No network call, instant response

#### TC-DEMO-005: sendToAgent() Returns Mock RunId
- **Test:** Call `POST /api/chat` with message as demo user
- **Expected:** Returns 202 with `{ ok: true, runId: "demo-{timestamp}" }`
- **Acceptance:** No network call, instant response

#### TC-DEMO-006: /api/agents Returns Agents with "online" Status (Demo)
- **Test:** Call `GET /api/agents` as demo user
- **Expected:** Returns agent array with status: "online"
- **Acceptance:** Demo gateway mock makes agents appear online

#### TC-DEMO-007: Dashboard Stats Show 10/10 Agents
- **Test:** Login as demo admin, view `/dashboard`
- **Expected:** "activeAgents: 10/10" (since gateway mocked as online)
- **Acceptance:** KPI reflects mocked healthy gateway

### 8.3 Demo Mode UI/UX Hints

#### TC-DEMO-008: Sidebar Gateway Status Dot (Demo Mode)
- **Test:** Login as demo admin, view sidebar
- **Expected:** Green pulsing dot (gateway online - mocked)
- **Acceptance:** Visual indicator correct

#### TC-DEMO-009: Integrations Banner (Demo Mode)
- **Test:** Navigate to `/integrations` as demo admin
- **Expected:** Banner shows "OpenClaw gateway is running" (green), version "demo"
- **Acceptance:** Banner text and color match demo state

---

## 9. Responsive Design Tests

### 9.1 Mobile (< 768px)

#### TC-RESP-MOB-001: Hamburger Menu Visible & Functional
- **Test:** Resize to iPhone width (390px)
- **Expected:** Sidebar hidden, hamburger menu visible, toggles drawer
- **Acceptance:** Mobile drawer works smoothly

#### TC-RESP-MOB-002: Content Readability
- **Test:** View dashboard, tasks, board on mobile
- **Expected:** Text readable, buttons tap-friendly (≥ 44px)
- **Acceptance:** No horizontal scroll, good UX

#### TC-RESP-MOB-003: Touch Interactions
- **Test:** Tap nav links, buttons, inputs on mobile device
- **Expected:** No lag, ripple/feedback visible
- **Acceptance:** Touch events responsive

### 9.2 Tablet (768px - 1024px)

#### TC-RESP-TAB-001: Layout Optimization
- **Test:** View pages on iPad width
- **Expected:** Sidebar visible at smaller size or responsive grid
- **Acceptance:** Content well-organized

### 9.3 Desktop (> 1024px)

#### TC-RESP-DESK-001: Full Sidebar Visible
- **Test:** Resize to desktop (1440px+)
- **Expected:** Full sidebar always visible, expand on hover
- **Acceptance:** Desktop UX works as designed

---

## 10. Cross-Browser Testing

### 9.1 Chrome 130

- **Steps:** Run all TC tests on latest Chrome
- **Expected:** All tests pass, no console errors
- **Acceptance:** Baseline browser works perfectly

### 9.2 Firefox 131

- **Steps:** Run core tests (auth, dashboard, chat, API)
- **Expected:** All tests pass
- **Acceptance:** Firefox compatibility verified

### 9.3 Safari 17

- **Steps:** Run core tests on macOS Safari
- **Expected:** All tests pass (watch for async/await compatibility)
- **Acceptance:** Safari compatibility verified

### 9.4 Edge 131

- **Steps:** Run core tests on Edge
- **Expected:** All tests pass
- **Acceptance:** Chromium-based browsers all work

---

## 11. Cloudflare Workers Deployment Tests

### 11.1 KV Namespace Operations

#### TC-CF-KV-001: User Data Persistence
- **Test:**
  1. Login with `andrew@upnx.asia`
  2. Check KV contains `user:andrew@upnx.asia` key
  3. Update user profile
  4. Verify KV updated
- **Expected:** User data read/written to KV successfully
- **Acceptance:** KV operations working

#### TC-CF-KV-002: Session Persistence Across Restarts
- **Test:**
  1. Login and create session
  2. Restart worker (new deployment)
  3. Use same session cookie to access protected route
- **Expected:** Session still valid
- **Acceptance:** KV-backed sessions survive worker restart

#### TC-CF-KV-003: Key Index Consistency
- **Test:** Verify `users_index` key contains all user emails
- **Expected:** Index matches actual user records in KV
- **Acceptance:** Index consistency maintained

### 11.2 Cloudflare Workers Performance

#### TC-CF-PERF-001: Cold Start Time
- **Test:** Monitor worker startup time on first request after deploy
- **Expected:** < 50ms (typical Cloudflare cold start)
- **Acceptance:** Performance baseline acceptable

#### TC-CF-PERF-002: Geography Routing
- **Test:** Request from different geographic regions
- **Expected:** All requests < 200ms (Cloudflare edge latency)
- **Acceptance:** Global distribution working

#### TC-CF-PERF-003: Worker Logs
- **Test:** Check Cloudflare dashboard → Logs for errors
- **Expected:** No 500-level errors, only expected 4xx for invalid inputs
- **Acceptance:** Worker running cleanly

### 11.3 Asset Serving

#### TC-CF-ASSET-001: Static Asset Caching
- **Test:** Request `/BUILD_ID`, CSS, JS files
- **Expected:** Cache-Control headers set appropriately, 304 Not Modified on second request
- **Acceptance:** Assets cached and served efficiently

#### TC-CF-ASSET-002: Asset Freshness After Deploy
- **Test:** Deploy new version, verify new assets fetched
- **Expected:** Old CSS/JS not cached from stale version
- **Acceptance:** No stale assets served

---

## 12. Error Handling & Edge Cases

### 12.1 Gateway Offline Scenarios

#### TC-ERR-GATEWAY-001: Real Gateway Offline (Production Mode)
- **Test:** Stop OpenClaw gateway, navigate to `/dashboard`
- **Expected:** Dashboard shows 0 agents, gateway status "offline", no UI crash
- **Acceptance:** Graceful degradation, fallback mock data works

#### TC-ERR-GATEWAY-002: Timeout Handling in API Calls
- **Test:** Simulate slow gateway (3s+ response), make API call
- **Expected:** Call times out after 3s, returns error, no infinite hang
- **Acceptance:** Timeouts handled, error returned to user

#### TC-ERR-GATEWAY-003: API Error Responses (5xx, 4xx)
- **Test:** Mock gateway returning 502, 503
- **Expected:** API route returns appropriate error, UI shows message
- **Acceptance:** User aware of issue, no silent failures

### 12.2 Database / KV Errors

#### TC-ERR-KV-001: KV Read Failure
- **Test:** Temporarily disable KV access (test env), try to login
- **Expected:** Error message shown, no server crash
- **Acceptance:** Graceful error handling

#### TC-ERR-KV-002: Concurrent Write Conflict
- **Test:** Simulate two users updating same record
- **Expected:** Last write wins, or conflict resolved via timestamp
- **Acceptance:** No data corruption

### 12.3 Network Errors

#### TC-ERR-NET-001: Fetch Failure (No Internet)
- **Test:** Open DevTools, throttle to offline, try to load page
- **Expected:** Error message or offline cache (if implemented)
- **Acceptance:** User aware of offline state

#### TC-ERR-NET-002: Slow Network (3G Throttle)
- **Test:** Enable DevTools throttle "Slow 3G", navigate pages
- **Expected:** Page loads (slowly but successfully), no timeouts
- **Acceptance:** App usable on slow connections

### 12.4 Invalid Input Handling

#### TC-ERR-INPUT-001: SQL Injection Attempt
- **Test:** Enter `'; DROP TABLE users; --` in any input, submit
- **Expected:** Treated as literal string, not executed
- **Acceptance:** No SQL injection possible (KV-based, no SQL)

#### TC-ERR-INPUT-002: XSS Script Injection
- **Test:** Enter `<script>alert('xss')</script>` in message/task input
- **Expected:** Displayed as HTML entity or sanitized
- **Acceptance:** Script not executed in page

#### TC-ERR-INPUT-003: Large Input / File Upload DoS
- **Test:** Try to upload massive file or enter 1MB text in input
- **Expected:** Rejected with size limit error or request canceled
- **Acceptance:** No memory exhaustion

---

## 13. Regression Testing (Post-Deploy)

### 13.1 Core User Flows

#### TC-REG-001: Full Authentication Flow
1. Logout completely
2. Navigate to `/login`
3. Enter invalid creds → see error
4. Enter valid creds → login succeeds
5. View profile
6. Logout → redirected to login

#### TC-REG-002: Full Demo Mode Flow
1. Logout
2. Login with `demo-admin@example.com`
3. View dashboard (no timeout)
4. Send chat message (instant response)
5. View integrations (gateway shows "online")
6. Logout

#### TC-REG-003: Full Production Mode Flow (if gateway available)
1. Login with `andrew@upnx.asia`
2. View dashboard (shows real agent count if gateway online)
3. Send chat message (should route to real gateway if available)
4. View integrations (shows actual gateway status)

---

## 14. Test Execution Schedule

| Phase | Duration | Scope | Deadline |
|---|---|---|---|
| **Unit Tests** | 1 day | Auth, password hashing, demo mode logic | Mar 4 |
| **Integration Tests** | 2 days | API endpoints, demo/prod flows, gateway mocking | Mar 5-6 |
| **Sprint 2 Phase 2 Agent Tests** | 1.5 days | Rate limiting, health monitoring, heartbeat, workflows, consensus, delegation | Mar 7-8 |
| **Performance Tests** | 1 day | Lighthouse, API response times, memory, rate limit overhead | Mar 9 |
| **Security Tests** | 1 day | CORS, CSP, auth bypass attempts, rate limit edge cases | Mar 10 |
| **Cross-Browser & Responsive** | 1 day | Chrome, Firefox, Safari, mobile, tablet | Mar 11 |
| **Cloudflare Workers Tests** | 1 day | KV ops, asset serving, worker logs, agent data persistence | Mar 12 |
| **Regression & Sign-Off** | 1 day | Full flows, smoke tests, agent coordination, final QA | Mar 13 |

**Total:** ~10 days (can be parallelized)

---

## 15. Pass/Fail Criteria

### 15.1 PASS Criteria

✅ All authentication flows work (production + demo)  
✅ No "timeout" errors in demo mode  
✅ Dashboard loads < 2s  
✅ API endpoints return correct schema  
✅ Gateway status reflects actual state (real or mocked)  
✅ Security headers present  
✅ No console errors in browser  
✅ Mobile responsive (< 768px)  
✅ Cross-browser compatibility (Chrome, Firefox, Safari, Edge)  
✅ KV persistence working  
✅ Rate limiting enforced (429 after limit exceeded)  
✅ Agent health monitoring works (online/offline/crashed states)  
✅ Heartbeat endpoint accessible without auth  
✅ Workflow validation prevents cycles  
✅ Consensus voting calculates majority correctly  
✅ Task delegation proposal tracking working  

### 15.2 FAIL Criteria

❌ Login fails with valid credentials  
❌ "The operation was aborted due to timeout" errors appear  
❌ API endpoints return 5xx errors  
❌ Dashboard or critical pages don't load  
❌ XSS scripts execute in page  
❌ CORS blocks legitimate requests  
❌ Session doesn't persist across reload  
❌ Mobile layout breaks (horizontal scroll, unclickable buttons)  
❌ Performance > 3s (LCP)  
❌ Rate limiting not enforced (requests > limit allowed through)  
❌ Agent health status doesn't update after heartbeat  
❌ Workflow cycles not detected  
❌ Consensus calculation incorrect (wrong status or percentage)  

---

## 16. Known Limitations & Future Work

### Current Deployment Limitations (Pre-Sprint 2 Phase 2)

1. **OpenClaw Gateway:** Not running in production (demo mode mocks it)
   - *Workaround:* Demo mode provides mocked responses
   - *Todo:* Deploy OpenClaw gateway when ready

2. **Real Agent Communication:** WebSocket events (agent replies) not flowing (no real gateway)
   - *Workaround:* Chat interface shows "generating" status, real runIds in demo
   - *Todo:* Connect real OpenClaw WebSocket after deployment

3. **Third-Party Integrations (Notion, Zoho, BuildOS):** Not wired up
   - *Workaround:* Integration page shows placeholders
   - *Todo:* Implement OAuth flows and API integrations

4. **No Email Service:** Password reset sends to mock (email.ts)
   - *Todo:* Wire up Resend API for real email sending

### Completed (Sprint 2 Phase 2)

✅ **Rate Limiting:** Per-agent rate limiting implemented (100/min, 500/hour, 10K/day)
✅ **Agent Health Monitoring:** Heartbeat-based liveness detection (online/offline/crashed states)
✅ **Workflow Validation:** Cycle detection and reachability analysis
✅ **Consensus Voting:** Multi-agent voting with majority threshold calculation
✅ **Task Delegation:** Proposal tracking with accept/reject workflow

### Remaining Limitations

- Task delegation approval still manual (no automated matching logic)
- Workflow conflict detection warns but allows overlaps
- No agent prioritization/QoS tiers yet
- Health check loop is in-memory (no distributed health across workers)

### Future Enhancements

- [ ] Agent prioritization/QoS (high/medium/low)
- [ ] Automated task matching/assignment
- [ ] Monitoring dashboard (real-time agent health)
- [ ] Alert webhooks (Slack, PagerDuty)
- [ ] End-to-end (E2E) testing with Playwright/Cypress
- [ ] Load testing with 100+ concurrent users
- [ ] Accessibility testing (WCAG 2.1 AA compliance)
- [ ] Observability (error tracking, metrics, distributed tracing)
- [ ] Performance regression alerts

---

## 17. Testing Tools & Resources

### Tools

| Tool | Purpose |
|---|---|
| **Postman** | API testing, collection management |
| **Chrome DevTools** | Performance, memory, console debugging |
| **Lighthouse CI** | Automated performance audits |
| **Cloudflare Dashboard** | KV monitoring, worker logs, deployments |
| **curl / REST Client** | Quick API tests |
| **BrowserStack** (optional) | Cross-browser testing on real devices |

### Documentation

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [OpenNext Cloudflare Adapter](https://github.com/opennextjs/opennextjs-cloudflare)

---

## 18. Sign-Off & Approval

| Role | Name | Status | Date |
|---|---|---|---|
| QA Lead | — | ⬜ Pending | — |
| Dev Lead | — | ⬜ Pending | — |
| Product Manager | — | ⬜ Pending | — |
| DevOps / Infrastructure | — | ⬜ Pending | — |

---

## 19. Appendices

### A. Test Data

**Production Account:**
```
Email:    andrew@upnx.asia
Password: Upnx@2019!
Role:     admin
Status:   Active
```

**Demo Accounts:**
```
Email:    demo-admin@example.com
Password: Demo@12345
Role:     admin

Email:    demo-user@example.com
Password: Demo@12345
Role:     user
```

### B. Environment Variables Checklist

Production (wrangler.toml):
- ✅ `DEMO_MODE = "true"` (for demo account support)
- ✅ `OPENCLAW_DEFAULT_AGENT_ID = "hooks"`
- ✅ `OPENCLAW_SESSION_PREFIX = "webchat"`
- ✅ `OPENCLAW_GATEWAY_URL = "https://oc.askjary.com"`
- ✅ `API_SERVER_URL = "https://api.askjary.com"`
- ✅ `APP_URL = "https://aioc.askjary.com"`
- ✅ KV Namespace ID for `USERS_KV`

### C. Bug Report Template

```markdown
## Bug: [Title]

**Severity:** Critical / High / Medium / Low

**Environment:** Production / Staging / Local (Dev)

**Reproduction Steps:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots / Error Logs:**
[Attach if applicable]

**Browser / Device:**
[Chrome 130 on macOS / iPhone 14 / etc.]

**Assigned To:** —
```

---

**Document End**

---

**Revision History:**

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | Mar 3, 2026 | AI Assistant | Initial comprehensive testing plan |

---
