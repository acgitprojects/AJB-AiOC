# AiOC (aioc.askjary.com) – Production Account Testing Plan
## Version 2.0 - Production Focus with Agent Engagement Scenarios

**Focus:** Production Account ONLY (`andrew@upnx.asia` / `Upnx@2019!`)  
**Date:** March 3, 2026  
**Status:** Ready for QA  

---

## 1. Executive Summary

This plan focuses **exclusively on production-level testing** with the real account (`andrew@upnx.asia`) running against a LIVE or mocked OpenClaw gateway. Key areas:

1. **Human-Agent Engagement** — real-time communication with AI agents (Jary, Casey, Alex, Jordan, Riley, Morgan)
2. **Agent-Generated Content** — briefings, reports, data pulls from integrations
3. **Smart Task Management** — automated task creation, assignment, scheduling
4. **Appointment Booking & Reminders** — calendar integration, meeting creation, notification flow
5. **Latency & Responsiveness** — real-world performance under production conditions
6. **Logic Bug Hunting** — edge cases, race conditions, state inconsistencies

---

## 2. Production Account Setup

| Field | Value |
|---|---|
| **Email** | `andrew@upnx.asia` |
| **Password** | `Upnx@2019!` |
| **Role** | `admin` |
| **Default Agent** | `hooks` (fallback to Jary) |
| **Session TTL** | 7 days |

### 2.1 Production Deployment Details

```
Live:           https://aioc.askjary.com
KV Namespace:   baa20bd090f44070ba79f34a1ebc780e
Worker:         ajb-ops-centre
Account ID:     a6dce41188371c9e1bbec2c280799325
Env Vars:       DEMO_MODE=true (for fallback), OPENCLAW_GATEWAY_URL=https://oc.askjary.com
```

---

## 3. Agent Engagement Scenarios

### 3.1 Agent Roster & Availability

**Known Agents (from lib/mock-data.ts):**
- 🧠 **Jary** (ID: `jary`) — Master orchestrator, briefings, coordination
- 🏗️ **Casey** (ID: `casey`) — DevOps, BuildOS monitoring, deployment tracking
- 💼 **Alex** (ID: `alex`) — Sales pipeline, BuildOS sales, CRM data
- 📋 **Jordan** (ID: `jordan`) — Ops, Notion database manager, task coordination
- 🆘 **Riley** (ID: `riley`) — Helpdesk, support tickets, customer issues
- 💰 **Morgan** (ID: `morgan`) — Finance, Zoho Books, P&L, cashflow

#### TC-AGENT-001: Agent Roster Availability
- **Test:** `GET /api/agents`
- **Expected (Real Gateway Online):** All 6 agents with `status: "online"`
- **Expected (Gateway Offline):** All agents with `status: "offline"` or mocked as online
- **Assertion:** Array length = 6, each has `{ id, name, description, status, capabilities }`

#### TC-AGENT-002: Agent Profile Data Completeness
- **Test:** Verify each agent object contains:
  - `capabilities` (array of strings, e.g., ["email_sync", "report_generation"])
  - `avatar` or `color`
  - `responseTimeMs` (if available)
- **Expected:** All required fields present
- **Logic Bug Check:** Missing capabilities could cause task assignment failures

### 3.2 Human-to-Agent Communication (Chat)

#### TC-CHAT-AGENT-001: Send Message to Specific Agent
- **Test:**
  1. Login with production account
  2. Navigate to `/agent` or chat interface
  3. Send: "Casey, what's the deployment status for BuildOS?"
  4. Specify agent: `casey`
- **Expected:** 
  - API returns 202 with `{ ok: true, runId: "unique-id" }`
  - WebSocket listener should eventually receive `{ type: "chat.reply", body: { ... } }`
- **Latency:** API call < 200ms, agent reply < 5s (real gateway)

#### TC-CHAT-AGENT-002: Broadcast Message to All Agents
- **Test:** Send message without specifying `agentId` (defaults to `hooks`)
- **Expected:** Message routed to default agent (`hooks` → Jary)
- **Assertion:** Correct agent receives message

#### TC-CHAT-AGENT-003: Agent Reply Arrives via WebSocket
- **Test:**
  1. Send chat message
  2. Keep WebSocket connection open
  3. Listen for "chat.reply" event frame
- **Expected:** Reply arrives with `{ runId, agentId, message, timestamp }`
- **Latency Check:** 
  - Real gateway: 2-10s typical
  - Mock/demo: instant (1s or less)
- **Logic Bug:** Check for runId mismatch (reply for wrong request)

#### TC-CHAT-AGENT-004: Agent Context Memory
- **Test:**
  1. Send message 1: "What is our Q1 revenue target?"
  2. Send message 2: "How does that compare to Q4?" (should reference Q1 context)
  3. Verify agent remembers context
