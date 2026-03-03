# AiOC Production - Critical Logic Bugs & Issues Identified

**Date:** March 3, 2026  
**Scope:** Code audit for production account testing  
**Severity Distribution:** 3 Critical, 5 High, 4 Medium  

---

## CRITICAL BUGS (Must Fix Before Production Use)

### BUG-CRIT-001: In-Memory Task Mutations Don't Persist in Cloudflare Workers

**Location:** [app/api/tasks/[id]/route.ts](app/api/tasks/[id]/route.ts#L30-L36)

**Issue:**
```typescript
// Line 31-35: Modifying MY_TASKS directly
const idx = MY_TASKS.findIndex(t => t.id === id);
if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

const updated = { ...MY_TASKS[idx], ...body };
MY_TASKS[idx] = updated;  // ← LOST ON NEXT WORKER INVOCATION
return NextResponse.json(updated);
```

**Problem:**
- Cloudflare Workers are **stateless**, each request is a new instance
- In-memory array `MY_TASKS` is re-initialized from `lib/mock-data.ts` on every request
- Any mutations are **immediately lost**
- If real gateway is offline, task updates appear to work but are never persisted

**Example Failure Path:**
```
1. User updates task: PATCH /api/tasks/123 { status: "Done" }
2. Response: { ok: true, status: "Done" }
3. User refreshes page: GET /api/tasks
4. Old status is back (from re-imported MY_TASKS)
5. User sees data loss
```

**Impact:** HIGH - Data corruption, user trust loss

**Fix Options:**
1. **Stop using fallback for production**: Only serve mock data in demo mode, require real gateway
2. **Use KV for task persistence**: Store tasks in Cloudflare KV namespace (like user store)
3. **Prevent mutations on mock data**: Return error if gateway unavailable instead of silently updating

**Recommended Fix:**
```typescript
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Partial<Omit<MyTask, 'id'>>;

  // Only try real gateway, no fallback mutation
  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/tasks/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${OPENCLAW_CONFIG.hooksToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
    // If gateway returned error, propagate it
    return NextResponse.json(
      { error: "Gateway error", details: await res.text() },
      { status: res.status }
    );
  } catch (err) {
    // Gateway unreachable - don't pretend we can update
    return NextResponse.json(
      { error: "Gateway unreachable, cannot persist changes", details: String(err) },
      { status: 503 }
    );
  }
}
```

---

### BUG-CRIT-002: No Authorization Check on `/api/tasks/[id]` Route

**Location:** [app/api/tasks/[id]/route.ts](app/api/tasks/[id]/route.ts#L5-L36)

**Issue:**
```typescript
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  // ← NO USER IDENTIFICATION OR AUTHORIZATION CHECK
  
  // Proceeds to update task without verifying:
  // 1. User is authenticated
  // 2. User owns this task or has permission
  // 3. Route isn't exposed to anonymous users
}
```

**Problem:**
- No session validation before allowing task update
- Any unauthenticated user could theoretically call this endpoint
- No user context to check ownership

**Example Attack:**
```bash
# Without authentication, update anyone's task
curl -X PATCH https://aioc.askjary.com/api/tasks/any-task-id \
  -H "Content-Type: application/json" \
  -d '{"status":"Done", "assignedTo":"hacker@evil.com"}'
```

**Impact:** CRITICAL - Unauthorized data modification, privilege escalation

**Fix:**
```typescript
import { getSession } from "@/lib/auth-utils";  // Existing function?

export async function PATCH(req: NextRequest, { params }: Params) {
  // 1. Verify session
  const session = await getSession(req);  // Should extract from cookie
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Optional: Check if user owns task (if task isolation is needed)
  // const task = await getTaskById(id);
  // if (task.ownerId !== session.email && session.role !== "admin") {
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // }

  // ... rest of update logic
}
```

**Check Other Routes:**
- [ ] `/api/tasks` POST (create) — needs auth
- [ ] `/api/board` PATCH — needs auth
- [ ] `/api/calendar` POST (create) — needs auth
- [ ] `/api/chat` POST — needs auth (exists? check!)
- [ ] `/api/briefing` POST — needs auth
- [ ] `/api/users/[id]` DELETE — needs admin auth

---

### BUG-CRIT-003: Session Secret Not Enforced to Be Set

**Location:** [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L32)

**Issue:**
```typescript
const secret = process.env.DASHBOARD_SESSION_SECRET ?? "aioc";
//                                                    ↑
//                                        Fallback to hardcoded string!
```

**Problem:**
- If `DASHBOARD_SESSION_SECRET` not set in `wrangler.toml`, defaults to `"aioc"`
- Every deployment without explicit secret uses same weak fallback
- If attacker knows default, can forge any session token
- Secrets should **never** have defaults

**Session Signing:** Uses HMAC-SHA256 by default (in `lib/auth-utils.ts`)
```typescript
const sig = await hmacSign(data, secret);  // ← Weak secret = weak signatures
```

**Impact:** CRITICAL - Session forgery, account takeover

**Fix:**
```typescript
const secret = process.env.DASHBOARD_SESSION_SECRET;
if (!secret) {
  console.error("ERROR: DASHBOARD_SESSION_SECRET not set in wrangler.toml");
  return NextResponse.json(
    { error: "Server configuration error" },
    { status: 500 }
  );
}
```

**Action Required:**
1. Add to `wrangler.toml` → TODO: Actually generate and add strong secret
2. Verify in Cloudflare dashboard settings

---

## HIGH SEVERITY BUGS

### BUG-HIGH-001: getGatewayStatus() Always Returns { ok: true } in Demo Mode

**Location:** [lib/openclaw.ts](lib/openclaw.ts#L178-L186)

**Issue:**
```typescript
export async function getGatewayStatus(): Promise<GatewayStatusResponse> {
  // Demo mode — skip real network call and return a healthy mock response.
  if (DEMO_MODE) {
    return { ok: true, version: "demo", uptime: 0, channels: [] };
    //        ↑ Always true, never false
  }
  // ... real check
}
```

**Problem:**
- When user is production account but demo mode enabled accidentally, gateway status always shows "online"
- Could mask real infrastructure issues (gateway IS offline, user doesn't know)
- Makes monitoring/alerting impossible

**Why It Matters:**
- Real OpenClaw gateway crashes
- Production user sees "gateway online" (lies due to demo mode)
- User thinks system is working, but no messages actually being processed
- Agent engagement silently fails

**Impact:** HIGH - False sense of system health, difficult to debug

**Fix:**
- Demo mode should only be for demo accounts, NOT production account
- OR: Add explicit `GATEWAY_ONLINE` flag separate from `DEMO_MODE`
- Check: Only set `DEMO_MODE=true` in development, not production

**Verification in wrangler.toml:**
```toml
[vars]
DEMO_MODE = "false"  # ← Should be FALSE for production
```

---

### BUG-HIGH-002: Task Status State Machine Not Enforced

**Location:** [app/api/tasks/[id]/route.ts](app/api/tasks/[id]/route.ts#L13-L36)

**Issue:**
- No validation of allowed state transitions
- Can move from "Done" → "New" (should not be allowed)
- Can skip required intermediate states

**Example Problem:**
```
Allowed: New → In Progress → Done
Actual: New → Done (skipped In Progress)
Also: Done → In Progress (reverting completed task)
```

**Impact:** HIGH - Task workflow corruption, metrics inaccuracy

**Need to Add:**
```typescript
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  "new": ["in-progress"],
  "in-progress": ["review", "blocked", "done"],
  "review": ["in-progress", "done"],
  "blocked": ["in-progress"],
  "done": [], // Terminal state, can't transition out
};

if (body.status && current.status !== body.status) {
  if (!VALID_TRANSITIONS[current.status]?.includes(body.status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${current.status} to ${body.status}` },
      { status: 400 }
    );
  }
}
```

---

### BUG-HIGH-003: No Idempotency Key for Chat Message / Task Creation

**Location:** [app/api/chat/route.ts](app/api/chat/route.ts) & [app/api/tasks/route.ts](app/api/tasks/route.ts)

**Issue:**
- If user network flakes and retries request, duplicate message/task created
- No deduplication mechanism

**Example:**
```
1. User sends "Hi Casey" → network timeout
2. User retries → same request
3. Result: 2 identical messages sent to agent, 2 tasks created
```

**Impact:** HIGH - Duplicate data, duplicate agent triggers, spam

**Fix Pattern:**
```typescript
export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("X-Idempotency-Key") ?? crypto.randomUUID();
  
  // Check if already processed
  const cached = await kv.get(`idempotent:${idempotencyKey}`);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  // Process
  const result = await sendToAgent(message, opts);

  // Cache result for 5 minutes
  await kv.put(`idempotent:${idempotencyKey}`, JSON.stringify(result), {
    expirationTtl: 300,
  });

  return NextResponse.json(result);
}
```

---

### BUG-HIGH-004: WebSocket Context Not Maintained Across Chat Messages

**Location:** [lib/openclaw.ts](lib/openclaw.ts#L121-L148) & chat route

**Issue:**
From test case TC-CHAT-AGENT-004, context memory is questionable. Session keys might not be sent or tracked:

```typescript
export interface HookAgentPayload {
  message: string;
  name?: string;
  agentId?: string;
  // ... but NO sessionKey or conversationId
}
```

**Problem:**
- Agent doesn't know this is a follow-up to previous message
- Can't maintain conversation history
- Each message is isolated

**Example:**
```
Message 1: "What is Q1 revenue?"
  Agent response: "$2M"

