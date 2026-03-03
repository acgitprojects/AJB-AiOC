# AiOC Testing & Bug Audit - Quick Reference

**Production Deployment Info:**
- **Live URL:** https://aioc.askjary.com
- **Production Account:** andrew@upnx.asia / Upnx@2019!
- **KV Namespace:** baa20bd090f44070ba79f34a1ebc780e
- **Worker:** ajb-ops-centre
- **Account ID:** a6dce41188371c9e1bbec2c280799325

---

## 📋 Three Key Documents Created

### 1. **TESTING_PLAN_PRODUCTION.md** (Production-Focused QA)
Advanced test scenarios for production account including:

**Agent Engagement (6 agents):**
- Human-to-agent chat with context memory
- Agent-generated briefings, data pulls from integrations
- RunId tracking for reply correlation

**Task & Appointment Management:**
- Smart task creation from chat
- Task state lifecycle validation
- Calendar conflict detection
- Recurring meeting timezone handling

**Reminders & Notifications:**
- Task due reminders (30min, 1hr, 1 day before)
- Overdue escalation
- Meeting reminders with advance notice
- Reminder snooze/mute functionality

**Responsiveness Metrics (Real Device Testing):**
```
FCP (First Contentful Paint):   < 800ms ✅
LCP (Largest Contentful Paint): < 1500ms ✅
Chat Round-Trip:                < 3s ✅
Mobile Scroll @ 60fps:          No jank ✅
```

**Latency Testing:**
- Network throttle testing (Slow 4G)
- WebSocket connection time
- 3G vs 4G vs WiFi comparison
- Real device measurements (iPhone 14, iPad)

**Logic Bug Hunting Section:**
- 18 specific bugs to test for
- Reproduction steps for each
- Expected vs actual behavior

**Test Execution Checklist:**
- 8 phases spanning 20 hours
- Performance profiling procedures
- Pass/Fail criteria
- Detailed bug report template

---

### 2. **LOGIC_BUGS_IDENTIFIED.md** (Critical Issues Found)

**3 CRITICAL Bugs Found:**

🔴 **BUG-CRIT-001: In-Memory Task Persistence Lost in Cloudflare Workers**
- Problem: MY_TASKS array resets on every request (stateless environment)
- Impact: Task updates appear to work but disappear on refresh
- Fix: Use KV namespace or require real gateway

🔴 **BUG-CRIT-002: No Authorization on `/api/tasks/[id]` Route**
- Problem: Anyone can PATCH tasks without authentication
- Impact: Unauthorized data modification, account takeover via escalation
- Fix: Add session verification + authorization checks

🔴 **BUG-CRIT-003: Session Secret Not Enforced (Defaults to "aioc")**
- Problem: If DASHBOARD_SESSION_SECRET not set, uses hardcoded fallback
- Impact: Session forging, token prediction attacks
- Fix: Require explicit secret in wrangler.toml, return 500 if missing

**5 HIGH Severity Bugs:**
- Demo mode hiding real gateway status
- No task state machine validation
- Missing idempotency keys on chat/tasks
- Agent context lost between messages
- No timezone conversion for calendar

**4 MEDIUM Severity Bugs:**
- KV index out of sync with user records
- Missing auth checks on user management
- Notification delivery spam
- No rate limiting on endpoints

---

### 3. **TESTING_PLAN_PRODUCTION.md** (This File)
Quick lookup table, latency targets, metrics formulas.

---

## 🚨 Pre-Testing Checklist

### MUST FIX BEFORE PRODUCTION TESTING:

- [ ] **CRIT-001:** Disable in-memory fallback OR use KV for tasks
- [ ] **CRIT-002:** Add `getSession()` verification to ALL routes, especially PATCH/POST/DELETE
- [ ] **CRIT-003:** Set strong `DASHBOARD_SESSION_SECRET` in wrangler.toml (e.g., `openssl rand -hex 32`)
- [ ] **HIGH-001:** Change `DEMO_MODE=false` in wrangler.toml for production
- [ ] **HIGH-002:** Add task state machine validation (New→Progress→Review→Done)
- [ ] **HIGH-003:** Implement idempotency keys on chat & task creation endpoints
- [ ] **HIGH-005:** Store calendar times in UTC, convert on display