- **Expected:** Agent reply references Q1 figure from message 1
- **Logic Bug:** Stateless agents might always ask for context clarification

#### TC-CHAT-AGENT-005: Rate Limiting on Agent Messages
- **Test:** Send 20 messages in rapid succession (< 1s apart)
- **Expected:**
  - Early messages (1-10) processed normally
  - Later messages queued or rate-limited (if implemented)
  - No server crash or 500 errors
- **Logic Bug:** Unbounded message queue could exhaust memory

---

## 4. Agent-Generated Content & Insights

### 4.1 Daily Briefing Generation

#### TC-BRIEF-AGENT-001: Trigger Briefing Generation
- **Test:**
  1. POST `/api/briefing` (POST triggers generation)
  2. Include optional agent override: `{ agentId: "jary" }`
- **Expected:** 
  - Status 202 with `{ status: "generating", runId: "..." }`
  - Briefing contains: email triage, today's schedule, pending tasks, headlines, financial pulse
- **Latency:** Generation request returns immediately (202), actual brief < 10s

#### TC-BRIEF-AGENT-002: Briefing Content Quality
- **Test:** Request briefing, verify sections populated:
  - **Email Triage:** Top 3-5 emails with sentiment
  - **Schedule:** Today's meetings from `/api/calendar`
  - **Tasks:** Top pending items
  - **Headlines:** News relevant to AJB/BuildOS
  - **Financial Pulse:** Revenue, burn rate (from Zoho Books if integrated)
- **Expected:** All sections non-empty and relevant
- **Logic Bug:** Could be pulling stale data if caches aren't invalidated

#### TC-BRIEF-AGENT-003: Briefing Timestamp Validation
- **Test:** 
  1. Request briefing at 9:00 AM
  2. Get `generatedAt: "09:00:15"`
  3. Request again at 9:00:30
  4. Should get NEW timestamp (freshly generated, not cached)
- **Expected:** Two requests produce two different timestamps
- **Logic Bug:** Overly aggressive caching could serve stale briefing

#### TC-BRIEF-AGENT-004: Briefing with No Data
- **Test:** Clear Notion database for "Tasks", Zoho for "Invoices"
- **Expected:** Briefing still loads, sections gracefully show "No pending tasks" etc.
- **Assertion:** No null reference errors, UI shows helpful message

### 4.2 Real-Time Data Pulls from Integrations

#### TC-DATA-PULL-001: BuildOS Integration
- **Test:** Agent Casey pulls BuildOS deployment data
  1. Send chat: "Casey, pull latest deploy info"
  2. Verify API call to BuildOS REST API
- **Expected:** Response includes deploy status, subscriber count, incidents
- **Latency:** < 3s (API rate limit aware)

#### TC-DATA-PULL-002: Notion Sync
- **Test:** Agent Jordan syncs Notion databases
  1. Send: "Jordan, sync all Notion databases"
  2. Monitor Notion token headers (auth)
- **Expected:** Connect using `NOTION_API_TOKEN`
- **Assertion:** No auth failures, correct data returned

#### TC-DATA-PULL-003: Zoho CRM Lookup
- **Test:** Agent Alex queries CRM
  1. Send: "Alex, give me the AJB pipeline"
- **Expected:** CRM connected, pipeline stages + deal count returned
- **Assertion:** 200 OK, correct schema (if integrated)
- **Logic Bug:** Expired OAuth token could cause 401 silently

#### TC-DATA-PULL-004: Cache Invalidation
- **Test:**
  1. Request BuildOS data (cached)
  2. Update something in BuildOS
  3. Request again (should be fresh)
- **Expected:** New data reflected, no stale cache
- **Logic Bug:** TTL not set or too long could cause stale reads

---

## 5. Smart Task Management

### 5.1 Automated Task Creation

#### TC-TASK-AUTO-001: Agent Creates Task (Chat Trigger)
- **Test:**
  1. Send message: "Riley, create a task: 'Follow up with customer X, high priority, due tomorrow'"
  2. Verify task appears in `/tasks`
- **Expected:**
  - Task created with title, priority, due date
  - Assigned to Riley or unassigned (depends on design)
  - Appears in UI within 2s
- **Latency:** < 500ms task creation API response

#### TC-TASK-AUTO-002: Task Deduplication
- **Test:**
  1. Send same task creation message twice
  2. Check task list
- **Expected:** Only one task created (or two with different IDs but system warns user)
- **Logic Bug:** Duplicate tasks if idempotency key missing

