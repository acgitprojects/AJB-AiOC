# AiOC ↔ OpenClaw — Full Setup & UAT Guide

> **Who is this for:** You are setting this up for the first time. Every step tells you exactly what to click, what to type, and what to expect.
> **Architecture:** Browser → AiOC (Cloudflare) → API Server (Instance B) → OpenClaw (Instance A)
> **OpenClaw protocol:** v3
> **Last updated:** March 2026

---

## Table of Contents

1. [What you are setting up](#1-what-you-are-setting-up)
2. [What you need before you start](#2-what-you-need-before-you-start)
3. [Step 1 — Start the OpenClaw gateway on your server](#step-1--start-the-openclaw-gateway-on-your-server)
4. [Step 2 — Set up Cloudflare DNS for the gateway](#step-2--set-up-cloudflare-dns-for-the-gateway)
5. [Step 3 — Set environment variables in Cloudflare](#step-3--set-environment-variables-in-cloudflare)
6. [Step 4 — Deploy the dashboard to Cloudflare](#step-4--deploy-the-dashboard-to-cloudflare)
7. [Step 5 — Log in and verify the gateway connection](#step-5--log-in-and-verify-the-gateway-connection)
8. [Step 6 — Test the briefing trigger (first agent call)](#step-6--test-the-briefing-trigger-first-agent-call)
9. [Step 7 — Test live chat (WebSocket)](#step-7--test-live-chat-websocket)
10. [Step 8 — Enable live data (tasks, board, calendar, pipeline)](#step-8--enable-live-data-tasks-board-calendar-pipeline)
11. [Step 9 — Test Create Document and Create Image](#step-9--test-create-document-and-create-image)
12. [Step 10 — UAT sign-off checklist](#step-10--uat-sign-off-checklist)
13. [Reference: All environment variables](#reference-all-environment-variables)
14. [Reference: All agent IDs](#reference-all-agent-ids)
15. [Reference: All API routes](#reference-all-api-routes)
16. [Reference: Gateway endpoints the dashboard calls](#reference-gateway-endpoints-the-dashboard-calls)
17. [Troubleshooting](#troubleshooting)

---

## 1. What you are setting up

Think of this as three separate pieces of software that need to talk to each other:

```
Your browser
    │
    ▼
AiOC Dashboard (askjary.com)          ← This is the app you built
    │
    │  Two ways to talk:
    │  1. HTTP (one-way trigger)         → POST /hooks/agent, GET /healthz
    │  2. WebSocket (live two-way chat)  → wss://oc.askjary.com
    ▼
OpenClaw Gateway (your server)        ← The AI engine, runs on your VPS/server
    │
    ▼
Jary / Maya / ARIA / … (AI agents)   ← The actual AI workers
```

**The two tokens you will create:**

| Token | What it is for | Where it lives in openclaw.json |
|---|---|---|
| `OPENCLAW_HOOKS_TOKEN` | HTTP triggers (briefing, tasks, chat fallback) | `hooks.token` |
| `OPENCLAW_WS_TOKEN` | WebSocket live chat | `gateway.auth.token` |

⚠️ These **must be different strings**. Do not use the same value for both.

---

## 2. What you need before you start

Make sure you have all of these ready:

- [ ] A server (VPS, cloud VM) where OpenClaw is installed — you need SSH access to it
- [ ] The server's IP address or hostname
- [ ] A Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com)
- [ ] `askjary.com` already added to your Cloudflare account (it should appear in your Zones list)
- [ ] This codebase checked out locally (you already have this)
- [ ] Node.js 18+ installed locally — run `node -v` in a terminal to check

**Generate your two tokens now** (run these one at a time in any terminal):

```bash
# Token 1 — for HTTP hooks (copy this output)
node -e "console.log('hk_' + require('crypto').randomBytes(32).toString('hex'))"

# Token 2 — for WebSocket (copy this output)
node -e "console.log('gw_' + require('crypto').randomBytes(32).toString('hex'))"

# Session secret — for the login cookie (copy this output)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy all three outputs and save them somewhere safe (e.g. your password manager). You will need them in Steps 1 and 3.

---

## Step 1 — Start the OpenClaw gateway on your server

Do this on your **server via SSH**, not your local machine.

### 1a. SSH into your server

```bash
ssh user@your-server-ip
```

### 1b. Navigate to your OpenClaw folder

```bash
cd /path/to/openclaw
```

### 1c. Copy the config file template

```bash
cp openclaw.json.example openclaw.json
```

### 1d. Open the config file

```bash
nano openclaw.json
```

### 1e. Set the two tokens

Find the section that looks like this and replace the placeholder text with the tokens you generated in Step 0:

```json
{
  "gateway": {
    "port": 18789,
    "bind": "0.0.0.0",
    "auth": {
      "mode": "token",
      "token": "PASTE_YOUR_gw_TOKEN_HERE"
    }
  },
  "hooks": {
    "token": "PASTE_YOUR_hk_TOKEN_HERE",
    "allowRequestSessionKey": false
  }
}
```

- `gateway.auth.token` → paste the `gw_…` token
- `hooks.token` → paste the `hk_…` token

They must be **different values**.

Save the file: press `Ctrl+O`, press `Enter`, then press `Ctrl+X` to exit.

### 1f. Start the gateway

```bash
openclaw start
```

Or if you use pm2:

```bash
pm2 start openclaw --name openclaw
pm2 save
```

### 1g. Confirm the gateway is running

```bash
curl http://localhost:18789/healthz
```

Expected response:

```json
{"ok":true,"version":"2026.3.1"}
```

If you see `connection refused`, the gateway did not start. Check the logs: `openclaw logs` or `pm2 logs openclaw`.

---

## Step 2 — Set up Cloudflare DNS for the gateway

You need a subdomain (`oc.askjary.com`) pointing at your server so the dashboard can reach the gateway over the internet.

### 2a. Open Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) in your browser
2. You will see a list of your domains. Click on **askjary.com**
3. In the left sidebar, click **DNS**
4. Click **Records** (it may already be selected)

### 2b. Add an A record

1. Click the blue **Add record** button (top right of the records list)
2. Fill in the form:
   - **Type:** Select `A` from the dropdown
   - **Name:** Type `oc`
   - **IPv4 address:** Type your server's IP address
   - **Proxy status:** Click the orange cloud icon so it turns **grey** — it should say "DNS only". This is important — WebSocket traffic cannot go through the Cloudflare proxy.
   - **TTL:** Leave as Auto
3. Click the blue **Save** button

You should now see `oc.askjary.com → your.server.ip` in the records list.

### 2c. Open the firewall port on your server

Back on your server (via SSH), allow inbound traffic on port 18789:

```bash
# If your server uses ufw (Ubuntu default):
sudo ufw allow 18789/tcp
sudo ufw reload

# Or with iptables:
sudo iptables -A INPUT -p tcp --dport 18789 -j ACCEPT
```

### 2d. Test the gateway is reachable from the internet

Close your SSH session (or open a new terminal on your **local machine**) and run:

```bash
curl http://oc.askjary.com:18789/healthz
```

Expected: `{"ok":true}`. If this fails, double-check the DNS A record and the firewall step above.

> **Optional but recommended — add HTTPS:**
> If you want `https://oc.askjary.com` (required for production), install a certificate on your server:
> ```bash
> sudo apt install certbot
> sudo certbot certonly --standalone -d oc.askjary.com
> ```
> Then configure OpenClaw to use the certificate. Once HTTPS works, update the URLs to `https://` and `wss://` in the next step.

---

## Step 3 — Set environment variables in Cloudflare

These are secret values the dashboard reads at runtime. Do **not** put them in code.

### 3a. Navigate to your worker

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. In the left sidebar, click **Workers & Pages**
3. You should see a card named **aioc** (or whatever name is in `wrangler.toml`)
4. Click on it to open it
5. Click the **Settings** tab near the top of the page
6. Scroll down until you see the section **Environment Variables**

### 3b. Add each variable

For each row in the table below:
1. Click the **Add variable** button
2. In the **Variable name** box, type the name exactly as shown
3. In the **Value** box, paste the value
4. For secrets (tokens and the session secret), click the **Encrypt** button — this hides the value so it cannot be read back from the dashboard
5. Click **Save**

| Variable name | Value |
|---|---|
| `OPENCLAW_GATEWAY_URL` | `https://oc.askjary.com` (or `http://oc.askjary.com:18789` if no HTTPS yet) |
| `OPENCLAW_WS_URL` | `wss://oc.askjary.com` (or `ws://oc.askjary.com:18789` if no HTTPS yet) |
| `OPENCLAW_HOOKS_TOKEN` | your `hk_…` token from Step 0 — click **Encrypt** |
| `OPENCLAW_WS_TOKEN` | your `gw_…` token from Step 0 — click **Encrypt** |
| `DASHBOARD_PASSWORD` | a strong password you will type on the login page |
| `DASHBOARD_SESSION_SECRET` | the long random string from Step 0 — click **Encrypt** |
| `NEXT_PUBLIC_OPENCLAW_WS_URL` | same as `OPENCLAW_WS_URL` above |
| `NEXT_PUBLIC_OPENCLAW_WS_TOKEN` | same as `OPENCLAW_WS_TOKEN` above |

### 3c. Save all variables

After adding all 8 variables, click the **Save** button at the bottom of the Environment Variables section.

---

## Step 4 — Deploy the dashboard to Cloudflare

Do this on your **local machine** in the project folder.

### 4a. Open a terminal in the project folder

In VS Code: press `` Ctrl+` `` (backtick) to open the integrated terminal.

### 4b. Log in to Cloudflare

```bash
npx wrangler login
```

A browser window will open. Click the **Allow** button to authorise wrangler to access your Cloudflare account. Return to the terminal when done.

### 4c. Build the app

```bash
npm run build:cf
```

This compiles the app for Cloudflare Workers. Wait for it to finish — it usually takes 1–3 minutes. You will see output ending with something like:

```
✓ Built .open-next/
```

If it fails with errors, run `npm install` first and try again.

### 4d. Deploy to Cloudflare

```bash
npm run deploy:cf
```

Expected output ends with:

```
Deployed aioc to https://askjary.com
```

### 4e. Open the dashboard

Open your browser and go to `https://askjary.com`.

You should see the **login page** — a dark screen with a password input field and a Sign In button.

Common issues:
- **503 error saying "DASHBOARD_SESSION_SECRET is not set"** → go back to Step 3 and confirm the variable is saved
- **404 not found** → confirm the Cloudflare worker is assigned to the `askjary.com` route in your worker's Settings → Triggers tab

---

## Step 5 — Log in and verify the gateway connection

### 5a. Log in to the dashboard

1. Go to `https://askjary.com/login`
2. Click on the password field
3. Type the password you set as `DASHBOARD_PASSWORD` in Step 3
4. Click the **Sign In** button (or press Enter)

You should be redirected to the **Dashboard** page.

### 5b. Check the gateway connection indicator

Look at the **left sidebar**. At the bottom of the sidebar, you will see a small row that says "OpenClaw API" with a coloured dot next to it:

- 🔵 **Cyan/blue dot pulsing** = gateway is online and connected ✅
- ⚫ **Grey dot** = gateway is unreachable

If the dot is grey:
1. Open a terminal on your local machine and run:
   ```bash
   curl https://oc.askjary.com/healthz
   ```
2. If that fails → the gateway is not accessible from the internet (re-check Step 2: DNS record and firewall)
3. If that works → the `OPENCLAW_GATEWAY_URL` env var may be wrong. Go to Cloudflare → Workers → aioc → Settings → Environment Variables and check it. Then redeploy: `npm run deploy:cf`

### 5c. Check the Integrations page

1. In the sidebar, click **Integrations**
2. Find the **OpenClaw** tile in the list
3. It should show a green **Connected** badge

---

## Step 6 — Test the briefing trigger (first agent call)

This is the first test that actually sends a real task to an agent.

### 6a. Trigger a briefing

1. Click **Dashboard** in the sidebar
2. Find the **Morning Brief** panel near the top of the page
3. In the top-right corner of that panel, click the **Trigger Now** button
4. The button will show a spinning icon and say "Generating…" for about 1 second
5. It stops — this means the trigger was accepted by the gateway (HTTP 202)

### 6b. See the agent's reply

Jary processes the briefing request in the background. The reply arrives as a chat message:

1. Click **Agent** in the sidebar
2. The **Chat** tab should be selected by default
3. Wait 10–30 seconds
4. Jary's reply will appear as a message in the chat window — it will contain a briefing summary

If no message arrives after 60 seconds:
- Check the gateway is running: SSH to your server and run `curl http://localhost:18789/healthz`
- Check that `jary` is listed under `_agents` in your `openclaw.json`
- Check the gateway logs: `pm2 logs openclaw` or `openclaw logs`

### 6c. Make the briefing appear in the Dashboard panel (advanced)

Currently Jary's reply only shows in Chat. To make the Morning Brief panel on the Dashboard show live data, Jary needs to write its output to `GET /briefing` on the gateway. See [Step 8, item 2](#2-get-briefing--dashboard-morning-brief) for the required JSON format.

---

## Step 7 — Test live chat (WebSocket)

### 7a. Open the Chat tab

1. Click **Agent** in the sidebar
2. The **Chat** tab should be visible at the top of the content area

### 7b. Check the connection indicator

Look for a small status text near the top of the chat area:
- **Connected** = you are good ✅
- **Connecting…** = wait a few seconds, it should connect
- **Disconnected** = see troubleshooting steps below

### 7c. Send your first message

1. Click on the text input at the bottom of the chat panel
2. Type: `Hello, what can you help me with today?`
3. Press **Enter** or click the **Send** button (arrow icon on the right of the input)

Your message will appear as a bubble on the right side of the chat.

Within 5–30 seconds, Jary's reply will appear as a bubble on the left side.

### 7d. If the chat shows "Disconnected"

Work through this checklist:

1. **Check the token** — open browser DevTools (press `F12`), click the **Console** tab, look for errors about WebSocket or authentication. If you see "auth failed", `NEXT_PUBLIC_OPENCLAW_WS_TOKEN` does not match `gateway.auth.token` in `openclaw.json`.

2. **Check the URL** — `NEXT_PUBLIC_OPENCLAW_WS_URL` must start with `wss://` (not `https://`).

3. **Check CORS** — the gateway may be blocking connections from `askjary.com`. In `openclaw.json`, add this under the `gateway` section:
   ```json
   "allowOrigins": ["https://askjary.com"]
   ```
   Then SSH to your server and restart the gateway:
   ```bash
   pm2 restart openclaw
   ```

4. After any change to env vars, redeploy the dashboard:
   ```bash
   npm run deploy:cf
   ```

---

## Step 8 — Enable live data (tasks, board, calendar, pipeline)

Right now these pages show **placeholder mock data**. They will automatically switch to real data once the gateway serves the matching endpoints.

The dashboard already knows to call these endpoints — it just silently falls back to mock data if they do not exist yet. So there is no risk of breaking anything while you add them.

---

### 1. `GET /tasks` — My Tasks page

Add this endpoint to the gateway. It should return all tasks that agents have created.

**Exact format the dashboard expects:**

```json
[
  {
    "id": "task-001",
    "title": "Draft Q1 investor update",
    "description": "Write a 2-page summary for investors",
    "createdByAgent": "jary",
    "assignee": {
      "type": "agent",
      "id": "maya",
      "name": "Maya"
    },
    "priority": "high",
    "status": "in-progress",
    "createdAt": "2026-03-01T09:00:00Z",
    "dueDate": "2026-03-05",
    "tags": ["finance", "communications"]
  }
]
```

Valid values:
- `priority`: `"low"` | `"medium"` | `"high"` | `"urgent"`
- `status`: `"todo"` | `"in-progress"` | `"blocked"` | `"done"`
- `assignee.type`: `"agent"` | `"human"`

Also add `PATCH /tasks/:id` to accept:
```json
{ "status": "done" }
```

**Test it with curl** (from your local machine):
```bash
curl -H "Authorization: Bearer YOUR_hk_TOKEN" https://oc.askjary.com/tasks
```

**Verify in the dashboard:** Click **My Tasks** in the sidebar — the task list should show your real data instead of the demo tasks.

---

### 2. `GET /briefing` — Dashboard Morning Brief panel

Add this endpoint so Jary can store its briefing output and the Dashboard panel reads it.

**Exact format the dashboard expects:**

```json
{
  "generatedAt": "08:00",
  "date": "Mon, 03 Mar 2026",
  "sections": [
    {
      "id": "email",
      "title": "Email & Messages",
      "accent": "#00d4ff",
      "items": [
        "**3 unread emails** from client contacts",
        "Team standup reminder at 10:00"
      ]
    },
    {
      "id": "calendar",
      "title": "Calendar",
      "accent": "#8b5cf6",
      "items": ["10:00 Standup", "14:00 Client call"]
    },
    {
      "id": "tasks",
      "title": "Tasks",
      "accent": "#10d6a0",
      "items": ["5 open tasks", "2 due today"]
    },
    {
      "id": "news",
      "title": "News",
      "accent": "#f59e0b",
      "items": ["AI model updates from OpenAI", "Market up 1.2%"]
    },
    {
      "id": "financial",
      "title": "Financial",
      "accent": "#ec4899",
      "items": ["Cash runway: 8 months", "3 invoices pending"]
    }
  ]
}
```

Text in `items` supports `**bold**` markdown which renders in the UI.

**Test:**
```bash
curl https://oc.askjary.com/briefing
```

**Verify in the dashboard:** Refresh the Dashboard — the Morning Brief panel will show the real Jary-generated content.

---

### 3. `GET /board` — Board page

**Exact format:**

```json
{
  "todo": [
    {
      "id": "b-001",
      "title": "Write sales proposal for Acme",
      "agent": "alex",
      "priority": "high",
      "due": "2026-03-07",
      "tags": ["sales", "proposal"]
    }
  ],
  "in-progress": [],
  "review": [],
  "done": []
}
```

Also add `PATCH /board`:
```json
{ "taskId": "b-001", "from": "todo", "to": "in-progress" }
```

**Test:**
```bash
curl -H "Authorization: Bearer YOUR_hk_TOKEN" https://oc.askjary.com/board
```

**Verify:** Click **Board** in the sidebar.

---

### 4. `GET /pipeline` — Pipeline page

**Exact format:**

```json
{
  "ideas":     [{ "id": "p-001", "title": "LinkedIn post: AI in finance", "agent": "maya", "platform": "LinkedIn", "due": "2026-03-10" }],
  "writing":   [],
  "review":    [],
  "scheduled": [],
  "published": []
}
```

**Test:**
```bash
curl -H "Authorization: Bearer YOUR_hk_TOKEN" https://oc.askjary.com/pipeline
```

**Verify:** Click **Pipeline** in the sidebar.

---

### 5. `GET /calendar` — Calendar page

Keys are `YYYY-MM-DD` date strings. Only include dates that have events — empty dates do not need to be listed.

**Exact format:**

```json
{
  "2026-03-03": [
    { "time": "09:00", "title": "Standup with Jordan", "agent": "jordan", "color": "#00d4ff" },
    { "time": "14:00", "title": "Client call — Acme",  "agent": "alex",   "color": "#8b5cf6" }
  ],
  "2026-03-05": [
    { "time": "10:00", "title": "Q1 review", "agent": "jary", "color": "#10d6a0" }
  ]
}
```

**Test:**
```bash
curl -H "Authorization: Bearer YOUR_hk_TOKEN" https://oc.askjary.com/calendar
```

**Verify:** Click **Calendar** in the sidebar, then click today's date.

---

## Step 9 — Test Create Document and Create Image

### 9a. Create Document

1. Click **Agent** in the sidebar
2. Click the **Create Document** tab (it is next to the Chat tab)
3. Click the document type dropdown and choose a type, e.g. **Report**
4. Click on the text area and type a description:
   ```
   Q1 performance summary — revenue up 15%, 3 new clients, 2 product launches this quarter
   ```
5. Click the **Generate** button
6. You should immediately see a green message:
   > *Request sent to Maya. Switch to the Chat tab — Maya will reply with your Report shortly.*
7. Click the **Chat** tab
8. Wait 15–45 seconds — Maya will reply with the document content as a chat message

If you see a red error message instead:
- The gateway is not reachable — check `OPENCLAW_GATEWAY_URL`
- Or the hooks token is wrong — check `OPENCLAW_HOOKS_TOKEN`

### 9b. Create Image

1. Click the **Create Image** tab
2. Click the **style** dropdown and choose a style, e.g. "Photorealistic"
3. Click the **size** dropdown and choose a size, e.g. "Landscape 16:9"
4. Click on the prompt text area and type:
   ```
   Modern office boardroom with floor-to-ceiling windows, city skyline at sunset, clean minimal aesthetic
   ```
5. Click **Generate**
6. You should see: *Request sent to Maya. Switch to the Chat tab…*
7. Switch to **Chat** and wait for Maya's reply

> **Note:** For image generation to work, Maya must have an image generation tool configured in the gateway (e.g. DALL-E or Ideogram). If Maya replies with text instead of an image, configure the tool in her agent definition in `openclaw.json`.

---

## Step 10 — UAT sign-off checklist

Work through each item. Only tick it off once you have personally verified it.

### Login & Security
- [ ] Go to `https://askjary.com/login`, type the **wrong password** → page shows an error and does not let you in
- [ ] Type the **correct password** → you are redirected to the Dashboard
- [ ] Open an incognito/private browser window, go to `https://askjary.com/dashboard` → you are redirected to the login page (not the dashboard)
- [ ] Log out (clear the cookie or use a new incognito window), visit any other page → redirected to login

### Dashboard page
- [ ] Left sidebar shows a **cyan pulsing dot** next to "OpenClaw API"
- [ ] The 4 KPI cards (Tasks today, Active agents, Avg response, AJC subscribers) show numbers, not `…`
- [ ] Agent hex grid shows at least some agents with coloured dots (not all grey)
- [ ] Click **Trigger Now** in Morning Brief → button spins then stops (no red error)
- [ ] Performance chart shows a line graph (not a blank box)

### Agent page — Chat
- [ ] Chat tab shows **Connected** status
- [ ] Type a message and press Enter → your message appears immediately
- [ ] An agent reply arrives within 60 seconds
- [ ] Close the browser tab, open it again → chat reconnects automatically

### Agent page — Create Document
- [ ] Fill in the prompt, click Generate → green confirmation message appears
- [ ] Switch to Chat → a document reply appears within 60 seconds

### Agent page — Create Image
- [ ] Fill in the prompt, click Generate → green confirmation message appears
- [ ] Switch to Chat → an image or image-related reply appears within 60 seconds

### My Tasks page
- [ ] Page loads and shows a list of tasks
- [ ] Click **Kanban** view button → tasks appear as cards in columns
- [ ] Click **Calendar** view button → tasks appear on calendar dates
- [ ] Click the status toggle on a task → status changes immediately
- [ ] Refresh the page → the status change is still there (only after `PATCH /tasks/:id` is implemented on the gateway)

### Board page
- [ ] Page loads and shows the 4 columns (To Do / In Progress / Review / Done)
- [ ] Cards appear in at least one column
- [ ] Click **Move →** on a card → card moves to the next column

### Calendar page
- [ ] Page loads and shows the current month
- [ ] Click on today's date → any events for today appear below the calendar grid
- [ ] Click on a date with no events → no error, just an empty list

### Pipeline page
- [ ] Page loads and shows 5 stage columns: Ideas / Writing / Review / Scheduled / Published

### Briefing page
- [ ] Click **Briefing** in the sidebar → content cards appear
- [ ] Click the **Regenerate** button → spinner shows then stops

### Integrations page
- [ ] Click **Integrations** in the sidebar → OpenClaw tile shows **Connected** badge
- [ ] SSH to your server and stop the gateway (`pm2 stop openclaw`), refresh the page → tile shows **Disconnected**
- [ ] Restart the gateway (`pm2 start openclaw`), refresh again → back to **Connected**

---

## Reference: All environment variables

| Variable | Required | What it does |
|---|---|---|
| `OPENCLAW_GATEWAY_URL` | ✅ | HTTP URL of your OpenClaw server, e.g. `https://oc.askjary.com` |
| `OPENCLAW_WS_URL` | ✅ | WebSocket URL, e.g. `wss://oc.askjary.com` |
| `OPENCLAW_HOOKS_TOKEN` | ✅ | Must match `hooks.token` in openclaw.json |
| `OPENCLAW_WS_TOKEN` | ✅ | Must match `gateway.auth.token` in openclaw.json |
| `OPENCLAW_DEFAULT_AGENT_ID` | optional | Which agent receives unrouted messages (default: `jary`) |
| `OPENCLAW_SESSION_PREFIX` | optional | Session namespace prefix (default: `webchat`) |
| `DASHBOARD_PASSWORD` | ✅ | The password you type on the login page |
| `DASHBOARD_SESSION_SECRET` | ✅ | Must NOT be `"aioc"` — a long random string, signs the session cookie |
| `NEXT_PUBLIC_OPENCLAW_WS_URL` | ✅ | Same as `OPENCLAW_WS_URL` — exposed to the browser for live chat |
| `NEXT_PUBLIC_OPENCLAW_WS_TOKEN` | ✅ | Same as `OPENCLAW_WS_TOKEN` — exposed to the browser for live chat |

---

## Reference: All agent IDs

Use these exact strings in `agentId` fields when sending messages through the API.

| Agent ID | Name | Role | Model |
|---|---|---|---|
| `jary` | Jary | Executive Assistant — default router, briefings, delegation | GPT-4o |
| `aria` | ARIA | Strategic Intelligence — research, competitive analysis | Claude Sonnet |
| `alex` | Alex | Sales & BD — CRM, proposals, pipeline | GPT-4o |
| `maya` | Maya | Marketing & Content — writing, social, image generation | GPT-4o |
| `jordan` | Jordan | Operations & Projects — Notion, SOPs, tracking | GPT-4o |
| `morgan` | Morgan | Finance & Compliance — invoicing, cashflow, tax | o3-mini |
| `riley` | Riley | Customer Success — helpdesk, onboarding, renewals | GPT-4o |
| `casey` | Casey | Engineering & DevOps — infra, CI/CD, cloud | o3-mini |
| `drew` | Drew | Research & Data — data analysis, reports | Claude Sonnet |
| `sophia` | Sophia | HR & Culture — hiring, onboarding, engagement | GPT-4o |

---

## Reference: All API routes

These are the routes inside the AiOC dashboard app. The browser calls them; they call the OpenClaw gateway.

| Method | Route | What it does | Falls back to mock if gateway is down |
|---|---|---|---|
| `GET` | `/api/openclaw/status` | Gateway health check | Returns `{ok: false}` |
| `POST` | `/api/auth/login` | Dashboard login — sets session cookie | n/a |
| `GET` | `/api/briefing` | Fetch daily briefing | Mock briefing content |
| `POST` | `/api/briefing` | Tell Jary to generate a new briefing | Error response |
| `GET` | `/api/agents` | Agent roster + online/offline status | All agents shown as offline |
| `GET` | `/api/dashboard/stats` | The 4 KPI card numbers | Hardcoded estimates |
| `GET` | `/api/tasks` | All agent-created tasks | Mock task list |
| `PATCH` | `/api/tasks/[id]` | Update a task's status or assignee | Mock update |
| `GET` | `/api/board` | Kanban board columns and cards | Mock kanban data |
| `PATCH` | `/api/board` | Move a card between columns | No-op |
| `GET` | `/api/calendar` | Calendar events by date | Mock calendar |
| `GET` | `/api/pipeline` | Content pipeline stage lists | Mock pipeline |
| `POST` | `/api/chat` | Send a message to an agent (HTTP fallback) | Error response |

---

## Reference: Gateway endpoints the dashboard calls

The dashboard calls these endpoints on your OpenClaw gateway. Build the ones marked 🔴 to unlock live data.

| Method | Path | Status | What it unlocks |
|---|---|---|---|
| `GET` | `/healthz` | ✅ Already works | Sidebar dot, Integrations page |
| `POST` | `/hooks/agent` | ✅ Already works | Briefing trigger, Chat, Create Doc/Image |
| `POST` | `/hooks/wake` | ✅ Already works | Agent wake utility |
| `GET` | `/briefing` | 🔴 Build this | Dashboard Morning Brief panel |
| `GET` | `/tasks` | 🔴 Build this | My Tasks page |
| `PATCH` | `/tasks/:id` | 🔴 Build this | Task status changes persist |
| `GET` | `/board` | 🔴 Build this | Board page |
| `PATCH` | `/board` | 🔴 Build this | Board card moves persist |
| `GET` | `/calendar` | 🔴 Build this | Calendar page |
| `GET` | `/pipeline` | 🔴 Build this | Pipeline page |
| `GET` | `/agents` | 🟡 Optional | Per-agent task counts and response rates |
| `GET` | `/metrics` | 🟡 Optional | Live avg response time on Dashboard |

---

## Troubleshooting

| What you see | Most likely cause | Fix |
|---|---|---|
| Sidebar dot is grey after login | Gateway URL wrong or gateway not running | On your local machine run: `curl https://oc.askjary.com/healthz`. If it fails, SSH to your server and check `pm2 status openclaw`. |
| 503 error on every page | `DASHBOARD_SESSION_SECRET` is still the default `"aioc"` | Go to Cloudflare → Workers → aioc → Settings → Environment Variables, update `DASHBOARD_SESSION_SECRET` to the long random string, click Save, then redeploy. |
| Login keeps rejecting the password | `DASHBOARD_PASSWORD` env var is wrong or has extra spaces | Go to Cloudflare env vars, delete and re-add `DASHBOARD_PASSWORD` with no spaces around the value, redeploy. |
| Chat shows "Disconnected" | WS token mismatch or URL wrong | Confirm `NEXT_PUBLIC_OPENCLAW_WS_TOKEN` = `gateway.auth.token` in openclaw.json. Confirm the WS URL starts with `wss://` not `https://`. |
| Chat connects but Jary never replies | Agent not configured in gateway | Check that `"jary"` exists under `_agents` in `openclaw.json` and the gateway has been restarted after editing the config. |
| Pages show placeholder numbers / demo tasks | Gateway data endpoints not built yet | Follow Step 8 to implement `GET /tasks`, `/briefing`, `/board`, `/pipeline`, `/calendar`. |
| Briefing "Trigger Now" returns a red error | Wrong hooks token | `OPENCLAW_HOOKS_TOKEN` must match `hooks.token` in `openclaw.json` — NOT `gateway.auth.token`. |
| HTTP calls return 401 Unauthorized | Hooks token mismatch | Same as above row. |
| `npm run deploy:cf` fails with "Not authenticated" | Not logged in to wrangler | Run `npx wrangler login` first. |
| `npm run build:cf` fails with errors | Missing dependencies | Run `npm install`, then try `npm run build:cf` again. |
| Agent hex grid shows all offline after login | Gateway healthz is unreachable | Follow the first row of this table. |
| Task status change resets on refresh | Gateway `PATCH /tasks/:id` not built | Implement the endpoint (Step 8, item 1). |
| Create Document/Image shows red error | Gateway not reachable | Check `OPENCLAW_GATEWAY_URL` is set correctly in Cloudflare env vars. |