### Nice-to-Have (Medium Priority):

- [ ] Add auth checks to `/api/users/*` routes
- [ ] Implement rate limiting (10 req/sec per user)
- [ ] Add notification deduplication ID
- [ ] Request logging for debugging

---

## 📊 Performance Targets

| Metric | Target | Measured |
|---|---|---|
| **Dashboard FCP** | < 800ms | __ |
| **Dashboard LCP** | < 1500ms | __ |
| **Chat Message POST** | < 200ms | __ |
| **Chat Round-Trip** | < 3s | __ |
| **GET /api/agents** | < 500ms | __ |
| **Mobile Page Load** | < 2s | __ |
| **Mobile Scroll** | 60 fps | __ |

**How to Measure:**
1. Chrome DevTools → Performance tab
2. Record action (navigate, send message, etc.)
3. Check FCP/LCP in timeline
4. Compare to target

---

## 🔍 Agent Engagement Test Flow

```
Login (andrew@upnx.asia)
  ↓
View Agent Roster (/api/agents)
  ├─ 6 agents should appear: Jary, Casey, Alex, Jordan, Riley, Morgan
  └─ Verify skills/capabilities
  ↓
Send Message to Specific Agent
  ├─ POST /api/chat { message: "...", agentId: "casey" }
  ├─ Response: 202 { ok: true, runId: "xyz" }
  ├─ Measure latency: < 200ms ✅
  └─ Latency: __ ms
  ↓
Wait for WebSocket Reply
  ├─ Listen on wss://gw.upnx.asia
  ├─ Frame arrives: { type: "chat.reply", body: { runId: "xyz", message: "..." } }
  ├─ Latency: 2-10s (real gateway) or < 1s (mock)
  └─ Latency: __ ms
  ↓
Test Context Memory
  ├─ Send: "What is Q1 revenue?"
  ├─ Reply: "$2M"
  ├─ Send: "In pounds?"
  └─ Verify reply references $2M (context maintained)
```

---

## 📅 Calendar/Appointment Test Flow

```
View Calendar (/calendar)
  ↓
Create Meeting from Chat
  ├─ Send: "Schedule meeting with Casey, March 10, 2-3pm"
  ├─ POST /api/calendar (if endpoint exists)
  ├─ Verify meeting appears in calendar
  └─ Latency: < 500ms ✅
  ↓
Test Conflict Detection
  ├─ Try to create overlapping: 2:30-3:30pm same day
  ├─ Should reject: "Conflicts with Casey meeting"
  └─ Status: 400 or 409 conflict
  ↓
Test Timezone Handling
  ├─ Create "10am Monday" (Singapore time, UTC+8)
  ├─ Switch user to NY (UTC-5)
  ├─ Should show: "Sunday 9pm" (previous day)
  └─ All instances respect TZ
  ↓
Test Recurring Meeting
  ├─ Create "Weekly standup, Mondays 10am, for 12 weeks"
  ├─ Verify 12 calendar events created
  └─ All should respect recurrence rule + timezone
```

---

## 🔔 Reminder & Notification Flow

```
Create Task Due Tomorrow @ 9am
  ↓
Check for Reminder
  ├─ 30min before (8:30am): First reminder
  ├─ At 9am: Due reminder
  └─ Later (9:15am): Overdue reminder
  ↓
Test Delivery Channels
  ├─ In-app: Badge on sidebar updates
  ├─ Email: notification@aioc.com (if configured)
  └─ Websocket: Real-time push (if connected)
  ↓
Test Snooze
  ├─ Reminder fires: Click "Snooze"
  ├─ Reschedule for 1 hour later
  └─ Verify same reminder fires again (not forgotten)
  ↓
Test Canceled Task
  ├─ Scheduled reminder fires
  ├─ Cancel task
  ├─ At reminder time: NO notification (cleaned up)
  └─ Verify: No orphaned reminders
```

---

## 🧬 Critical Code Locations to Verify