#### TC-TASK-AUTO-003: Task Routing Based on Priority
- **Test:**
  1. Create low-priority task (e.g., "Review docs")
  2. Create high-priority task (e.g., "Critical bug fix")
  3. Verify high-priority shows first in sorted list
- **Expected:** Tasks sorted by priority DESC, then due date
- **Assertion:** Correct sort order in UI

#### TC-TASK-AUTO-004: Task Assignment Chain
- **Test:**
  1. Create task assigned to Riley (helpdesk)
  2. Riley marks as "Needs escalation"
  3. Auto-escalate to Jordan (ops lead)
  4. Verify task reassigned
- **Expected:** Task history shows: Created → Assigned to Riley → Escalated to Jordan
- **Logic Bug:** Assignment history not tracked could lose audit trail

### 5.2 Task Lifecycle & Status Transitions

#### TC-TASK-LIFECYCLE-001: Valid State Transitions
- **Test:** Move task through states:
  1. New → In Progress
  2. In Progress → Review
  3. Review → Done
- **Expected:** All transitions successful
- **Assertion:** No "invalid transition" errors

#### TC-TASK-LIFECYCLE-002: Invalid State Transition Rejection
- **Test:** Try to move task:
  1. New → Done (skipping steps)
- **Expected:**
  - Either: Rejected with "Cannot transition from New to Done"
  - Or: Auto-complete intermediate steps
- **Logic Bug:** Enforcing strict workflows might block legitimate use cases

#### TC-TASK-LIFECYCLE-003: Task Completion Triggers Downstream Actions
- **Test:**
  1. Complete a task marked "Trigger briefing refresh"
  2. Verify briefing regenerates automatically
- **Expected:** Task completion triggers dependent actions
- **Latency:** < 1s trigger response

#### TC-TASK-LIFECYCLE-004: Overdue Task Alerts
- **Test:**
  1. Create task with due date = yesterday
  2. Check `/api/users/alerts` (or notification system)
- **Expected:** Alert generated for overdue task
- **Assertion:** Alert contains task ID, overdue by X days

### 5.3 Task Bulk Operations

#### TC-TASK-BULK-001: Bulk Mark Complete
- **Test:**
  1. Select 5 tasks
  2. Click "Mark Complete"
- **Expected:** All 5 transition to Done state
- **Latency:** < 1s for bulk operation
- **Logic Bug:** Partial success (3 succeed, 2 fail) needs error handling

#### TC-TASK-BULK-002: Bulk Reassign
- **Test:**
  1. Select 3 tasks assigned to Riley
  2. Reassign all to Jordan
- **Expected:** All 3 now assigned to Jordan
- **Assertion:** Reassignment recorded in history

---

## 6. Appointment Booking & Calendar Management

### 6.1 Calendar Integration

#### TC-CAL-BOOK-001: View Calendar for Available Slots
- **Test:**
  1. Navigate to `/calendar`
  2. View March 2026, find free slots
- **Expected:** Calendar shows all events (if connected to any calendar)
- **Assertion:** Correct month/dates displayed

#### TC-CAL-BOOK-002: Create Meeting from Chat
- **Test:**
  1. Send message: "Schedule meeting with BuildOS team, March 10, 2-3pm"
  2. Verify meeting created in calendar
- **Expected:**
  - Meeting added to `/api/calendar`
  - Time slot now shows as "Booked"
- **Latency:** Meeting creation < 500ms

#### TC-CAL-BOOK-003: Appointment Conflict Detection
- **Test:**
  1. Book meeting: March 10, 2-3pm
  2. Try to book another: March 10, 2:30-3:30pm (overlaps)
- **Expected:**
  - Conflict detected
  - Warning or rejection: "Time slot overlaps with BuildOS meeting"
- **Logic Bug:** No conflict detection = double-booked meetings

#### TC-CAL-BOOK-004: Calendar Sync (if external calendar enabled)
- **Test:**
  1. Create meeting in AiOC
  2. Check external calendar (Google Calendar, Outlook)
- **Expected:** Meeting appears on external calendar
- **Assertion:** Bi-directional sync working

#### TC-CAL-BOOK-005: Recurring Meetings
- **Test:**
  1. Create recurring meeting: "Weekly standup, Mondays 10am, for 12 weeks"
  2. Verify 12 instances created
- **Expected:** 12 calendar events generated
- **Assertion:** Recurrence logic correct

#### TC-CAL-BOOK-006: Timezone Handling
- **Test:**
  1. Create meeting: 2pm Singapore time
  2. Check if user in US timezone sees converted time (e.g., 1am prev day)
- **Expected:** Timezone correctly applied
- **Latency:** Timezone conversion < 50ms

---

## 7. Reminders & Notifications

### 7.1 Reminder Types

