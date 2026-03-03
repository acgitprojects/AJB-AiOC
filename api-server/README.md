# AiOC API Server

Standalone integration layer between AiOC (dashboard) and OpenClaw (AI gateway).

## Architecture

```
Browser
  │
  │  HTTPS + WSS
  ▼
AiOC Dashboard (askjary.com — Cloudflare Workers)
  │
  │  HTTPS  Authorization: Bearer <API_SERVER_SECRET>
  │  GET /api/board, /api/tasks, /api/briefing, …
  │  POST /api/chat
  │  WSS  /ws
  ▼
AiOC API Server  ← THIS SERVICE  (Instance B — new Tencent Cloud VM)
  │
  │  HTTP  Authorization: Bearer <OPENCLAW_HOOKS_TOKEN>
  │  WS    (internal network / private IP)
  ▼
OpenClaw Gateway  (Instance A — same Tencent Cloud VM as AiOC self-host)
  port 18789, bound to 0.0.0.0
  │
  ▼
AI Agents  (Jary, ARIA, Maya, Jordan, …)
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Server + gateway health (public, no auth) |
| `GET` | `/api/agents` | Agent roster with live status |
| `GET` | `/api/board` | Kanban board tasks |
| `PATCH` | `/api/board/:id` | Move task to new column |
| `GET` | `/api/tasks` | Task list |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/briefing` | Latest daily briefing |
| `POST` | `/api/briefing` | Trigger Jary to generate briefing |
| `GET` | `/api/calendar` | Calendar events |
| `GET` | `/api/pipeline` | Content pipeline |
| `POST` | `/api/chat` | Fire message to agent (returns 202, reply via WS) |
| `GET` | `/api/dashboard/stats` | KPI stats for dashboard |
| `WS` | `/ws?token=<secret>` | WebSocket proxy → OpenClaw |

All `/api/*` routes also available at root (`/board`, `/tasks`, etc.) for OpenClaw-compatible path access.

## Setup on Instance B (new Tencent Cloud VM)

### 1. Install Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Install PM2 globally

```bash
npm install -g pm2
```

### 3. Clone the repo and enter the api-server directory

```bash
git clone <repo-url> aioc
cd aioc/api-server
```

### 4. Install dependencies and build

```bash
npm install
npm run build
```

### 5. Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in:
- `API_SERVER_SECRET` — generate with `node -e "console.log('api_' + require('crypto').randomBytes(32).toString('hex'))"`
- `OPENCLAW_GATEWAY_URL` — Instance A's internal IP, e.g. `http://10.0.0.X:18789`
- `OPENCLAW_WS_URL` — e.g. `ws://10.0.0.X:18789`
- `OPENCLAW_HOOKS_TOKEN` — the `hooks.token` value from openclaw.json on Instance A
- `OPENCLAW_WS_TOKEN` — the `gateway.auth.token` value from openclaw.json on Instance A
- `CORS_ORIGINS` — e.g. `https://askjary.com`

### 6. Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

### 7. Set up Nginx (HTTPS reverse proxy)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy the nginx config
sudo cp nginx/aioc-api-server.conf /etc/nginx/sites-available/aioc-api-server
sudo ln -s /etc/nginx/sites-available/aioc-api-server /etc/nginx/sites-enabled/

# Get SSL certificate
sudo certbot --nginx -d api.askjary.com

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

### 8. Add DNS record

In Cloudflare DNS, add an **A record**:
- Name: `api`
- Value: Instance B's public IP
- Proxy status: **DNS only** (grey cloud) — required for WebSocket

### 9. Configure AiOC

In your AiOC deployment (Cloudflare Worker), set these secrets/vars:

```bash
# Via Wrangler CLI:
npx wrangler secret put API_SERVER_SECRET   # same value as .env on Instance B

# In wrangler.toml [vars]:
# API_SERVER_URL = "https://api.askjary.com"  ← already set
```

In `.env.production` (for build-time NEXT_PUBLIC vars):
```
NEXT_PUBLIC_OPENCLAW_WS_URL=wss://api.askjary.com/ws
NEXT_PUBLIC_OPENCLAW_WS_TOKEN=<API_SERVER_SECRET>
```

### 10. Verify

```bash
# Health check (public)
curl https://api.askjary.com/healthz

# Agents (authenticated)
curl -H "Authorization: Bearer <API_SERVER_SECRET>" https://api.askjary.com/api/agents
```

## OpenClaw gateway on Instance A (firewall)

The API server on Instance B needs to reach Instance A on port 18789.
Make sure the Tencent Cloud security group / firewall allows:

- **Instance A inbound:** TCP 18789 from Instance B's internal IP (or security group)
- **Instance B inbound:** TCP 443, TCP 80 from 0.0.0.0/0

Do **not** expose OpenClaw port 18789 publicly — it should only be reachable from Instance B.

## Development

```bash
npm run dev    # ts-node-dev with hot reload on port 4000
```