| File | Issue | Status |
|---|---|---|
| [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L32) | Session secret default | 🔴 Unfixed |
| [app/api/tasks/[id]/route.ts](app/api/tasks/[id]/route.ts#L5) | **No auth check** | 🔴 Unfixed |
| [app/api/tasks/[id]/route.ts](app/api/tasks/[id]/route.ts#L30) | In-memory mutations | 🔴 Unfixed |
| [lib/openclaw.ts](lib/openclaw.ts#L178) | Demo mode always online | 🟠 Design issue |
| [app/api/chat/route.ts](app/api/chat/route.ts) | No idempotency ID | 🟠 High priority |
| [lib/user-store.ts](lib/user-store.ts) | No transaction guard | 🟡 Medium priority |

---

## 📈 Latency Profiling (Slow 4G Throttle)

**Steps:**
1. DevTools → Network → Throttle: "Slow 4G"
2. Open each URL, measure:

```
GET https://aioc.askjary.com/login
  ├─ DNS: __ ms
  ├─ TCP: __ ms
  ├─ TLS: __ ms
  ├─ Request: __ ms
  ├─ Response (download): __ ms
  └─ Total Load: __ ms (target: < 2000ms)

GET https://aioc.askjary.com/dashboard (after login)
  ├─ HTML: __ ms
  ├─ CSS: __ ms
  ├─ JS: __ ms
  ├─ GET /api/agents: __ ms
  ├─ GET /api/dashboard/stats: __ ms
  ├─ GET /api/tasks: __ ms
  └─ Total FCP: __ ms (target: < 1500ms)

POST https://aioc.askjary.com/api/chat (send message)
  ├─ Request: __ ms
  ├─ Response: __ ms
  └─ Event arrival (WebSocket): __ ms
      └─ Target: < 3000ms total
```

**Record in TESTING_PLAN_PRODUCTION.md → Section 10.3**

---

## 🐛 Bug Verification Checklist

**For each bug in LOGIC_BUGS_IDENTIFIED.md, test:**

- [ ] Can reproduce the bug? (Steps provided)
- [ ] Severity matches assessment?
- [ ] Impact quantified (e.g., data loss, unauthorized access)?
- [ ] Fix suggested is implementable?
- [ ] No side effects to fix?

**Example - BUG-CRIT-001:**
```
✅ Reproduce: 
   1. Update task (PATCH /api/tasks/123)
   2. Refresh page immediately
   3. Task update LOST? ← Check ✅/❌

Impact: Data corruption for all task updates when gateway offline

Fix Verification:
   1. Implement KV persistence for tasks
   2. Retry test: Update + Refresh
   3. Task persists? ← Check ✅/❌
```

---

## 📞 Real Device Testing

### iPhone 14 Pro (Production Account)

```bash
1. Open Safari: https://aioc.askjary.com
2. Login: andrew@upnx.asia / Upnx@2019!
3. Measure:
   - Page load time (use Network timing in Xcode)
   - Memory usage (Xcode Instruments → Memory)
   - Touch responsiveness (taps, scrolls)
   - Battery drain (run for 5min, measure)

Targets:
   - Load: < 2s
   - Memory: < 100MB (idle), < 120MB (active use)
   - Touch: Immediate feedback (< 50ms)
   - Battery: No excessive drain
```

### iPad Air (Tablet Responsiveness)

```bash
1. Rotate: Portrait → Landscape
2. Verify:
   - Layout adapts (no horizontal scroll)
   - Content readable
   - Navigation accessible
   - No white space / gaps
```

---

## ✅ Final Sign-Off

**Before declaring production account safe to use:**

1. **All 3 critical bugs fixed** ✅
2. **All 5 high bugs addressed** ✅
3. **Performance targets met** ✅
4. **Responsiveness smooth on real devices** ✅
5. **Agent engagement flows working** ✅
6. **No authorization bypasses** ✅
7. **Data persists across refreshes** ✅
8. **Notifications deliver exactly once** ✅

---

**Document created:** March 3, 2026  
**Next steps:** Review LOGIC_BUGS_IDENTIFIED.md, apply fixes, then execute TESTING_PLAN_PRODUCTION.md