#### TC-REM-TASK-001: Task Due Reminder
- **Test:**
  1. Create task due tomorrow, 9am
  2. Check `/api/users/alerts` endpoint
  3. Next day, 8:30am: reminder should fire
- **Expected:** Notification sent (email, in-app, push)
- **Assertion:** Reminder content includes task title and due time

#### TC-REM-TASK-002: Task Overdue Reminder
- **Test:**
  1. Task due yesterday, not yet completed
  2. Check for overdue alert
- **Expected:** Alert escalates (1 day overdue, 2 days, 3 days = increasing urgency)
- **Logic Bug:** Alerts might not escalate after first notification

#### TC-REM-MEETING-001: Meeting Reminder
- **Test:**
  1. Schedule meeting next Tuesday, 2pm
  2. Next Tuesday, 1:30pm: reminder should fire
- **Expected:** 30-min advance notification
- **Assertion:** Includes meeting title, time, attendees

#### TC-REM-MEETING-002: Meeting Reminder Canceled
- **Test:**
  1. Schedule meeting
  2. Cancel meeting
  3. Verify reminder is also canceled (doesn't fire)
- **Expected:** No orphaned reminders for canceled meetings
- **Logic Bug:** Reminders not cleaned up = spam notifications

### 7.2 Reminder Delivery Channels

#### TC-REM-NOTIF-001: In-App Notification
- **Test:**
  1. Create alert
  2. Check UI notification badge on sidebar
- **Expected:** Red badge with count appears
- **Latency:** Badge updates < 500ms

#### TC-REM-NOTIF-002: Email Notification
- **Test:**
  1. Create high-priority task or meeting reminder
  2. Check email inbox
- **Expected:** Email arrives with task/meeting details
- **Assertion:** Email template clean, no broken links

#### TC-REM-NOTIF-003: Mute/Snooze Reminder
- **Test:**
  1. Task reminder fires
  2. Click "Snooze for 1 hour"
- **Expected:** Reminder reschedules for 1 hour later
- **Assertion:** Same reminder fires again (not forgotten)

#### TC-REM-NOTIF-004: Bulk Mark Reminders Read
- **Test:**
  1. 5 alerts accumulate
  2. Click "Mark all as read"
- **Expected:** All reminders cleared from badge
- **Assertion:** Badge count = 0

### 7.3 Alert Rules & Preferences

#### TC-ALERT-PREF-001: Change Alert Frequency
- **Test:**
  1. User settings: "Receive daily digest instead of real-time alerts"
  2. Create 5 tasks
  3. Next day: single digest email
- **Expected:** All 5 tasks in one email, not 5 separate emails
- **Assertion:** Digest preference honored

#### TC-ALERT-PREF-002: Mute Specific Agent Alerts
- **Test:**
  1. Settings: "Mute alerts from Casey"
  2. Casey generates alert
- **Expected:** Alert NOT shown/sent
- **Assertion:** Selective muting works

#### TC-ALERT-PREF-003: Critical Alert Bypass
- **Test:**
  1. Mute all alerts
  2. Create "Critical" priority task
- **Expected:** Critical still fires (overrides mute)
- **Assertion:** Severity tiers respected

---

## 8. Responsiveness Testing (Real Device Performance)

### 8.1 Browser Responsiveness (Real Production Account)

#### TC-RESP-01: Login → Dashboard Navigation
- **Test:** Measure time from login attempt to dashboard fully loaded
- **Expected:** < 1.5 seconds on fiber connection
- **Device:** 
  - Desktop: 1440x900 Chrome
  - Tablet: iPad Air (768x1024)
  - Mobile: iPhone 14 (390x844)
  
**Steps:**
```
1. Open https://aioc.askjary.com/login in DevTools (Performance tab)
1. Clear cookies
2. Start recording
3. Enter andrew@upnx.asia + Upnx@2019!
4. Click Sign in
5. Wait for dashboard to render
6. Stop recording
```

**Metrics:**
- **FCP (First Contentful Paint):** < 800ms
- **LCP (Largest Contentful Paint):** < 1500ms
- **INP (Interaction to Next Paint):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

#### TC-RESP-02: Dashboard → Tasks Navigation
- **Test:** Click Tasks in sidebar, measure load time
- **Expected:** < 800ms
- **Performance Timeline:**
  - Click Tasks link: 0ms
  - Route transition: 50-100ms
  - Data fetch (GET /api/tasks): 100-300ms
  - Render task list: 200-400ms
  - Total: < 800ms

#### TC-RESP-03: Dashboard → Chat (Agent Engage)
- **Test:** Navigate to `/agent`, send message, measure response
- **Expected:**
  - Page load: < 1s
  - Message send (POST /api/chat): < 200ms response
  - UI shows "generating" state within 100ms
  - Agent reply arrives: 2-10s (dependent on real gateway)

#### TC-RESP-04: Sidebar Drawer (Mobile)
- **Test:** On mobile, click hamburger, measure drawer slide-in
- **Expected:** Animation smooth (60 fps), completes < 300ms
- **Device:** iPhone 14 (390x844)
- **Tools:** Chrome DevTools Performance, record with DevTools

#### TC-RESP-05: Keyboard & Input Responsiveness
- **Test:**
  1. Navigate to chat input
  2. Type fast: "Hello, this is a test message"
  3. Measure keystroke-to-display latency
- **Expected:** < 16ms per keystroke (60 fps)
- **Logic Bug Check:** Debounced inputs might delay feedback

### 8.2 Mobile-Specific Responsiveness

#### TC-RESP-MOB-01: Touch Response Time
- **Test:** On iPhone 14, tap buttons (sidebar nav, send button, etc.)
- **Expected:** Immediate visual feedback (ripple/highlight)
- **Measure:** Time from tap to visual feedback < 50ms

#### TC-RESP-MOB-02: Scroll Performance
- **Test:** Navigate to long task list, scroll rapidly
- **Expected:** 60 fps scroll (no jank/stutter)
- **Device:** iPhone 14 Pro, profile in Safari DevTools

#### TC-RESP-MOB-03: Orientation Change
- **Test:**
  1. Portrait mode: view dashboard
  2. Rotate to landscape
  3. Verify layout adjusts
- **Expected:** No white space, content readable
- **Latency:** Orientation adjustment < 300ms

#### TC-RESP-MOB-04: Memory Usage on Mobile
- **Test:** Keep app open for 5 minutes, perform actions (send messages, navigate)
- **Expected:** Memory usage < 100MB
- **Device:** iPhone 14 (4GB RAM)
- **Tool:** Xcode Instruments → Memory

### 8.3 Network Latency Testing

#### TC-LATENCY-01: API Response Times (Network Throttle)
**Steps:**
1. DevTools → Network → Throttle to "Slow 4G"
2. Measure endpoint responses:

| Endpoint | Expected | Actual |
|---|---|---|
| `GET /api/agents` | < 800ms | __ ms |
| `GET /api/tasks` | < 800ms | __ ms |
| `POST /api/chat` | < 200ms | __ ms |
| `GET /api/briefing` | < 1500ms | __ ms |
| `POST /api/briefing` | < 200ms (202) | __ ms |
| `GET /api/openclaw/status` | < 100ms (mock) / < 500ms (real) | __ ms |

#### TC-LATENCY-02: Gateway Call Latency (Real vs Mock)
- **Test Real Gateway:**
  ```
  gateway: https://oc.askjary.com
  Request: GET /healthz
  Expected: < 500ms
  Actual: ___ ms
  ```

- **Test Mock Gateway (Demo Mode):**
  ```
  Scenario: DEMO_MODE=true
  Request: GET /api/openclaw/status
  Expected: < 50ms (instant, no network)
  Actual: ___ ms
  ```

#### TC-LATENCY-03: WebSocket Connection Time
- **Test:** Connect to OpenClaw WebSocket
  ```
  Connect to: wss://gw.upnx.asia
  Time to open: ___ ms (should be < 1000ms)
  Verify auth: ___ ms
  ```

#### TC-LATENCY-04: Chat Message Round-Trip Latency
- **Scenario:** Send chat message, receive reply
  ```
  1. Start timer: Time A
  2. Send: POST /api/chat → Get runId (Time B = A + latency_request)
  3. Wait for WebSocket reply frame (Time C)
  4. Total round-trip: C - A
  
  Expected: < 3s (real gateway available)
  Expected: < 1s (demo mode)
  ```

#### TC-LATENCY-05: 3G/4G vs WiFi Comparison
- **Test on Physical Device:**
  1. Disable WiFi, use cellular (4G)
  2. Measure dashboard load time: ___ms
  3. Re-enable WiFi
  4. Measure dashboard load time: ___ms
  5. Calculate difference

| Connection | Dashboard Load | API Response | Notes |
|---|---|---|---|
| WiFi (100 Mbps) | __ms | __ms | Baseline |
| 4G LTE (20 Mbps) | __ms | __ms | Acceptable if < 2.5s |
| 3G (5 Mbps) | __ms | __ms | Should still work |

---

## 9. Logic Bug Hunting

### 9.1 State Management Issues

#### Bug-001: Session Token Expiration
- **Symptom:** User logged in 7+ days, suddenly logged out
- **Root Cause Check:** Token expiration logic in `/api/auth/*`
- **Test:**
  1. Check `SESSION_MAX_AGE` in login route → should be 7 days (604800s)
  2. Simulate token near expiry, make API call
  3. Should either refresh token or require re-login
  
**Code Location:** [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L20)

#### Bug-002: KV Read/Write Race Condition
- **Symptom:** Two simultaneous task updates might lose data
- **Root Cause Check:** User store doesn't use transactions (KV is atomic per key, but not cross-key)
- **Test:**
  1. Create 2 concurrent requests to update same task
  2. Verify last-write-wins or conflict handled
  
**Code Location:** [lib/user-store.ts](lib/user-store.ts#L100)

#### Bug-003: Session Persistence Across Deployments
- **Symptom:** After deploy, user logged in before deploy is suddenly logged out
- **Root Cause Check:** `DASHBOARD_SESSION_SECRET` must be consistent across deploys
- **Test:**
  1. Login with production account
  2. Deploy new version to Cloudflare
  3. Verify session still valid
  
**Code Location:** [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L18)

### 9.2 Data Consistency Issues

#### Bug-004: Task Assignment State Mismatch
- **Symptom:** Task shows assigned to Riley in UI, but API returns "unassigned"
- **Root Cause Check:** Client-side state not synced with server
- **Test:**
  1. Assign task to Riley
  2. Refresh immediately
  3. Verify assignment persisted
  
**Validation:**
```
GET /api/tasks/[taskId]
{
  "id": "...",
  "assignedTo": "riley"  // ← Check this is saved
}
```

#### Bug-005: Task Status Transition Invalid State
- **Symptom:** Can transition from "Done" back to "In Progress" unexpectedly
- **Root Cause Check:** State machine validation missing
- **Test:**
  1. Complete task (Done)
  2. Try to move back to "In Progress"
  3. Should be rejected or warn user
  
**Code Location:** [app/api/tasks/[id]/route.ts](app/api/tasks/[id]/route.ts)

#### Bug-006: Notification Duplicate Delivery
- **Symptom:** User receives same reminder 3 times
- **Root Cause Check:** Idempotency key missing in reminder trigger
- **Test:**
  1. Create task due tomorrow
  2. Monitor `/api/users/alerts` at due time
  3. Should receive exactly ONE alert
  
**Logic Check:** Alerts stored with unique key `{userId}:{taskId}:{type}`?

### 9.3 Agent Communication Issues

#### Bug-007: Message Lost if Gateway Temporarily Down
- **Symptom:** Send chat message while gateway offline, message disappears
- **Root Cause Check:** No message queue/persistence in production
- **Test:**
  1. Stop gateway
  2. Send chat message
  3. Start gateway
  4. Message should still be processed OR user should see "failed to send" error
  
**Expected Behavior:** Either queue messages or show clear error

#### Bug-008: RunId Mismatch on Agent Reply
- **Symptom:** Chat reply arrives but runId doesn't match request
- **Root Cause Check:** WebSocket event handler correlates wrong reply to request
- **Test:**
  1. Send message 1 (get runId1)
  2. Send message 2 (get runId2)
  3. Verify reply for message 1 uses runId1 (not runId2)
  
**Code Location:** Browser WebSocket handler (client-side chat UI)

#### Bug-009: Agent Context Lost Between Requests
- **Symptom:** 
  - Message 1: "What's our Q1 revenue?" → "Q1 is $2M"
  - Message 2: "How much is that in pounds?" → Agent asks "What amount?"
- **Root Cause Check:** Session key not sent or backend doesn't maintain context
- **Test:**
  1. Send contextual question 1
  2. Send follow-up question 2
  3. Verify agent references answer from question 1
  
**Code Location:** [app/api/chat/route.ts](app/api/chat/route.ts#L44) — check if sessionKey is passed

### 9.4 Calendar/Appointment Issues

#### Bug-010: Timezone Not Applied to Recurring Meetings
- **Symptom:** Create meeting "10am every Monday" in Singapore, but US user sees it at wrong time
- **Root Cause Check:** Timezone conversion not applied to recurrence rule
- **Test:**
  1. Create recurring meeting: Monday 10am SGT, for 4 weeks
  2. User in NY (UTC-5 in March)
  3. For NY user, should show: Sunday 9pm (prev day)
  4. All 4 instances should reflect timezone
  
**Expected:** All recurring instances respect user timezone

#### Bug-011: Calendar Conflict Detection Ignores Timezones
- **Symptom:** Create meeting "1-2pm SGT", then "9-10am NY time" (which is actually 9:30pm SGT), system says no conflict
- **Root Cause Check:** Conflict check not normalizing timezones
- **Test:**
  1. User in Singapore
  2. Create 1-2pm SGT meeting
  3. Switch timezone to NY, try 9:30-10:30am NY (overlaps due to timezone math)
  4. Should warn or reject
  
**Expected:** Conflict detection timezone-aware

#### Bug-012: Meeting Reminder Not Canceled When Meeting Deleted
- **Symptom:** Delete meeting, but reminder still fires
- **Root Cause Check:** Reminder cleanup not hooked to meeting deletion
- **Test:**
  1. Create meeting tomorrow, 2pm (auto-reminder at 1:30pm)
  2. Delete meeting
  3. At 1:30pm, no reminder should fire
  
**Expected:** Associated reminders deleted with meeting

### 9.5 Performance/Scaling Issues

#### Bug-013: N+1 Query Problem (Agent Roster)
- **Symptom:** `/api/agents` takes 500ms because it fetches capability list for each agent separately
- **Root Cause Check:** Loop fetching data for each agent instead of batch fetch
- **Test:**
  1. Monitor DevTools Network tab
  2. Call GET /api/agents
  3. Should see 1-2 requests, not 6+ requests (one per agent)
  
**Expected:** Single API call returns all agents with capabilities

#### Bug-014: Unbounded Task List (Memory Leak)
- **Symptom:** After viewing 1000+ tasks, UI becomes sluggish
- **Root Cause Check:** Task list not paginated or virtualized
- **Test:**
  1. Create scenario with 1000 tasks
  2. Navigate to /tasks
  3. Measure memory usage in DevTools
  4. Should be < 50MB even with 1000 items (if virtualized)
  
**Expected:** Pagination or virtual scrolling implemented

#### Bug-015: Missing Indexes on KV Range Scans
- **Symptom:** Getting all user tasks takes 5+ seconds
- **Root Cause Check:** KV list operation without proper prefix pattern
- **Test:**
  1. GET /api/tasks with index scan
  2. Measure response time with 100+ tasks
  3. Should be < 500ms
  
**Code Location:** [lib/user-store.ts](lib/user-store.ts) — check KV key design

### 9.6 Authorization/Security Bugs

#### Bug-016: User Can Access Other User's Tasks
- **Symptom:** Login as andrew@upnx.asia, access `/api/tasks/user-xyz-task-id`, get 200 OK instead of 403
- **Root Cause Check:** Authorization check missing in route handler
- **Test:**
  1. As andrew, try GET /api/tasks/[someoneelses-task-id]
  2. Should return 404 or 403
  
**Expected:** Request rejected with auth error

#### Bug-017: Admin Bypass Via Direct API Call
- **Symptom:** Non-admin user calls POST /api/users/[id] to create admin account
- **Root Cause Check:** Auth middleware not validating role
- **Test:**
  1. As non-admin, call POST /api/users with role="admin"
  2. Should reject with 403
  
**Code Location:** Check each route for role checks

#### Bug-018: CORS Allows Suspicious Origins
- **Symptom:** Malicious site can make cross-origin fetch to /api/chat and exfiltrate data
- **Root Cause Check:** CORS headers allow wildcard or wrong origins
- **Test:**
  1. Open DevTools console
  2. Fetch from different origin
  3. Should be blocked by CORS
  
**Expected:** Only aioc.askjary.com allowed

---

## 10. Monitoring Dashboard During Tests

### 10.1 Cloudflare Worker Logs

**Monitor in Real-Time:**
```bash
export CLOUDFLARE_API_TOKEN="5qKHEJqQmud_3d0_POgz2rFloIAYYijtchxto6w2"
npx wrangler tail --format json 2>&1 | jq '.logs[]'
```

**Watch for:**
- 500 errors
- Slow requests (> 5s)
- Failed KV operations
- Missing environment variables

### 10.2 KV Namespace Monitoring

**Check user data:**
```bash
npx wrangler kv key get user:andrew@upnx.asia --namespace-id baa20bd090f44070ba79f34a1ebc780e --remote

# Output should show user JSON with fields:
# { id, email, name, passwordHash, role, createdAt, updatedAt }
```

**Sample Output:**
```json
{
  "id": "a4381187-f938-4696-a5ad-b3680d6f1629",
  "email": "andrew@upnx.asia",
  "name": "Andrew Cheung",
  "passwordHash": "pbkdf2:...",
  "role": "admin",
  "alertsEnabled": true,
  "createdAt": "2026-03-03T13:17:41.991Z",
  "updatedAt": "2026-03-03T13:17:41.991Z"
}
```

### 10.3 DevTools Performance Profiling

**For Each Test:**
1. Open Chrome DevTools
2. Performance tab → Record
3. Perform action (navigate, send chat, create task)
4. Stop recording
5. Analyze:
   - Task duration (bottom timeline)
   - Scripting time (should be < 50% of total)
   - Rendering time (should be < 16ms for 60fps)

**Success Criteria:**
- Green = < 100ms
- Yellow = 100-300ms
- Red = > 300ms

---

## 11. Test Execution Checklist (Production Account)

### Phase 1: Smoke Tests (1 hour)
- [ ] Login with andrew@upnx.asia succeeds
- [ ] Dashboard loads (< 2s)
- [ ] Sidebar navigation works
- [ ] Session persists on reload
- [ ] Logout clears session

### Phase 2: Agent Engagement (4 hours)
- [ ] Agent roster loads (6 agents)
- [ ] Send message to specific agent
- [ ] Agent reply arrives via WebSocket
- [ ] Chat message round-trip < 3s
- [ ] Context memory across messages
- [ ] Briefing generation triggers
- [ ] Briefing content quality check

### Phase 3: Task Management (3 hours)
- [ ] Create automated task via chat
- [ ] Task deduplication working
- [ ] Task status transitions valid
- [ ] Bulk task operations
- [ ] Task overdue alerts fire

### Phase 4: Calendar & Appointments (3 hours)
- [ ] View calendar for March 2026
- [ ] Create meeting from chat
- [ ] Conflict detection works
- [ ] Recurring meetings span correct dates
- [ ] Timezone conversion applied

### Phase 5: Reminders (2 hours)
- [ ] Task reminder fires at due time
- [ ] Meeting reminder fires 30min before
- [ ] Reminders can be snoozed
- [ ] Canceled meetings don't trigger reminders

### Phase 6: Responsiveness & Latency (4 hours)
- [ ] Dashboard load FCP < 800ms
- [ ] Dashboard load LCP < 1500ms
- [ ] Chat message send < 200ms
- [ ] Mobile Hamburger drawer smooth
- [ ] Mobile scroll 60fps
- [ ] API response times logged (table)

### Phase 7: Logic Bug Sweep (3 hours)
- [ ] Session doesn't expire unexpectedly
- [ ] Task assignment persisted
- [ ] Task status transitions validated
- [ ] Notification delivery deduped
- [ ] Agent runId matches reply
- [ ] Timezone applied to recurring meetings
- [ ] Authorization checks present on all admin routes

### Phase 8: Cross-Browser (2 hours)
- [ ] Chrome 130 ✅
- [ ] Firefox 131 ✅
- [ ] Safari 17 ✅

---

## 12. Pass/Fail Criteria

### PASS

✅ All login flows work with production account  
✅ No "timeout" or "abort" errors encountered  
✅ Dashboard < 2s load, chat < 3s round-trip  
✅ Agent messages with context flow  
✅ Tasks created, assigned, tracked  
✅ Calendar conflicts detected  
✅ Reminders fire at correct times  
✅ No authorization bypasses  
✅ Mobile & desktop responsive  
✅ No console errors or warnings  

### FAIL

❌ Login fails or requires unexpected auth  
❌ Timeout errors appear  
❌ Performance > 3s (dashboard) or > 5s (briefing)  
❌ Agent context lost between messages  
❌ Calendar conflicts allow double-booking  
❌ Reminders don't arrive or duplicate  
❌ User can access other user's data  
❌ CORS block legitimate requests  
❌ Mobile layout broken  

---

## 13. Test Results Template

**Date:** _______________  
**Tester:** _______________  
**Environment:** Production (https://aioc.askjary.com)  
**Account:** andrew@upnx.asia  

### Results Summary

| Test Category | Pass | Fail | Notes |
|---|---|---|---|
| Authentication | __ | __ | |
| Agent Engagement | __ | __ | |
| Task Management | __ | __ | |
| Calendar & Bookings | __ | __ | |
| Reminders | __ | __ | |
| Responsiveness | __ | __ | |
| Logic Bugs | __ | __ | |
| Security | __ | __ | |

### Performance Metrics

| Metric | Target | Actual | Status |
|---|---|---|---|
| Dashboard FCP | < 800ms | __ | ✅ / ❌ |
| Dashboard LCP | < 1500ms | __ | ✅ / ❌ |
| Chat Round-Trip | < 3s | __ | ✅ / ❌ |
| API /agents | < 500ms | __ | ✅ / ❌ |
| Mobile Load | < 2s | __ | ✅ / ❌ |

### Bugs Found

| Bug ID | Severity | Description | Reproduction | Status |
|---|---|---|---|---|
| BUG-001 | Critical | [Title] | Steps to reproduce | Open / Fixed |
| | | | | |

### Sign-Off

- [ ] All tests executed
- [ ] Results documented
- [ ] Critical bugs resolved
- [ ] Ready for production

**Tester Signature:** ________________  **Date:** ________

---

**End of Production Testing Plan**