Message 2: "How much is that in pounds?"
  Agent response: "What amount do you refer to?"
  ↑ Lost context from message 1
```

**Fix:**
Add conversation tracking:
```typescript
interface HookAgentPayload {
  message: string;
  sessionKey?: string;     // ← Ties to user session
  conversationId?: string; // ← Groups related messages
  // ...
}
```

---

### BUG-HIGH-005: No Timezone Conversion for Schedule/Calendar

**Location:** [app/api/calendar/route.ts](app/api/calendar/route.ts) (if exists)

**Issue:**
- Calendar stores times but doesn't track user timezone
- If user in Singapore creates "10am meeting", US user sees 10am (wrong!)

**Example:**
```
Andrew (Singapore, UTC+8) creates: "Monday 10am standup"
User in NY (UTC-5 in March) sees: "Monday 10am" 
  But should see: "Sunday 9pm" (previous day)
```

**Impact:** HIGH - Meetings at wrong times, missed meetings

**Fix:**
- Store user timezone in profile
- Store meeting in UTC internally
- Convert on display based on user timezone

---

## MEDIUM SEVERITY BUGS

### BUG-MED-001: KV Key Index Can Go Out of Sync

**Location:** [lib/user-store.ts](lib/user-store.ts#L150)

**Issue:**
- `users_index` key stores list of all user emails
- If user create fails partway through (e.g., hash timeout), email in index but user record missing
- Index and actual records now out of sync

**Example:**
```
1. Create user andrew@upnx.asia
2. Hash password (slow, takes 5s)
3. Request times out
4. Email added to index, but user record never saved
5. Next userCount() includes phantom user
6. Login tries to fetch phantom user, fails
```

**Fix:**
- Use transactional pattern (create user FIRST, then update index)
- OR: Rebuild index periodically
- OR: Move index into user record (index = all user keys with prefix batch)

---

### BUG-MED-002: Missing User Authorization Checks in `/api/users/*` Routes

**Location:** [app/api/users/route.ts](app/api/users/route.ts), [/api/users/[id]/route.ts](app/api/users/`[id]`/route.ts)

**Issue:**
- Likely missing role checks for admin-only operations
- Non-admin user shouldn't be able to list all users or modify other users

**Need to Verify:**
```typescript
export async function GET() {
  // ← Check: Is user authenticated?
  // ← Check: Is user role === "admin"?
  // If not, return 403
}

export async function DELETE(req: NextRequest, { params }: Params) {
  // ← Check: User can only delete own account (unless admin)
  // ← Check: Prevent deleting last admin
}
```

---

### BUG-MED-003: Notification Delivery Not Idempotent

**Location:** Alert/notification system (need to check if exists)

**Issue:**
- If notification system retries (e.g., network timeout), sends duplicate alerts
- User gets email 3x for same overdue task

**Symptom:**
```
From: aioc@askjary.com
Subject: Task Overdue: Follow up with BuildOS

[Task overdue by 1 day]
```
**Received 3 times** because retry logic sent 3 times

**Fix:**
- Notification ID should prevent re-delivery
- Store `{notificationId: "task-123-overdue-2026-03-03"}` in KV as "already sent"

---

### BUG-MED-004: Missing Rate Limiting on API Endpoints

**Location:** All `/api/*` routes

**Issue:**
- No rate limiting prevents brute force attacks
- User could spam `/api/chat` with 1000 messages in 1 second
- Would overload gateway or cause quota issues

**Example Attack:**
```bash
for i in {1..1000}; do
  curl -X POST https://aioc.askjary.com/api/chat \
    -d "{\"message\":\"SPAM $i\"}" &
done
wait
```

**Fix:**
- Implement per-user rate limiting (e.g., 10 req/sec)
- Use Cloudflare rate limiting rules
- Return 429 (Too Many Requests) when limit exceeded

---

## MEDIUM-TO-LOW: Design Issues

### BUG-MED-005: No Request/Response Logging for Debugging

**Location:** All API routes

**Issue:**
- If user reports "task didn't save", no logs to investigate
- No audit trail for authorization failures

**Recommended:**  
Add structured logging:
```typescript
console.log(JSON.stringify({
  method: "PATCH",
  endpoint: "/api/tasks/123",
  user: session.email,
  timestamp: new Date().toISOString(),
  status: 200,
  response_time_ms: 145,
}));
```

---

## Summary & Action Items

| Bug ID | Severity | Title | Status |
|---|---|---|---|
| BUG-CRIT-001 | 🔴 Critical | In-memory task mutations lost | UNFIXED |
| BUG-CRIT-002 | 🔴 Critical | No auth on `/api/tasks/[id]` | UNFIXED |
| BUG-CRIT-003 | 🔴 Critical | Session secret defaults insecure | UNFIXED |
| BUG-HIGH-001 | 🟠 High | Demo mode hides real issues | UNFIXED |
| BUG-HIGH-002 | 🟠 High | No task state validation | UNFIXED |
| BUG-HIGH-003 | 🟠 High | Chat message idempotency | UNFIXED |
| BUG-HIGH-004 | 🟠 High | Chat context lost between messages | UNFIXED |
| BUG-HIGH-005 | 🟠 High | No timezone conversion | UNFIXED |
| BUG-MED-001 | 🟡 Medium | KV index out of sync | UNFIXED |
| BUG-MED-002 | 🟡 Medium | Missing auth checks on `/api/users/*` | UNFIXED |
| BUG-MED-003 | 🟡 Medium | Notification spam (no idempotency) | UNFIXED |
| BUG-MED-004 | 🟡 Medium | No rate limiting | UNFIXED |

---

## Pre-Production Checklist

### Before allowing production account testing:

- [ ] **CRIT-001 Fixed:** Task mutations point to gateway or KV, not in-memory
- [ ] **CRIT-002 Fixed:** All routes verify session + authorization
- [ ] **CRIT-003 Fixed:** DASHBOARD_SESSION_SECRET set to strong random value in wrangler.toml
- [ ] **HIGH-001 Fixed:** DEMO_MODE=false in production deployment
- [ ] **HIGH-002 Fixed:** Task state machine validates transitions
- [ ] **HIGH-003 Fixed:** Chat messages use idempotency keys
- [ ] **HIGH-005 Fixed:** Calendar stores UTC, displays in user timezone

### Optional (but recommended):

- [ ] **MED-002 Fixed:** Auth checks on user management routes
- [ ] **MED-004 Implemented:** Rate limiting on API
- [ ] **MED-005 Implemented:** Request logging for debugging

---

**Status:** READY FOR QA — Use TESTING_PLAN_PRODUCTION.md to test with fixes applied.

